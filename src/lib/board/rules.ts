/**
 * Season Board rules. Pure functions only: no I/O, no clock reads, no randomness.
 * Every function that depends on time takes `now` (epoch ms) so behaviour is testable and deterministic.
 * Money is integer US cents.
 */
import { RULES, SEASONS, type BoardCategory, type SeasonId } from "./config";
import { formatUsd } from "./format";
import { checkListingUrl, validateListing } from "./listing";
import type {
  ActivityItem, Bid, BidRequest, BidResult, BoardRow, ClickCounts, HallOfFame, Listing, ListingDetail, Quote,
  QuoteInput, RankPoint, SeasonWindow,
} from "./types";

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const ALL_TIME: SeasonWindow = { start: 0, end: null };

/* ---------------------------------------------------------------- seasons */

/** The season window that contains `now`. All boundaries are UTC. */
export function seasonWindow(season: SeasonId, now: number): SeasonWindow {
  if (season === "all") return ALL_TIME;
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const dayStart = Date.UTC(y, m, d.getUTCDate());
  if (season === "daily") return { start: dayStart, end: dayStart + DAY_MS };
  if (season === "weekly") {
    const sinceMonday = (d.getUTCDay() + 6) % 7; // Monday = 0
    const start = dayStart - sinceMonday * DAY_MS;
    return { start, end: start + 7 * DAY_MS };
  }
  return { start: Date.UTC(y, m, 1), end: Date.UTC(y, m + 1, 1) };
}

/** The most recent closed season of this kind. null for "all" (it never closes). */
export function previousWindow(season: SeasonId, now: number): { start: number; end: number } | null {
  if (season === "all") return null;
  const cur = seasonWindow(season, now);
  const prev = seasonWindow(season, cur.start - 1);
  return { start: prev.start, end: prev.end as number };
}

export function inWindow(at: number, w: SeasonWindow): boolean {
  return at >= w.start && (w.end === null || at < w.end);
}

/* ---------------------------------------------------------------- money rules */

export const ceilToStep = (cents: number): number => Math.ceil(cents / RULES.stepCents) * RULES.stepCents;

/** Returns an error message, or null when the amount is a valid bid. */
export function validateAmount(cents: number): string | null {
  if (typeof cents !== "number" || !Number.isFinite(cents) || !Number.isInteger(cents)) return "Enter a whole dollar amount.";
  if (cents < RULES.minBidCents) return `The minimum bid is ${formatUsd(RULES.minBidCents)}.`;
  if (cents > RULES.maxBidCents) return `The maximum bid is ${formatUsd(RULES.maxBidCents)}.`;
  if (cents % RULES.stepCents !== 0) {
    return RULES.stepCents === 100 ? "Bids go up in whole dollars." : `Bids go up in steps of ${formatUsd(RULES.stepCents)}.`;
  }
  return null;
}

/* ---------------------------------------------------------------- ranking */

interface Entry {
  listing: Listing;
  total: number;
}

/** Ranking order: higher total first. On a tie the older listing wins, then the key (so the order is total). */
function compareEntries(a: Entry, b: Entry): number {
  if (a.total !== b.total) return b.total - a.total;
  if (a.listing.createdAt !== b.listing.createdAt) return a.listing.createdAt - b.listing.createdAt;
  return a.listing.domain < b.listing.domain ? -1 : a.listing.domain > b.listing.domain ? 1 : 0;
}

/** Sorted entries for a window, counting only bids placed at or before `asOf` and listings that existed by then. */
function rankCore(listings: Listing[], bids: Bid[], window: SeasonWindow, category: BoardCategory | null, asOf: number): Entry[] {
  const totals = new Map<string, number>();
  for (const b of bids) {
    if (!(b.amountCents > 0) || b.at > asOf || !inWindow(b.at, window)) continue;
    totals.set(b.domain, (totals.get(b.domain) ?? 0) + b.amountCents);
  }
  const out: Entry[] = [];
  for (const l of listings) {
    if (l.createdAt > asOf) continue;
    if (category && l.category !== category) continue;
    const total = totals.get(l.domain) ?? 0;
    if (total > 0) out.push({ listing: l, total });
  }
  return out.sort(compareEntries);
}

/** Cost for `row` to pass the entry directly above it. A tie is enough when the tie-break favours `row`. */
function climbCost(row: Entry, above: Entry): number {
  const diff = above.total - row.total;
  const tieWins = compareEntries({ listing: row.listing, total: above.total }, above) < 0;
  return Math.max(RULES.minBidCents, ceilToStep(diff + (tieWins ? 0 : 1)));
}

/**
 * Rank every listing that has a total in `window` (and `category`, when given).
 * prevRank is the rank at `compareAt` (normally now minus one hour) within the same window and category,
 * or null when the listing was not on that board then.
 */
