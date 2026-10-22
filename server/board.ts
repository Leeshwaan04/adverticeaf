import { BOARD_CATEGORIES, RULES, type BoardCategory, type SeasonId } from "../src/lib/board/config";
import { boardStats, costToLead, rankListings, seasonWindow } from "../src/lib/board/rules";
import type { ActivityItem, Bid, BoardSnapshot, HallOfFame, Listing } from "../src/lib/board/types";
import { checkListingUrl } from "../src/lib/board/listing";
import { buildSeed } from "../src/lib/board/demo";

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

let initialized = false;
let globalListings: Listing[] = [];
let globalBids: Bid[] = [];
let globalClicks: Record<string, number> = {};

function ensureInit(now: number) {
  if (initialized && globalListings.length > 0) return;
  const seed = buildSeed(now);
  globalListings = seed.listings.map((l) => ({ ...l, sample: undefined }));
  globalBids = seed.bids.map((b) => ({ ...b, sample: undefined }));
  globalClicks = { ...seed.clicks };
  initialized = true;
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
  ensureInit(now);

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
