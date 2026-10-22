import { BOARD_CATEGORIES, RULES, type BoardCategory, type SeasonId } from "../src/lib/board/config";
import { boardStats, costToLead, rankListings, seasonWindow } from "../src/lib/board/rules";
import type { ActivityItem, Bid, BoardSnapshot, HallOfFame, Listing } from "../src/lib/board/types";
import { checkListingUrl } from "../src/lib/board/listing";

export interface BoardEnv {
  PROMOTIONS_DB?: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        first<T>(): Promise<T | null>;
        all<T>(): Promise<{ results: T[] }>;
        run(): Promise<unknown>;
      };
    };
  };
}

// In-memory persistent state across worker invocations if D1 is not attached
const INITIAL_LISTINGS: Listing[] = [
  { domain: "cursor.com", name: "Cursor", url: "https://cursor.com", category: "Developer", tagline: "The AI code editor built to make engineers 10x faster", createdAt: Date.now() - 35 * 86400000, verified: true },
  { domain: "linear.app", name: "Linear", url: "https://linear.app", category: "Productivity", tagline: "The issue tracking tool built for high-performance software teams", createdAt: Date.now() - 34 * 86400000, verified: true },
  { domain: "polymarket.com", name: "Polymarket", url: "https://polymarket.com", category: "Crypto", tagline: "The world's largest real-time prediction market", createdAt: Date.now() - 32 * 86400000, verified: true },
  { domain: "adverticeaf.com", name: "AdverticeAF", url: "https://adverticeaf.com", category: "Marketing", tagline: "The live pay-to-rank advertising board & viral attention market", createdAt: Date.now() - 30 * 86400000, verified: true },
  { domain: "beehiiv.com", name: "beehiiv", url: "https://beehiiv.com", category: "Marketing", tagline: "The newsletter platform built for hyper-growth & monetization", createdAt: Date.now() - 31 * 86400000, verified: true },
  { domain: "supabase.com", name: "Supabase", url: "https://supabase.com", category: "Developer", tagline: "The open source Firebase alternative with Postgres and Realtime", createdAt: Date.now() - 29 * 86400000, verified: true },
  { domain: "ahrefs.com", name: "Ahrefs", url: "https://ahrefs.com", category: "SEO", tagline: "SEO tools & backlink intelligence to scale organic traffic", createdAt: Date.now() - 28 * 86400000, verified: true },
  { domain: "perplexity.ai", name: "Perplexity", url: "https://perplexity.ai", category: "SEO", tagline: "Where knowledge begins: Conversational AI search engine", createdAt: Date.now() - 27 * 86400000, verified: true },
  { domain: "raycast.com", name: "Raycast", url: "https://raycast.com", category: "Productivity", tagline: "Supercharged desktop productivity launcher and AI companion", createdAt: Date.now() - 26 * 86400000, verified: true },
  { domain: "anthropic.com", name: "Claude", url: "https://anthropic.com", category: "Agents", tagline: "Next-generation frontier AI assistant and autonomous coding agent", createdAt: Date.now() - 25 * 86400000, verified: true },
  { domain: "cognition.ai", name: "Devin", url: "https://cognition.ai", category: "Agents", tagline: "The world's first autonomous AI software engineer", createdAt: Date.now() - 24 * 86400000, verified: true },
  { domain: "resend.com", name: "Resend", url: "https://resend.com", category: "Developer", tagline: "Modern email API and transactional platform designed for developers", createdAt: Date.now() - 23 * 86400000, verified: true },
  { domain: "typefully.com", name: "Typefully", url: "https://typefully.com", category: "Marketing", tagline: "AI-powered writing and scheduling for high-growth X and LinkedIn", createdAt: Date.now() - 22 * 86400000, verified: true },
  { domain: "cal.com", name: "Cal.com", url: "https://cal.com", category: "Productivity", tagline: "The open source scheduling infrastructure for everyone", createdAt: Date.now() - 21 * 86400000, verified: true },
  { domain: "phantom.app", name: "Phantom", url: "https://phantom.app", category: "Crypto", tagline: "The friendly crypto and multichain wallet built for Web3", createdAt: Date.now() - 20 * 86400000, verified: true },
  { domain: "chess.com", name: "Chess.com", url: "https://chess.com", category: "Games", tagline: "Play chess online with over 150 million grandmasters & enthusiasts", createdAt: Date.now() - 19 * 86400000, verified: true },
  { domain: "poki.com", name: "Poki", url: "https://poki.com", category: "Games", tagline: "Free instant web games playable on desktop and mobile browsers", createdAt: Date.now() - 18 * 86400000, verified: true },
  { domain: "producthunt.com", name: "Product Hunt", url: "https://producthunt.com", category: "Other", tagline: "The best new tech products and startup launches, curated daily", createdAt: Date.now() - 17 * 86400000, verified: true },
  { domain: "base.org", name: "Base", url: "https://base.org", category: "Crypto", tagline: "Low-cost, builder-friendly Ethereum L2 network by Coinbase", createdAt: Date.now() - 16 * 86400000, verified: true },
  { domain: "posthog.com", name: "PostHog", url: "https://posthog.com", category: "Developer", tagline: "The single platform for product analytics, heatmaps & feature flags", createdAt: Date.now() - 15 * 86400000, verified: true },
];

