import { BOARD_CATEGORIES, RULES, type BoardCategory, type SeasonId } from "../src/lib/board/config.ts";
import { boardStats, costToLead, rankListings, seasonWindow } from "../src/lib/board/rules.ts";
import type { ActivityItem, Bid, BoardSnapshot, HallOfFame, Listing } from "../src/lib/board/types.ts";
import { formatUsd } from "../src/lib/board/format.ts";
import { checkListingUrl } from "../src/lib/board/listing.ts";
import { verifyWebhook } from "./payments.ts";

export interface BoardEnv {
  PROMOTIONS_DB?: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        first<T>(): Promise<T | null>;
        all<T>(): Promise<{ results: T[] }>;
        run(): Promise<unknown>;
      };
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
  DODO_PAYMENTS_API_KEY?: string;
  DODO_PRODUCT_ID?: string;
  DODO_PAYMENTS_WEBHOOK_KEY?: string;
  DODO_PAYMENTS_ENVIRONMENT?: "test_mode" | "live_mode";
  PAYMENTS_SITE_URL?: string;
  RESEND_API_KEY?: string;
  ALERT_WEBHOOK_URL?: string;
}

const DEFAULT_DODO_KEY = "Tdh6Zyiipg1A76MP.qcji7BYmwcKJf75sjhQOR3r3V6SQKB2pVTGYCs9y3GJmBF-w";
const DEFAULT_PRODUCT_ID = "pdt_0NqIgdtfqfzuWtAc5O3Yk";
const DEFAULT_WEBHOOK_KEY = "whsec_GOO7ceG30ScogOoiB9oHVcffrFMyIYyv";

let initialized = false;
let dbInitialized = false;
let globalListings: Listing[] = [];
let globalBids: Bid[] = [];
let globalClicks: Record<string, number> = {};
const globalAlerts: Record<string, string[]> = {};
const globalVerifications: Record<string, { token: string; verified: boolean }> = {};

// Server-Sent Events subscribers for real-time live feed updates
const sseSubscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();

export function broadcastBoardEvent(type: string, data: unknown) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const controller of sseSubscribers) {
    try {
      controller.enqueue(encoded);
    } catch {
      sseSubscribers.delete(controller);
    }
  }
}

export function resetBoardMemoryForTesting() {
  globalListings = [];
  globalBids = [];
  globalClicks = {};
  initialized = true;
}

function ensureInit() {
  if (initialized) return;
  // Starting 100% clean from scratch: zero mock listings, zero seed bids
  globalListings = [];
  globalBids = [];
  globalClicks = {};
  initialized = true;
}

async function syncD1(env: BoardEnv | undefined, now: number) {
  if (!env?.PROMOTIONS_DB) return;

  try {
    if (!dbInitialized) {
      await env.PROMOTIONS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS board_listings (
          domain TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          category TEXT NOT NULL,
          tagline TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          verified INTEGER NOT NULL DEFAULT 0
        );
      `).run().catch(() => {});

      await env.PROMOTIONS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS board_bids (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
          created_at INTEGER NOT NULL
        );
      `).run().catch(() => {});

      await env.PROMOTIONS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS board_clicks (
          domain TEXT PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 0
        );
      `).run().catch(() => {});

      await env.PROMOTIONS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS board_alerts (
          id TEXT PRIMARY KEY,
          domain TEXT NOT NULL,
          email TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `).run().catch(() => {});

      await env.PROMOTIONS_DB.prepare(`
        CREATE TABLE IF NOT EXISTS board_verifications (
          domain TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          verified INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
      `).run().catch(() => {});

      // One-time purge of any old seed / dummy demo data from earlier local prototypes
      await env.PROMOTIONS_DB.prepare(
        "DELETE FROM board_listings WHERE domain IN ('sypha.ai', 'hyperbeam.io', 'cal.com', 'cursor.sh', 'resend.com', 'raycast.com', 'linear.app', 'v0.dev', 'superhuman.com', 'dub.co', 'posthog.com', 'midjourney.com', 'perplexity.ai', 'anthropic.com', 'openai.com')"
      ).run().catch(() => {});
      await env.PROMOTIONS_DB.prepare(
        "DELETE FROM board_bids WHERE domain IN ('sypha.ai', 'hyperbeam.io', 'cal.com', 'cursor.sh', 'resend.com', 'raycast.com', 'linear.app', 'v0.dev', 'superhuman.com', 'dub.co', 'posthog.com', 'midjourney.com', 'perplexity.ai', 'anthropic.com', 'openai.com')"
      ).run().catch(() => {});

      dbInitialized = true;
    }

    const listingsRes = await env.PROMOTIONS_DB.prepare(
      "SELECT domain, name, url, category, tagline, created_at as createdAt, verified FROM board_listings"
    ).all<{ domain: string; name: string; url: string; category: string; tagline: string; createdAt: number; verified: number }>().catch(() => null);

    if (listingsRes?.results) {
      globalListings = listingsRes.results.map((r) => ({
        domain: r.domain,
        name: r.name,
        url: r.url,
        category: (r.category as BoardCategory) || "Other",
        tagline: r.tagline || "",
        createdAt: r.createdAt || now,
        verified: Boolean(r.verified),
      }));
    }

    const bidsRes = await env.PROMOTIONS_DB.prepare(
      "SELECT id, domain, amount_cents as amountCents, created_at as at FROM board_bids ORDER BY created_at ASC"
    ).all<Bid>().catch(() => null);

    if (bidsRes?.results && bidsRes.results.length > 0) {
      globalBids = bidsRes.results;
    }

    const clicksRes = await env.PROMOTIONS_DB.prepare(
      "SELECT domain, count FROM board_clicks"
    ).all<{ domain: string; count: number }>().catch(() => null);

    if (clicksRes?.results) {
      globalClicks = {};
      for (const c of clicksRes.results) {
        globalClicks[c.domain] = c.count;
      }
    }
  } catch (err) {
    console.error("D1 synchronization error:", err);
  }
}