export function rankListings(
  listings: Listing[],
  bids: Bid[],
  clicks: ClickCounts,
  window: SeasonWindow,
  category: BoardCategory | null,
  compareAt: number,
): BoardRow[] {
  const now = rankCore(listings, bids, window, category, Infinity);
  const before = new Map(rankCore(listings, bids, window, category, compareAt).map((e, i) => [e.listing.domain, i + 1]));
  return now.map((e, i) => ({
    rank: i + 1,
    prevRank: before.get(e.listing.domain) ?? null,
    listing: e.listing,
    totalCents: e.total,
    clicks: clicks[e.listing.domain] ?? 0,
    climbCostCents: i === 0 ? null : climbCost(e, now[i - 1]),
  }));
}

/**
 * Amount to pay (on top of what `domain` already has in this season) to become #1.
 * Without `domain`, the amount a brand-new listing needs. 0 when `domain` already leads.
 * Never below the minimum bid, always whole steps.
 */
export function costToLead(rows: BoardRow[], domain?: string): number {
  if (rows.length === 0) return RULES.minBidCents;
  const leader = rows[0];
  if (domain && leader.listing.domain === domain) return 0;
  const own = domain ? (rows.find((r) => r.listing.domain === domain)?.totalCents ?? 0) : 0;
  return Math.max(RULES.minBidCents, ceilToStep(leader.totalCents + RULES.leadMarginCents - own));
}

export function boardStats(rows: BoardRow[]): { listings: number; totalCents: number; clicks: number } {
  return {
    listings: rows.length,
    totalCents: rows.reduce((s, r) => s + r.totalCents, 0),
    clicks: rows.reduce((s, r) => s + r.clicks, 0),
  };
}

/* ---------------------------------------------------------------- quote */

export interface LedgerData {
  listings: Listing[];
  bids: Bid[];
}

/** Price a bid before any form: validates the amount and shows the resulting rank. */
export function quote(input: QuoteInput, data: LedgerData, now: number): Quote {
  const amountError = validateAmount(input.amountCents);
  if (amountError) return { ok: false, error: amountError };
  if (!SEASONS.some((s) => s.id === input.season)) return { ok: false, error: "Unknown season." };

  let key = input.domain?.trim() || "";
  const existing = key ? data.listings.find((l) => l.domain === key) : undefined;
  if (key && !existing) return { ok: false, error: "That listing is not on the Board." };
  if (!key) {
    if (!input.url?.trim()) return { ok: false, error: "Choose a listing or enter a link first." };
    const c = checkListingUrl(input.url);
    if (!c.ok) return { ok: false, error: c.error };
    key = c.key;
  }
  const listing = existing ?? data.listings.find((l) => l.domain === key);

  const rows = rankListings(data.listings, data.bids, {}, seasonWindow(input.season, now), null, now - HOUR_MS);
  const own = rows.find((r) => r.listing.domain === key);
  const currentTotal = own?.totalCents ?? 0;
  const newTotal = currentTotal + input.amountCents;
  const me: Entry = { listing: listing ?? ({ domain: key, createdAt: now } as Listing), total: newTotal };
  const others = rows.filter((r) => r.listing.domain !== key);
  const ahead = others.filter((r) => compareEntries({ listing: r.listing, total: r.totalCents }, me) < 0).length;

  return {
    ok: true,
    domain: key,
    isNewListing: !listing,
    amountCents: input.amountCents,
    currentTotalCents: currentTotal,
    newTotalCents: newTotal,
    currentRank: own?.rank ?? null,
    newRank: ahead + 1,
    of: others.length + 1,
    costToLeadCents: costToLead(rows, listing ? key : undefined),
    costToClimbCents: own ? own.climbCostCents : null,
  };
}

/* ---------------------------------------------------------------- hall of fame, activity */

const HOF: { season: "daily" | "weekly" | "monthly"; label: string }[] = [
  { season: "daily", label: "Yesterday" },
  { season: "weekly", label: "Last week" },
  { season: "monthly", label: "Last month" },
];

/** Winners of the most recent closed daily, weekly and monthly seasons, computed from bids. */
export function hallOfFame(listings: Listing[], bids: Bid[], now: number): HallOfFame {
  return HOF.map(({ season, label }) => {
    const window = previousWindow(season, now) as { start: number; end: number };
    const ranked = rankCore(listings, bids, window, null, window.end);
    const top = ranked[0];
    return {
      season,
      label,
      window,
      winner: top ? { listing: top.listing, totalCents: top.total } : null,
      entrants: ranked.length,
    };
  });
}

/** Newest bids first, each flagged when it made its listing the all-time #1. */
export function recentActivity(listings: Listing[], bids: Bid[], limit: number): ActivityItem[] {
  if (limit <= 0) return [];
  const byKey = new Map(listings.map((l) => [l.domain, l]));
  const asc = bids
    .filter((b) => byKey.has(b.domain) && b.amountCents > 0)
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const totals = new Map<string, number>();
  let leader: Entry | null = null;
  const tookLead = new Set<string>();
  for (const b of asc) {
    const l = byKey.get(b.domain) as Listing;
    const total = (totals.get(b.domain) ?? 0) + b.amountCents;
    totals.set(b.domain, total);
    const mine: Entry = { listing: l, total };
    if (!leader || leader.listing.domain === b.domain) {
      leader = mine;
    } else if (compareEntries(mine, leader) < 0) {
      leader = mine;
      tookLead.add(b.id);
    }
  }
  return asc
    .slice(-Math.max(0, limit))
    .reverse()
    .map((b) => ({
      id: b.id,
      domain: b.domain,
      name: (byKey.get(b.domain) as Listing).name,
      amountCents: b.amountCents,
      at: b.at,
      tookLead: tookLead.has(b.id),
      ...(b.sample ? { sample: true } : {}),
    }));
}