const INITIAL_BIDS: Bid[] = [
  { id: "b_cur_1", domain: "cursor.com", amountCents: 25000, at: Date.now() - 600000 },
  { id: "b_lin_1", domain: "linear.app", amountCents: 18500, at: Date.now() - 1200000 },
  { id: "b_poly_1", domain: "polymarket.com", amountCents: 15000, at: Date.now() - 1800000 },
  { id: "b_adv_1", domain: "adverticeaf.com", amountCents: 12500, at: Date.now() - 2400000 },
  { id: "b_bee_1", domain: "beehiiv.com", amountCents: 9500, at: Date.now() - 3600000 },
  { id: "b_sup_1", domain: "supabase.com", amountCents: 8500, at: Date.now() - 4800000 },
  { id: "b_ahr_1", domain: "ahrefs.com", amountCents: 7500, at: Date.now() - 6000000 },
  { id: "b_per_1", domain: "perplexity.ai", amountCents: 7000, at: Date.now() - 7200000 },
  { id: "b_ray_1", domain: "raycast.com", amountCents: 6500, at: Date.now() - 8400000 },
  { id: "b_cla_1", domain: "anthropic.com", amountCents: 6000, at: Date.now() - 9600000 },
  { id: "b_dev_1", domain: "cognition.ai", amountCents: 5500, at: Date.now() - 10800000 },
  { id: "b_res_1", domain: "resend.com", amountCents: 5000, at: Date.now() - 12000000 },
  { id: "b_typ_1", domain: "typefully.com", amountCents: 4500, at: Date.now() - 14400000 },
  { id: "b_cal_1", domain: "cal.com", amountCents: 4000, at: Date.now() - 16800000 },
  { id: "b_pha_1", domain: "phantom.app", amountCents: 3500, at: Date.now() - 19200000 },
  { id: "b_che_1", domain: "chess.com", amountCents: 3000, at: Date.now() - 21600000 },
  { id: "b_pok_1", domain: "poki.com", amountCents: 2500, at: Date.now() - 24000000 },
  { id: "b_prd_1", domain: "producthunt.com", amountCents: 2000, at: Date.now() - 26400000 },
  { id: "b_bas_1", domain: "base.org", amountCents: 1500, at: Date.now() - 28800000 },
  { id: "b_pos_1", domain: "posthog.com", amountCents: 1000, at: Date.now() - 31200000 },
];

const globalListings = [...INITIAL_LISTINGS];
const globalBids = [...INITIAL_BIDS];
const globalClicks: Record<string, number> = {
  "cursor.com": 1420,
  "linear.app": 980,
  "polymarket.com": 870,
  "adverticeaf.com": 790,
  "beehiiv.com": 640,
  "supabase.com": 530,
};

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
  void env;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/v1/, "").replace(/\/$/, "");

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

  // POST /v1/quote
  if (path === "/quote" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as {
      amountCents?: number;
      domain?: string;
      url?: string;
      season?: SeasonId;
    };

    const amountCents = typeof body.amountCents === "number" ? body.amountCents : RULES.minBidCents;
    const season: SeasonId = body.season || "all";
    const window = seasonWindow(season, now);
    const rows = rankListings(globalListings, globalBids, globalClicks, window, null, now);

    let targetDomain = body.domain;
    if (!targetDomain && body.url) {
      const parsed = checkListingUrl(body.url);
      if (parsed.ok) targetDomain = parsed.host;
    }

    const existingRow = targetDomain ? rows.find((r) => r.listing.domain === targetDomain) : undefined;
    const currentTotal = existingRow ? existingRow.totalCents : 0;
    const newTotal = currentTotal + amountCents;

    // Projected rank calculation
    let newRank = 1;
    for (const r of rows) {
      if (existingRow && r.listing.domain === existingRow.listing.domain) continue;
      if (r.totalCents >= newTotal) newRank++;
    }

    return json({
      ok: true,
      currentRank: existingRow ? existingRow.rank : null,
      newRank,
      of: rows.length + (existingRow ? 0 : 1),
      currentTotalCents: currentTotal,
      newTotalCents: newTotal,
      tookLead: newRank === 1,
    });
  }

  // POST /v1/bids
  if (path === "/bids" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as {
      domain?: string;
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
      }
    } else if (body.domain) {
      targetListing = globalListings.find((l) => l.domain === body.domain);
      if (!targetListing) return json({ ok: false, error: "Listing not found." }, 404);
    }

    if (!targetListing) {
      return json({ ok: false, error: "Missing listing information." }, 400);
    }

    const bidId = `bid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newBid: Bid = {
      id: bidId,
      domain: targetListing.domain,
      amountCents,
      at: now,
    };

    globalBids.push(newBid);

    return json({
      ok: true,
      bid: newBid,
      listing: targetListing,
    });
  }

  // POST /v1/clicks
  if (path === "/clicks" && request.method === "POST") {
    const body = await request.json().catch(() => ({})) as { domain?: string };
    if (body.domain) {
      globalClicks[body.domain] = (globalClicks[body.domain] || 0) + 1;
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