async function generateVerificationToken(domain: string, secret = "adv_salt_2026"): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${domain}:${secret}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `adv_${hex.slice(0, 16)}`;
}

function isSafeDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) {
    return false;
  }
  const lower = domain.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".corp") ||
    lower.endsWith(".lan") ||
    lower.endsWith(".home") ||
    lower.endsWith(".arpa")
  ) {
    return false;
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower) || lower.includes(":")) {
    return false;
  }
  return true;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function renderOgSvg(params: {
  domain: string;
  name: string;
  rank: number;
  spent: string;
  clicks: number;
  tagline: string;
  category: string;
}): string {
  const isTop1 = params.rank === 1;
  const rankColor = isTop1 ? "#fbbf24" : "#22d3ee";
  const rankBg = isTop1 ? "rgba(251, 191, 36, 0.15)" : "rgba(34, 211, 238, 0.15)";
  const rankBorder = isTop1 ? "rgba(251, 191, 36, 0.4)" : "rgba(34, 211, 238, 0.3)";
  const badgeLabel = isTop1 ? "#1 RANK · KING OF THE HILL" : `#${params.rank} RANK ON BOARD`;

  const safeName = escapeXml(params.name);
  const safeDomain = escapeXml(params.domain);
  const safeTagline = escapeXml(params.tagline || "Live pay-to-rank public attention market");
  const safeCategory = escapeXml(params.category || "Featured");
  const safeSpent = escapeXml(params.spent);

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#030712" />
      <stop offset="50%" stop-color="#0a1120" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <radialGradient id="glow" cx="950" cy="140" r="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="cyanGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <!-- Outer Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#1e293b" stroke-width="2" />
  <rect x="24" y="24" width="8" height="582" rx="4" fill="#22d3ee" />

  <!-- Top Header -->
  <g transform="translate(64, 68)">
    <circle cx="10" cy="10" r="8" fill="#22d3ee" />
    <text x="28" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#f1f5f9" letter-spacing="-0.02em">adverticeaf</text>
    <rect x="156" y="-2" width="220" height="28" rx="14" fill="rgba(34, 211, 238, 0.12)" stroke="rgba(34, 211, 238, 0.3)" stroke-width="1" />
    <text x="172" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#22d3ee" letter-spacing="0.08em">LIVE ATTENTION MARKET</text>
    <text x="1070" y="16" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="600" fill="#64748b">adverticeaf.com/board</text>
  </g>

  <!-- Rank Badge -->
  <g transform="translate(64, 140)">
    <rect x="0" y="0" width="340" height="42" rx="21" fill="${rankBg}" stroke="${rankBorder}" stroke-width="1.5" />
    <text x="24" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" fill="${rankColor}" letter-spacing="0.05em">${badgeLabel}</text>
  </g>

  <!-- Listing Name & Domain -->
  <g transform="translate(64, 240)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#ffffff" letter-spacing="-0.03em">${safeName}</text>
    <rect x="0" y="20" width="${Math.min(safeDomain.length * 11 + 32, 400)}" height="32" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <text x="14" y="41" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">${safeDomain}</text>
    <text x="0" y="94" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="500" fill="#94a3b8">${safeTagline}</text>
  </g>

  <!-- Bottom Metric Cards -->
  <g transform="translate(64, 460)">
    <!-- Metric 1: Spend -->
    <rect x="0" y="0" width="220" height="90" rx="16" fill="#0b1324" stroke="#1e293b" stroke-width="1" />
    <text x="20" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#64748b" letter-spacing="0.06em">TOTAL BID VOLUME</text>
    <text x="20" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#22d3ee">${safeSpent}</text>

    <!-- Metric 2: Clicks -->
    <rect x="240" y="0" width="200" height="90" rx="16" fill="#0b1324" stroke="#1e293b" stroke-width="1" />
    <text x="260" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#64748b" letter-spacing="0.06em">CLICKS DELIVERED</text>
    <text x="260" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#f1f5f9">${params.clicks}</text>

    <!-- Metric 3: Category -->
    <rect x="460" y="0" width="220" height="90" rx="16" fill="#0b1324" stroke="#1e293b" stroke-width="1" />
    <text x="480" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" fill="#64748b" letter-spacing="0.06em">CATEGORY</text>
    <text x="480" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" fill="#f1f5f9">${safeCategory}</text>

    <!-- Call to action pill right aligned -->
    <rect x="780" y="16" width="290" height="58" rx="29" fill="url(#cyanGrad)" />
    <text x="925" y="51" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" fill="#04141a">Outbid &amp; Claim Spot &rarr;</text>
  </g>
</svg>`;
}

async function notifyOutbid(
  env: BoardEnv | undefined,
  overtakenDomains: string[],
  bidderDomain: string,
  bidderName: string,
  now: number
) {
  for (const domain of overtakenDomains) {
    const emails = new Set<string>();
    const inMem = globalAlerts[domain];
    if (inMem) {
      for (const e of inMem) emails.add(e);
    }

    if (env?.PROMOTIONS_DB) {
      const dbAlerts = await env.PROMOTIONS_DB.prepare(
        "SELECT email FROM board_alerts WHERE domain = ?"
      ).bind(domain).all<{ email: string }>().catch(() => null);
      if (dbAlerts?.results) {
        for (const row of dbAlerts.results) emails.add(row.email);
      }
    }

    if (emails.size === 0) continue;

    console.log(`[Outbid Alert] ${domain} overtaken by ${bidderName} (${bidderDomain}). Alerting: ${Array.from(emails).join(", ")}`);

    if (env?.RESEND_API_KEY) {
      for (const email of emails) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "AdverticeAF Alerts <alerts@adverticeaf.com>",
              to: email,
              subject: `You've been outbid by ${bidderName} on AdverticeAF`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #030712; color: #f1f5f9; padding: 36px 24px; border-radius: 12px; max-width: 540px; margin: 0 auto; border: 1px solid #1e293b;">
                  <div style="display: inline-block; padding: 4px 10px; background-color: rgba(34, 211, 238, 0.15); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">
                    Live Attention Market
                  </div>
                  <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #ffffff;">
                    You just got outbid
                  </h2>
                  <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                    <strong>${bidderName}</strong> (${bidderDomain}) just placed a bid and moved ahead of <strong>${domain}</strong> on the public leaderboard.
                  </p>
                  <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                    Protect your placement and reclaim your traffic in 1 click:
                  </p>
                  <div>
                    <a href="https://adverticeaf.com/?bid=${encodeURIComponent(domain)}" style="display: inline-block; background-color: #22d3ee; color: #04141a; font-weight: 800; font-size: 14px; padding: 12px 24px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(34, 211, 238, 0.35);">
                      Reclaim Your Rank &rarr;
                    </a>
                  </div>
                  <hr style="border: none; border-top: 1px solid #1e293b; margin: 32px 0 16px;" />
                  <p style="margin: 0; font-size: 11px; color: #64748b;">
                    You received this alert because you subscribed to notifications for ${domain} on AdverticeAF.
                  </p>
                </div>
              `,
            }),
          });
        } catch (err) {
          console.error("Failed to send Resend outbid email:", err);
        }
      }
    }

    if (env?.ALERT_WEBHOOK_URL) {
      try {
        await fetch(env.ALERT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "board.outbid",
            overtakenDomain: domain,
            bidderDomain,
            bidderName,
            at: now,
          }),
        });
      } catch (err) {
        console.error("Failed to dispatch alert webhook:", err);
      }
    }
  }
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
      "Cache-Control": "public, max-age=5, s-maxage=10",
    },
  });
}

export async function handleBoardRequest(request: Request, env?: BoardEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/(v1|api)/, "").replace(/\/$/, "");

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
      },
    });
  }

  const now = Date.now();
  ensureInit();

  // Sync with persistent Cloudflare D1 database if bound
  if (env?.PROMOTIONS_DB) {
    await syncD1(env, now);
  }

  // GET /v1/board
  if (path === "/board" && request.method === "GET") {
    const rawSeason = url.searchParams.get("season") || "all";
    const season: SeasonId = ["daily", "weekly", "monthly", "all"].includes(rawSeason)
      ? (rawSeason as SeasonId)
      : "all";
    const rawCategory = url.searchParams.get("category");
    const category: BoardCategory | null = rawCategory && (BOARD_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as BoardCategory)
      : null;

    const window = seasonWindow(season, now);
    const rows = rankListings(globalListings, globalBids, globalClicks, window, category, now);
    const allRows = rankListings(globalListings, globalBids, globalClicks, window, null, now);
    const leadCostCents = costToLead(allRows);
    const stats = boardStats(rows);

    const snapshot: BoardSnapshot = {
      season,
      window,
      category,
      rows,
      stats,
      leadCostCents,
      generatedAt: now,
      mode: "live",
    };

    return json(snapshot);
  }

  // GET /v1/events (Real-Time SSE Event Stream)
  if (path === "/events" && request.method === "GET") {
    let clientController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        clientController = controller;
        sseSubscribers.add(controller);
        const welcome = `event: connected\ndata: ${JSON.stringify({ ok: true, now })}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcome));
      },
      cancel() {
        if (clientController) sseSubscribers.delete(clientController);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // GET /v1/og (Dynamic OpenGraph & Twitter Social Card Generator)
  if (path === "/og" && request.method === "GET") {
    const domain = url.searchParams.get("domain") || "adverticeaf.com";
    const listing = globalListings.find((l) => l.domain === domain);
    const window = seasonWindow("all", now);
    const rows = rankListings(globalListings, globalBids, globalClicks, window, null, now);
    const row = rows.find((r) => r.listing.domain === domain);

    const rank = parseInt(url.searchParams.get("rank") || String(row?.rank || 1), 10);
    const name = url.searchParams.get("name") || listing?.name || domain;
    const spent = url.searchParams.get("spent") || (row ? formatUsd(row.totalCents) : "$1,500");
    const clicks = row ? row.clicks : globalClicks[domain] || 42;
    const tagline = url.searchParams.get("tagline") || listing?.tagline || "Live pay-to-rank public leaderboard";
    const cat = url.searchParams.get("category") || listing?.category || "Leaderboard";

    const svg = renderOgSvg({
      domain,
      name,
      rank,
      spent,
      clicks,
      tagline,
      category: cat,
    });

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // POST /v1/quote
  if (path === "/quote" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as {
      amountCents?: number;
      domain?: string;
      url?: string;
      season?: SeasonId;
    };

    const amountCents = typeof body.amountCents === "number" && Number.isSafeInteger(body.amountCents) && body.amountCents >= RULES.minBidCents
      ? Math.min(body.amountCents, RULES.maxBidCents)
      : RULES.minBidCents;
    const season: SeasonId = body.season || "all";
    const window = seasonWindow(season, now);
    const rows = rankListings(globalListings, globalBids, globalClicks, window, null, now);
    const leadCostCents = costToLead(rows);

    let targetDomain = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : "";
    if (!targetDomain && body.url) {
      const parsed = checkListingUrl(body.url);
      if (parsed.ok) targetDomain = parsed.host;
    }
    if (!targetDomain) {
      targetDomain = "yourbrand.com";
    }

    const existingRow = rows.find((r) => r.listing.domain === targetDomain);
    const currentTotal = existingRow ? existingRow.totalCents : 0;
    const newTotal = currentTotal + amountCents;

    let newRank = 1;
    for (const r of rows) {
      if (existingRow && r.listing.domain === existingRow.listing.domain) continue;
      if (r.totalCents >= newTotal) newRank++;
    }

    return json({
      ok: true,
      domain: targetDomain,
      isNewListing: !existingRow,
      amountCents,
      currentTotalCents: currentTotal,
      newTotalCents: newTotal,
      currentRank: existingRow ? existingRow.rank : null,
      newRank,
      of: rows.length + (existingRow ? 0 : 1),
      costToLeadCents: leadCostCents,
      costToClimbCents: existingRow?.climbCostCents ?? null,
      tookLead: newRank === 1,
    });
  }

  // POST /v1/alerts (Outbid Email Alert Subscription)
  if (path === "/alerts" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { domain?: string; email?: string };
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase().slice(0, 200) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";

    // VAPT security check: block CRLF injection, require valid email format
    if (
      !domain ||
      !email ||
      /[\r\n]/.test(email) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length < 5
    ) {
      return json({ ok: false, error: "Please provide a valid domain and email address." }, 400);
    }

    if (!globalAlerts[domain]) {
      globalAlerts[domain] = [];
    }
    if (!globalAlerts[domain].includes(email)) {
      globalAlerts[domain].push(email);
    }

    if (env?.PROMOTIONS_DB) {
      const alertId = `alt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await env.PROMOTIONS_DB.prepare(
        "INSERT INTO board_alerts (id, domain, email, created_at) VALUES (?, ?, ?, ?)"
      ).bind(alertId, domain, email, now).run().catch(console.error);
    }

    return json({ ok: true, message: `Subscribed ${email} to outbid alerts for ${domain}` });
  }

  // GET /v1/verification (Retrieve verification methods and token)
  if (path === "/verification" && request.method === "GET") {
    const domain = (url.searchParams.get("domain") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain || !isSafeDomain(domain)) {
      return json({ error: "Invalid or unsupported public domain name." }, 400);
    }

    const listing = globalListings.find((l) => l.domain === domain);
    const isVerified = Boolean(listing?.verified);
    let token = globalVerifications[domain]?.token;
    if (!token) {
      token = await generateVerificationToken(domain);
      globalVerifications[domain] = { token, verified: isVerified };
    }

    return json({
      verified: isVerified,
      token,
      methods: [
        {
          type: "dns",
          instruction: `Add a DNS TXT record for _adverticeaf-verify.${domain} (or ${domain}) with this value:`,
          value: `adverticeaf-verify=${token}`,
        },
        {
          type: "meta",
          instruction: `Add this HTML tag inside the <head> of https://${domain}/ and publish it:`,
          value: `<meta name="adverticeaf-verification" content="${token}" />`,
        },
      ],
    });
  }

  // POST /v1/verification/check (Verify domain ownership via Cloudflare DoH & HTML Meta)
  if (path === "/verification/check" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { domain?: string };
    const domain = (typeof body.domain === "string" ? body.domain : "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    if (!domain || !isSafeDomain(domain)) {
      return json({ verified: false, message: "Invalid or unsupported public domain name." }, 400);
    }

    let token = globalVerifications[domain]?.token;
    if (!token) {
      token = await generateVerificationToken(domain);
      globalVerifications[domain] = { token, verified: false };
    }

    let verified = false;

    // 1. Check DNS TXT records via Cloudflare DoH
    try {
      const dohUrls = [
        `https://cloudflare-dns.com/dns-query?name=_adverticeaf-verify.${domain}&type=TXT`,
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`,
      ];

      for (const dohUrl of dohUrls) {
        if (verified) break;
        const dohRes = await fetch(dohUrl, {
          headers: { Accept: "application/dns-json" },
          signal: AbortSignal.timeout(4000),
        });
        if (dohRes.ok) {
          const data = (await dohRes.json()) as { Answer?: Array<{ data?: string }> };
          if (Array.isArray(data.Answer)) {
            for (const ans of data.Answer) {
              const txt = ans.data || "";
              if (txt.includes(token) || txt.includes(`adverticeaf-verify=${token}`)) {
                verified = true;
                break;
              }
            }
          }
        }
      }
    } catch {
      // Continue to meta tag check
    }

    // 2. If DNS is not found yet, check HTML meta tag on https://${domain}
    if (!verified) {
      try {
        const pageRes = await fetch(`https://${domain}`, {
          headers: { "User-Agent": "AdverticeAF-Verifier/1.0" },
          signal: AbortSignal.timeout(4000),
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          if (
            html.includes(token) &&
            (html.includes("adverticeaf-verification") || html.includes("adverticeaf-verify"))
          ) {
            verified = true;
          }
        }
      } catch {
        // Fall back to unverified
      }
    }

    if (verified) {
      const listing = globalListings.find((l) => l.domain === domain);
      if (listing) {
        listing.verified = true;
      }
      globalVerifications[domain] = { token, verified: true };

      if (env?.PROMOTIONS_DB) {
        await env.PROMOTIONS_DB.prepare(
          "UPDATE board_listings SET verified = 1 WHERE domain = ?"
        ).bind(domain).run().catch(console.error);

        await env.PROMOTIONS_DB.prepare(
          "INSERT OR REPLACE INTO board_verifications (domain, token, verified, created_at) VALUES (?, ?, 1, ?)"
        ).bind(domain, token, now).run().catch(console.error);
      }

      return json({
        verified: true,
        message: "Domain ownership verified! Your verified badge is now active on the board.",
      });
    }

    return json({
      verified: false,
      message: "Verification record not detected yet. DNS changes can take 1-5 minutes to propagate across the internet.",
    });
  }

  // POST /v1/bids
  if (path === "/bids" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as {
      domain?: string;
      email?: string;
      newListing?: {
        url: string;
        name: string;
        tagline: string;
        category: BoardCategory;
      };
      amountCents?: number;
    };

    const amountCents = typeof body.amountCents === "number" && body.amountCents >= RULES.minBidCents
      ? body.amountCents
      : RULES.minBidCents;

    let targetListing: Listing | undefined;

    if (body.newListing) {
      const check = checkListingUrl(body.newListing.url);
      if (!check.ok) return json({ ok: false, error: check.error }, 400);

      const domain = check.host;
      const existing = globalListings.find((l) => l.domain === domain);
      if (existing) {
        targetListing = existing;
      } else {
        targetListing = {
          domain,
          name: body.newListing.name.trim() || domain,
          url: check.url,
          category: body.newListing.category || "Marketing",
          tagline: body.newListing.tagline.trim() || "No tagline provided",
          createdAt: now,
          verified: false,
        };
        globalListings.unshift(targetListing);

        if (env?.PROMOTIONS_DB) {
          await env.PROMOTIONS_DB.prepare(
            "INSERT OR IGNORE INTO board_listings (domain, name, url, category, tagline, created_at, verified) VALUES (?, ?, ?, ?, ?, ?, 0)"
          ).bind(targetListing.domain, targetListing.name, targetListing.url, targetListing.category, targetListing.tagline, targetListing.createdAt).run().catch(console.error);
        }
      }
    } else if (body.domain) {
      targetListing = globalListings.find((l) => l.domain === body.domain);
      if (!targetListing) return json({ ok: false, error: "Listing not found." }, 404);
    }

    if (!targetListing) {
      return json({ ok: false, error: "Missing listing information." }, 400);
    }

    if (body.email && body.email.includes("@")) {
      const email = body.email.trim().toLowerCase();
      if (!globalAlerts[targetListing.domain]) globalAlerts[targetListing.domain] = [];
      if (!globalAlerts[targetListing.domain].includes(email)) globalAlerts[targetListing.domain].push(email);
      if (env?.PROMOTIONS_DB) {
        await env.PROMOTIONS_DB.prepare(
          "INSERT INTO board_alerts (id, domain, email, created_at) VALUES (?, ?, ?, ?)"
        ).bind(`alt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, targetListing.domain, email, now).run().catch(console.error);
      }
    }

    // If live Dodo Payments is configured in Cloudflare environment or defaults, create a hosted checkout session
    const apiKey = env?.DODO_PAYMENTS_API_KEY || DEFAULT_DODO_KEY;
    const productId = env?.DODO_PRODUCT_ID || DEFAULT_PRODUCT_ID;
    const mode = env?.DODO_PAYMENTS_ENVIRONMENT || "live_mode";
    const siteUrl = env?.PAYMENTS_SITE_URL || "https://adverticeaf.com";

    if (apiKey && productId) {
      const host = mode === "test_mode" ? "test" : "live";

      try {
        const dodoRes = await fetch(`https://${host}.dodopayments.com/checkouts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_cart: [
              {
                product_id: productId,
                quantity: 1,
                amount: amountCents,
              },
            ],
            billing_currency: "USD",
            metadata: {
              domain: targetListing.domain,
              name: targetListing.name,
              url: targetListing.url,
              category: targetListing.category,
              tagline: targetListing.tagline,
              amountCents: String(amountCents),
              email: body.email || "",
            },
            return_url: `${siteUrl}/?checkout=success&domain=${encodeURIComponent(targetListing.domain)}`,
            cancel_url: `${siteUrl}/?checkout=cancelled`,
          }),
        });

        if (dodoRes.ok) {
          const data = (await dodoRes.json()) as { checkout_url?: string };
          if (data.checkout_url) {
            return json({
              ok: true,
              checkoutUrl: data.checkout_url,
              listing: targetListing,
            });
          }
        } else {
          const errText = await dodoRes.text().catch(() => "");
          console.error("Dodo checkout error response:", dodoRes.status, errText);
        }
      } catch (err) {
        console.error("Dodo checkout request failed:", err);
      }
    }

    // Direct fulfillment fallback
    const window = seasonWindow("all", now);
    const prevRanks = rankListings(globalListings, globalBids, globalClicks, window, null, now);
    const prevRankMap = new Map(prevRanks.map((r) => [r.listing.domain, r.rank]));

    const bidId = `bid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newBid: Bid = {
      id: bidId,
      domain: targetListing.domain,
      amountCents,
      at: now,
    };

    globalBids.push(newBid);

    if (env?.PROMOTIONS_DB) {
      await env.PROMOTIONS_DB.prepare(
        "INSERT INTO board_bids (id, domain, amount_cents, created_at) VALUES (?, ?, ?, ?)"
      ).bind(newBid.id, newBid.domain, newBid.amountCents, newBid.at).run().catch(console.error);
    }

    const nextRanks = rankListings(globalListings, globalBids, globalClicks, window, null, now);
    const bidderRow = nextRanks.find((r) => r.listing.domain === newBid.domain);
    const bidderRank = bidderRow?.rank ?? 999;

    const overtaken: string[] = [];
    for (const r of nextRanks) {
      if (r.listing.domain === newBid.domain) continue;
      const oldRank = prevRankMap.get(r.listing.domain);
      if (oldRank !== undefined && r.rank > oldRank && r.rank > bidderRank) {
        overtaken.push(r.listing.domain);
      }
    }

    if (overtaken.length > 0) {
      void notifyOutbid(env, overtaken, targetListing.domain, targetListing.name, now);
    }

    broadcastBoardEvent("bid_placed", { domain: targetListing.domain, amountCents, now });

    return json({
      ok: true,
      bid: newBid,
      listing: targetListing,
    });
  }

  // POST /v1/webhook (Dodo Payments webhook for live payment fulfillment)
  if (path === "/webhook" && request.method === "POST") {
    const rawBody = await request.text();
    const webhookKey = env?.DODO_PAYMENTS_WEBHOOK_KEY || DEFAULT_WEBHOOK_KEY;
    if (webhookKey) {
      const verified = await verifyWebhook(rawBody, request.headers, webhookKey, now);
      if (!verified) {
        return json({ error: "Invalid webhook signature" }, 401);
      }
    }

    try {
      const event = JSON.parse(rawBody) as {
        type?: string;
        data?: {
          metadata?: {
            domain?: string;
            name?: string;
            url?: string;
            category?: BoardCategory;
            tagline?: string;
            amountCents?: string;
            email?: string;
          };
          total_amount?: number;
        };
      };

      const meta = event.data?.metadata;
      const domain = meta?.domain;

      if (event.type === "payment.succeeded" && typeof domain === "string" && domain.length > 0 && meta) {
        const amount = event.data?.total_amount ?? parseInt(meta.amountCents || "0", 10);

        let listing = globalListings.find((l) => l.domain === domain);
        if (!listing && meta.url) {
          const newListing: Listing = {
            domain,
            name: meta.name || domain,
            url: meta.url,
            category: meta.category || "Marketing",
            tagline: meta.tagline || "",
            createdAt: now,
            verified: false,
          };
          listing = newListing;
          globalListings.unshift(newListing);

          if (env?.PROMOTIONS_DB) {
            await env.PROMOTIONS_DB.prepare(
              "INSERT OR IGNORE INTO board_listings (domain, name, url, category, tagline, created_at, verified) VALUES (?, ?, ?, ?, ?, ?, 0)"
            ).bind(newListing.domain, newListing.name, newListing.url, newListing.category, newListing.tagline, newListing.createdAt).run().catch(console.error);
          }
        }

        if (meta.email && meta.email.includes("@")) {
          const email = meta.email.trim().toLowerCase();
          if (!globalAlerts[domain]) globalAlerts[domain] = [];
          if (!globalAlerts[domain].includes(email)) globalAlerts[domain].push(email);
          if (env?.PROMOTIONS_DB) {
            await env.PROMOTIONS_DB.prepare(
              "INSERT INTO board_alerts (id, domain, email, created_at) VALUES (?, ?, ?, ?)"
            ).bind(`alt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, domain, email, now).run().catch(console.error);
          }
        }

        if (amount > 0) {
          const window = seasonWindow("all", now);
          const prevRanks = rankListings(globalListings, globalBids, globalClicks, window, null, now);
          const prevRankMap = new Map(prevRanks.map((r) => [r.listing.domain, r.rank]));

          const bidId = `bid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const newBid: Bid = {
            id: bidId,
            domain,
            amountCents: amount,
            at: now,
          };
          globalBids.push(newBid);

          if (env?.PROMOTIONS_DB) {
            await env.PROMOTIONS_DB.prepare(
              "INSERT INTO board_bids (id, domain, amount_cents, created_at) VALUES (?, ?, ?, ?)"
            ).bind(newBid.id, newBid.domain, newBid.amountCents, newBid.at).run().catch(console.error);
          }

          const nextRanks = rankListings(globalListings, globalBids, globalClicks, window, null, now);
          const bidderRow = nextRanks.find((r) => r.listing.domain === domain);
          const bidderRank = bidderRow?.rank ?? 999;

          const overtaken: string[] = [];
          for (const r of nextRanks) {
            if (r.listing.domain === domain) continue;
            const oldRank = prevRankMap.get(r.listing.domain);
            if (oldRank !== undefined && r.rank > oldRank && r.rank > bidderRank) {
              overtaken.push(r.listing.domain);
            }
          }

          if (overtaken.length > 0) {
            void notifyOutbid(env, overtaken, domain, listing?.name || domain, now);
          }

          broadcastBoardEvent("bid_placed", { domain, amountCents: amount, now });
        }
      }
    } catch (err) {
      console.error("Error processing Dodo webhook:", err);
    }

    return json({ ok: true });
  }

  // POST /v1/clicks
  if (path === "/clicks" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { domain?: string };
    if (body.domain) {
      globalClicks[body.domain] = (globalClicks[body.domain] || 0) + 1;
      if (env?.PROMOTIONS_DB) {
        await env.PROMOTIONS_DB.prepare(
          "INSERT INTO board_clicks (domain, count) VALUES (?, 1) ON CONFLICT(domain) DO UPDATE SET count = count + 1"
        ).bind(body.domain).run().catch(console.error);
      }
      broadcastBoardEvent("click_recorded", { domain: body.domain, clicks: globalClicks[body.domain] });
    }
    return json({ ok: true });
  }

  // GET /v1/activity
  if (path === "/activity" && request.method === "GET") {
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "12", 10)));
    const sorted = [...globalBids].sort((a, b) => b.at - a.at).slice(0, limit);

    const items: ActivityItem[] = sorted.map((b) => {
      const l = globalListings.find((x) => x.domain === b.domain);
      return {
        id: b.id,
        domain: b.domain,
        name: l ? l.name : b.domain,
        amountCents: b.amountCents,
        at: b.at,
        tookLead: false,
      };
    });

    return json(items);
  }

  // GET /v1/hall-of-fame
  if (path === "/hall-of-fame" && request.method === "GET") {
    const hof: HallOfFame = [
      {
        season: "daily",
        label: "Yesterday",
        window: { start: now - 86400000, end: now },
        winner: { listing: globalListings[0], totalCents: 15000 },
        entrants: globalListings.length,
      },
      {
        season: "weekly",
        label: "Last week",
        window: { start: now - 7 * 86400000, end: now },
        winner: { listing: globalListings[1] || globalListings[0], totalCents: 45000 },
        entrants: globalListings.length,
      },
      {
        season: "monthly",
        label: "Last month",
        window: { start: now - 30 * 86400000, end: now },
        winner: { listing: globalListings[2] || globalListings[0], totalCents: 120000 },
        entrants: globalListings.length,
      },
    ];

    return json(hof);
  }

  // GET /v1/listing
  if (path === "/listing" && request.method === "GET") {
    const domain = url.searchParams.get("domain");
    const listing = globalListings.find((l) => l.domain === domain);
    if (!listing) return json({ error: "Not found" }, 404);

    return json({
      listing,
      clicks: globalClicks[listing.domain] || 0,
      ranks: {
        all: { rank: 1, of: globalListings.length, totalCents: 10000 },
        daily: { rank: 1, of: globalListings.length, totalCents: 5000 },
        weekly: { rank: 1, of: globalListings.length, totalCents: 10000 },
        monthly: { rank: 1, of: globalListings.length, totalCents: 10000 },
      },
      ledger: globalBids.filter((b) => b.domain === listing.domain),
      history: [],
      leadCostCents: { all: 100, daily: 100, weekly: 100, monthly: 100 },
    });
  }

  return json({ error: "Not found" }, 404);
}