/* ---------------------------------------------------------------- listing detail */

/** All-time rank at evenly spaced moments between the listing's first appearance and now. Oldest first. */
export function rankHistory(domain: string, listings: Listing[], bids: Bid[], now: number, points = 32): RankPoint[] {
  const listing = listings.find((l) => l.domain === domain);
  if (!listing) return [];
  const first = Math.min(listing.createdAt, ...bids.filter((b) => b.domain === domain).map((b) => b.at));
  const start = Math.min(first, now);
  const n = now - start < 60_000 ? 1 : Math.max(2, points);
  const out: RankPoint[] = [];
  for (let i = 0; i < n; i++) {
    const at = n === 1 ? now : Math.round(start + ((now - start) * i) / (n - 1));
    const idx = rankCore(listings, bids, ALL_TIME, null, at).findIndex((e) => e.listing.domain === domain);
    out.push({ at, rank: idx === -1 ? null : idx + 1 });
  }
  return out;
}

export function listingDetail(
  domain: string, listings: Listing[], bids: Bid[], clicks: ClickCounts, now: number,
): ListingDetail | null {
  const listing = listings.find((l) => l.domain === domain);
  if (!listing) return null;
  const ranks = {} as ListingDetail["ranks"];
  const leadCostCents = {} as ListingDetail["leadCostCents"];
  for (const s of SEASONS) {
    const rows = rankListings(listings, bids, clicks, seasonWindow(s.id, now), null, now - HOUR_MS);
    const own = rows.find((r) => r.listing.domain === domain);
    ranks[s.id] = { rank: own?.rank ?? null, totalCents: own?.totalCents ?? 0, of: rows.length };
    leadCostCents[s.id] = costToLead(rows, domain);
  }
  return {
    listing,
    ranks,
    ledger: bids.filter((b) => b.domain === domain).sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1)),
    history: rankHistory(domain, listings, bids, now),
    clicks: clicks[domain] ?? 0,
    leadCostCents,
  };
}

/* ---------------------------------------------------------------- purchase (demo settlement) */

export interface Ledger extends LedgerData {
  /** Idempotency key -> id of the bid it created. */
  receipts: Record<string, string>;
}

const MAX_RECEIPTS = 200;

/**
 * Validate a bid request and apply it to the ledger. Idempotent: a key that was already settled returns the
 * same bid without recording another, so a retry or a double tap can never create a second purchase.
 * The caller supplies `bidId` and `now`, which keeps this pure.
 */
export function settlePurchase(
  ledger: Ledger, req: BidRequest, idempotencyKey: string, now: number, bidId: string,
): { ledger: Ledger; result: BidResult; replayed: boolean } {
  const fail = (error: string) => ({ ledger, result: { ok: false, error } as BidResult, replayed: false });

  const priorId = ledger.receipts[idempotencyKey];
  if (priorId) {
    const bid = ledger.bids.find((b) => b.id === priorId);
    const listing = bid && ledger.listings.find((l) => l.domain === bid.domain);
    if (bid && listing) return { ledger, result: { ok: true, bid, listing }, replayed: true };
  }

  if (!req.acceptedTerms) return fail("Please accept the Board rules to continue.");
  const amountError = validateAmount(req.amountCents);
  if (amountError) return fail(amountError);

  let listing: Listing | undefined;
  let created: Listing | null = null;
  if (req.domain) {
    listing = ledger.listings.find((l) => l.domain === req.domain);
    if (!listing) return fail("That listing is not on the Board.");
  } else if (req.newListing) {
    const v = validateListing({ ...req.newListing });
    const firstError = Object.values(v.errors)[0];
    if (firstError || !v.url) return fail(firstError ?? "Check the listing details.");
    const checked = v.url;
    listing = ledger.listings.find((l) => l.domain === checked.key);
    if (!listing) {
      created = {
        domain: checked.key,
        name: req.newListing.name.trim(),
        url: checked.url,
        category: req.newListing.category,
        tagline: req.newListing.tagline.trim(),
        createdAt: now,
        verified: false,
      };
      listing = created;
    }
  } else {
    return fail("Choose a listing first.");
  }

  const bid: Bid = { id: bidId, domain: listing.domain, amountCents: req.amountCents, at: now };
  const receipts = { ...ledger.receipts, [idempotencyKey]: bid.id };
  const keys = Object.keys(receipts);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_RECEIPTS))) delete receipts[k];
  return {
    ledger: { listings: created ? [...ledger.listings, created] : ledger.listings, bids: [...ledger.bids, bid], receipts },
    result: { ok: true, bid, listing },
    replayed: false,
  };
}
