import { describe, expect, it } from "vitest";
import { BOARD_CATEGORIES, RULES } from "./config";
import { buildSeed, rebaseSamples } from "./demo";
import { parseBidResult, parseDetail, parseListing, parseQuote, parseSnapshot, safeCheckoutUrl } from "./http";
import {
  DAY_MS, HOUR_MS, boardStats, ceilToStep, costToLead, hallOfFame, inWindow, listingDetail, previousWindow, quote,
  rankHistory, rankListings, recentActivity, seasonWindow, settlePurchase, validateAmount, type Ledger,
} from "./rules";
import type { Bid, Listing } from "./types";

const D = (dollars: number) => dollars * 100;
// Wednesday 21 October 2026, 15:30:00 UTC.
const NOW = Date.UTC(2026, 9, 21, 15, 30);

function listing(domain: string, createdAt: number, extra: Partial<Listing> = {}): Listing {
  return { domain, name: domain, url: `https://${domain}`, category: "Other", tagline: "tagline", createdAt, verified: false, ...extra };
}
let n = 0;
function bid(domain: string, dollars: number, at: number): Bid {
  return { id: `b${n++}`, domain, amountCents: D(dollars), at };
}
const ALL = { start: 0, end: null };

describe("season windows (UTC)", () => {
  it("sanity: the fixed clock is a Wednesday", () => {
    expect(new Date(NOW).getUTCDay()).toBe(3);
  });
  it("daily starts at 00:00 UTC and lasts 24h", () => {
    expect(seasonWindow("daily", NOW)).toEqual({ start: Date.UTC(2026, 9, 21), end: Date.UTC(2026, 9, 22) });
  });
  it("weekly starts on Monday 00:00 UTC", () => {
    expect(seasonWindow("weekly", NOW)).toEqual({ start: Date.UTC(2026, 9, 19), end: Date.UTC(2026, 9, 26) });
  });
  it("weekly on a Monday starts that same day, and on a Sunday belongs to the week that began six days earlier", () => {
    const monday = Date.UTC(2026, 9, 19, 0, 0, 0);
    expect(seasonWindow("weekly", monday).start).toBe(monday);
    const sunday = Date.UTC(2026, 9, 25, 23, 59, 59);
    expect(seasonWindow("weekly", sunday).start).toBe(monday);
    expect(seasonWindow("weekly", monday - 1).start).toBe(Date.UTC(2026, 9, 12));
  });
  it("monthly starts on the 1st, including December rolling into January", () => {
    expect(seasonWindow("monthly", NOW)).toEqual({ start: Date.UTC(2026, 9, 1), end: Date.UTC(2026, 10, 1) });
    expect(seasonWindow("monthly", Date.UTC(2026, 11, 31, 23)).end).toBe(Date.UTC(2027, 0, 1));
  });
  it("all time is open ended and has no previous window", () => {
    expect(seasonWindow("all", NOW)).toEqual({ start: 0, end: null });
    expect(previousWindow("all", NOW)).toBeNull();
  });
  it("window ends are exclusive and starts inclusive", () => {
    const w = seasonWindow("daily", NOW);
    expect(inWindow(w.start, w)).toBe(true);
    expect(inWindow(w.start - 1, w)).toBe(false);
    expect(inWindow(w.end as number, w)).toBe(false);
    expect(inWindow(w.end! - 1, w)).toBe(true);
  });
  it("previous windows are the closed season just before now", () => {
    expect(previousWindow("daily", NOW)).toEqual({ start: Date.UTC(2026, 9, 20), end: Date.UTC(2026, 9, 21) });
    expect(previousWindow("weekly", NOW)).toEqual({ start: Date.UTC(2026, 9, 12), end: Date.UTC(2026, 9, 19) });
    expect(previousWindow("monthly", NOW)).toEqual({ start: Date.UTC(2026, 8, 1), end: Date.UTC(2026, 9, 1) });
  });
});

describe("validateAmount", () => {
  it("accepts the minimum, whole steps and the maximum", () => {
    expect(validateAmount(RULES.minBidCents)).toBeNull();
    expect(validateAmount(D(25))).toBeNull();
    expect(validateAmount(RULES.maxBidCents)).toBeNull();
  });
  it("rejects below minimum, above maximum, off-step, fractional and non-numbers", () => {
    expect(validateAmount(RULES.minBidCents - 100)).toMatch(/minimum/);
    expect(validateAmount(0)).toMatch(/minimum/);
    expect(validateAmount(-500)).toMatch(/minimum/);
    expect(validateAmount(RULES.maxBidCents + 100)).toMatch(/maximum/);
    expect(validateAmount(150)).toMatch(/whole dollars/);
    expect(validateAmount(100.5)).toMatch(/whole/);
    expect(validateAmount(Number.NaN)).toMatch(/whole/);
    expect(validateAmount(Number.POSITIVE_INFINITY)).toMatch(/whole/);
  });
  it("ceilToStep rounds up to whole steps", () => {
    expect(ceilToStep(1)).toBe(100);
    expect(ceilToStep(100)).toBe(100);
    expect(ceilToStep(101)).toBe(200);
  });
});

describe("rankListings", () => {
  const t0 = NOW - 10 * DAY_MS;
  const a = listing("a.example", t0);
  const b = listing("b.example", t0 + 1000);
  const c = listing("c.example", t0 + 2000);

  it("ranks by total and omits listings with no bids in the window", () => {
    const bids = [bid("a.example", 5, NOW - DAY_MS), bid("b.example", 20, NOW - DAY_MS)];
    const rows = rankListings([a, b, c], bids, {}, ALL, null, NOW - HOUR_MS);
    expect(rows.map((r) => [r.listing.domain, r.rank, r.totalCents])).toEqual([
      ["b.example", 1, D(20)],
      ["a.example", 2, D(5)],
    ]);
  });

  it("sums every bid for a listing", () => {
    const bids = [bid("a.example", 5, NOW - 5 * DAY_MS), bid("a.example", 10, NOW - DAY_MS), bid("b.example", 12, NOW - DAY_MS)];
    const rows = rankListings([a, b], bids, {}, ALL, null, NOW - HOUR_MS);
    expect(rows[0]).toMatchObject({ rank: 1, totalCents: D(15) });
  });

  it("breaks ties in favour of the older listing, whatever the input order", () => {
    const bids = [bid("c.example", 10, NOW - DAY_MS), bid("b.example", 10, NOW - DAY_MS), bid("a.example", 10, NOW - DAY_MS)];
    const rows = rankListings([c, b, a], bids, {}, ALL, null, NOW - HOUR_MS);
    expect(rows.map((r) => r.listing.domain)).toEqual(["a.example", "b.example", "c.example"]);
  });

  it("falls back to the key when createdAt is also equal, so the order is total", () => {
    const x = listing("x.example", t0);
    const y = listing("y.example", t0);
    const bids = [bid("y.example", 3, NOW - DAY_MS), bid("x.example", 3, NOW - DAY_MS)];
    expect(rankListings([y, x], bids, {}, ALL, null, NOW).map((r) => r.listing.domain)).toEqual(["x.example", "y.example"]);
  });

  it("counts a bid in every window that contains its timestamp", () => {
    const bids = [
      bid("a.example", 1, NOW - 30 * 60_000), // today, this week, this month, all time
      bid("a.example", 2, NOW - 3 * DAY_MS), // not today; this week (Mon 19th is 2 days back, so no), this month
    ];
    const total = (w: ReturnType<typeof seasonWindow>) => rankListings([a], bids, {}, w, null, NOW)[0]?.totalCents ?? 0;
    expect(total(seasonWindow("daily", NOW))).toBe(D(1));
    expect(total(seasonWindow("weekly", NOW))).toBe(D(1));
    expect(total(seasonWindow("monthly", NOW))).toBe(D(3));
    expect(total(seasonWindow("all", NOW))).toBe(D(3));
  });

  it("includes a bid exactly at the window start and excludes one exactly at the end", () => {
    const w = seasonWindow("daily", NOW);
    const bids = [bid("a.example", 4, w.start), bid("b.example", 9, w.end as number)];
    const rows = rankListings([a, b], bids, {}, w, null, NOW);
    expect(rows.map((r) => r.listing.domain)).toEqual(["a.example"]);
  });

  it("filters by category and ranks within it", () => {
    const ag = listing("ag.example", t0, { category: "Marketing" });
    const bids = [bid("ag.example", 1, NOW - DAY_MS), bid("b.example", 50, NOW - DAY_MS)];
    const rows = rankListings([ag, b], bids, {}, ALL, "Marketing", NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rank: 1, climbCostCents: null });
  });

  it("reports prevRank as the rank one hour ago, and null for listings that were not listed then", () => {
    const compareAt = NOW - HOUR_MS;
    const bids = [
      bid("a.example", 10, NOW - 5 * DAY_MS),
      bid("b.example", 8, NOW - 5 * DAY_MS),
      bid("b.example", 5, NOW - 30 * 60_000), // b overtakes a within the last hour
      bid("c.example", 1, NOW - 10 * 60_000), // c is new within the last hour
    ];
    const rows = rankListings([a, b, c], bids, {}, ALL, null, compareAt);
    const byKey = Object.fromEntries(rows.map((r) => [r.listing.domain, r]));
    expect(byKey["b.example"]).toMatchObject({ rank: 1, prevRank: 2 });
    expect(byKey["a.example"]).toMatchObject({ rank: 2, prevRank: 1 });
    expect(byKey["c.example"]).toMatchObject({ rank: 3, prevRank: null });
  });

  it("a bid made exactly at compareAt already counts for prevRank", () => {
    const compareAt = NOW - HOUR_MS;
    const bids = [bid("a.example", 1, compareAt)];
    expect(rankListings([a], bids, {}, ALL, null, compareAt)[0].prevRank).toBe(1);
    expect(rankListings([a], bids, {}, ALL, null, compareAt - 1)[0].prevRank).toBeNull();
  });

  it("carries click counts through", () => {
    const rows = rankListings([a], [bid("a.example", 1, NOW - DAY_MS)], { "a.example": 7 }, ALL, null, NOW);
    expect(rows[0].clicks).toBe(7);
  });

  it("ignores bids for unknown listings and non-positive amounts", () => {
    const bad: Bid = { id: "z", domain: "a.example", amountCents: -500, at: NOW - DAY_MS };
    const ghost = bid("ghost.example", 99, NOW - DAY_MS);
    expect(rankListings([a], [bad, ghost], {}, ALL, null, NOW)).toEqual([]);
  });

  it("climb cost: the gap plus one step when the tie-break does not help, the exact gap when it does", () => {
    // b is newer than a. b has $5, a has $10. For b to pass a it must exceed $10: gap $5 + 1 cent, rounded to $6.
    const rows = rankListings([a, b], [bid("a.example", 10, NOW - DAY_MS), bid("b.example", 5, NOW - DAY_MS)], {}, ALL, null, NOW);
    expect(rows[0].climbCostCents).toBeNull();
    expect(rows[1].climbCostCents).toBe(D(6));
    // Now the lower listing is the OLDER one: matching the total is enough, because the tie goes to the older listing.
    const rows2 = rankListings([a, b], [bid("b.example", 10, NOW - DAY_MS), bid("a.example", 5, NOW - DAY_MS)], {}, ALL, null, NOW);
    expect(rows2[1].listing.domain).toBe("a.example");
    expect(rows2[1].climbCostCents).toBe(D(5));
  });

  it("applying the climb cost really does pass the listing above (both tie-break directions)", () => {
    const ls = [a, b, c];
    const base = [bid("a.example", 10, NOW - DAY_MS), bid("b.example", 7, NOW - DAY_MS), bid("c.example", 3, NOW - DAY_MS)];
    const rows = rankListings(ls, base, {}, ALL, null, NOW);
    for (const row of rows.slice(1)) {
      const after = rankListings(ls, [...base, bid(row.listing.domain, row.climbCostCents! / 100, NOW)], {}, ALL, null, NOW);
      expect(after.find((r) => r.listing.domain === row.listing.domain)!.rank).toBe(row.rank - 1);
      // One step less would not have been enough.
      if (row.climbCostCents! > RULES.minBidCents) {
        const short = rankListings(ls, [...base, bid(row.listing.domain, row.climbCostCents! / 100 - 1, NOW)], {}, ALL, null, NOW);
        expect(short.find((r) => r.listing.domain === row.listing.domain)!.rank).toBe(row.rank);
      }
    }
  });

  it("climb cost is never below the minimum bid", () => {
    const rows = rankListings([a, b], [bid("a.example", 1, NOW - DAY_MS), bid("b.example", 1, NOW - DAY_MS)], {}, ALL, null, NOW);
    // Tied on $1: a (older) wins; b needs to exceed it, so it needs at least one whole step.
    expect(rows[1].climbCostCents).toBe(RULES.minBidCents);
  });
});

describe("costToLead", () => {
  const t0 = NOW - 10 * DAY_MS;
  const a = listing("a.example", t0);
  const b = listing("b.example", t0 + 1);

  it("is the minimum bid on an empty board", () => {
    expect(costToLead([])).toBe(RULES.minBidCents);
  });
  it("is the leader's total plus the lead margin for a new listing", () => {
    const rows = rankListings([a], [bid("a.example", 20, NOW - DAY_MS)], {}, ALL, null, NOW);
    expect(costToLead(rows)).toBe(D(20) + RULES.leadMarginCents);
  });
  it("a new listing that pays exactly that amount ends up #1, and one step less does not", () => {
    const base = [bid("a.example", 20, NOW - DAY_MS)];
    const rows = rankListings([a], base, {}, ALL, null, NOW);
    const cost = costToLead(rows);
    const fresh = listing("new.example", NOW);
    const win = rankListings([a, fresh], [...base, bid("new.example", cost / 100, NOW)], {}, ALL, null, NOW);
    expect(win[0].listing.domain).toBe("new.example");
    const lose = rankListings([a, fresh], [...base, bid("new.example", cost / 100 - 1, NOW)], {}, ALL, null, NOW);
    expect(lose[0].listing.domain).toBe("a.example");
  });
  it("accounts for what an existing listing already holds, and is 0 for the leader", () => {
    const rows = rankListings([a, b], [bid("a.example", 20, NOW - DAY_MS), bid("b.example", 12, NOW - DAY_MS)], {}, ALL, null, NOW);
    expect(costToLead(rows, "b.example")).toBe(D(20) + RULES.leadMarginCents - D(12));
    expect(costToLead(rows, "a.example")).toBe(0);
  });
});

describe("quote", () => {
  const t0 = NOW - 10 * DAY_MS;
  const a = listing("a.example", t0);
  const b = listing("b.example", t0 + 1);
  const data = { listings: [a, b], bids: [bid("a.example", 20, NOW - DAY_MS), bid("b.example", 8, NOW - DAY_MS)] };

  it("rejects invalid amounts before anything else", () => {
    expect(quote({ domain: "a.example", amountCents: 50, season: "all" }, data, NOW)).toMatchObject({ ok: false });
    expect(quote({ domain: "a.example", amountCents: 150, season: "all" }, data, NOW)).toMatchObject({ ok: false });
    expect(quote({ domain: "a.example", amountCents: RULES.maxBidCents + 100, season: "all" }, data, NOW)).toMatchObject({ ok: false });
  });
  it("rejects unknown listings, missing targets and bad links", () => {
    expect(quote({ domain: "nope.example", amountCents: 100, season: "all" }, data, NOW)).toMatchObject({ ok: false });
    expect(quote({ amountCents: 100, season: "all" }, data, NOW)).toMatchObject({ ok: false });
    expect(quote({ url: "bit.ly/x", amountCents: 100, season: "all" }, data, NOW)).toMatchObject({ ok: false });
  });
  it("prices an existing listing: new total, new rank, and the cost to climb and lead", () => {
    const q = quote({ domain: "b.example", amountCents: D(15), season: "all" }, data, NOW);
    expect(q).toMatchObject({
      ok: true, isNewListing: false, currentRank: 2, currentTotalCents: D(8), newTotalCents: D(23), newRank: 1, of: 2,
      costToLeadCents: D(13), costToClimbCents: D(13),
    });
  });
  it("a bid that only ties a newer rival does not pass them, but ties against a younger one do", () => {
    // b ($8) pays $12 -> $20, a tie with a ($20). a is older so a keeps #1.
    const q = quote({ domain: "b.example", amountCents: D(12), season: "all" }, data, NOW);
    expect(q).toMatchObject({ ok: true, newTotalCents: D(20), newRank: 2 });
    // Reverse: a pays nothing extra but if a tied b, a would win. Check with a bidding $1 while b holds $20.
    const data2 = { listings: [a, b], bids: [bid("a.example", 19, NOW - DAY_MS), bid("b.example", 20, NOW - DAY_MS)] };
    expect(quote({ domain: "a.example", amountCents: D(1), season: "all" }, data2, NOW)).toMatchObject({ ok: true, newTotalCents: D(20), newRank: 1 });
  });
  it("prices a new listing from its url, with the same key as checkListingUrl", () => {
    const q = quote({ url: "https://Fresh.example/?utm_source=x", amountCents: D(30), season: "all" }, data, NOW);
    expect(q).toMatchObject({ ok: true, domain: "fresh.example", isNewListing: true, currentRank: null, currentTotalCents: 0, newRank: 1, of: 3, costToClimbCents: null, costToLeadCents: D(21) });
  });
  it("is season specific", () => {
    const old = { listings: [a], bids: [bid("a.example", 50, NOW - 20 * DAY_MS)] };
    expect(quote({ url: "x.example", amountCents: D(1), season: "daily" }, old, NOW)).toMatchObject({ ok: true, newRank: 1, of: 1, costToLeadCents: RULES.minBidCents });
    expect(quote({ url: "x.example", amountCents: D(1), season: "all" }, old, NOW)).toMatchObject({ ok: true, newRank: 2, of: 2 });
  });
  it("an existing listing with nothing in this season is unranked there", () => {
    const old = { listings: [a], bids: [bid("a.example", 50, NOW - 20 * DAY_MS)] };
    expect(quote({ domain: "a.example", amountCents: D(2), season: "daily" }, old, NOW)).toMatchObject({ ok: true, isNewListing: false, currentRank: null, newRank: 1, of: 1 });
  });
  it("being #1 already: nothing to climb, no cost to lead", () => {
    const q = quote({ domain: "a.example", amountCents: D(1), season: "all" }, data, NOW);
    expect(q).toMatchObject({ ok: true, currentRank: 1, costToClimbCents: null, costToLeadCents: 0 });
  });
});

describe("hallOfFame", () => {
  const a = listing("a.example", NOW - 60 * DAY_MS);
  const b = listing("b.example", NOW - 60 * DAY_MS);
  it("picks the winner of each most recent CLOSED season, ignoring bids in the current one", () => {
    const bids = [
      bid("a.example", 5, Date.UTC(2026, 9, 20, 12)), // yesterday
      bid("b.example", 9, Date.UTC(2026, 9, 20, 13)), // yesterday, b wins the day
      bid("a.example", 100, Date.UTC(2026, 9, 21, 1)), // today: must not count for any closed season
      bid("a.example", 30, Date.UTC(2026, 9, 14)), // last week
      bid("a.example", 20, Date.UTC(2026, 8, 10)), // last month
    ];
    const [day, week, month] = hallOfFame([a, b], bids, NOW);
    expect(day).toMatchObject({ season: "daily", label: "Yesterday", entrants: 2 });
    expect(day.winner).toMatchObject({ totalCents: D(9) });
    expect(day.winner?.listing.domain).toBe("b.example");
    expect(week.winner).toMatchObject({ totalCents: D(30) });
    expect(week.winner?.listing.domain).toBe("a.example");
    expect(month.winner).toMatchObject({ totalCents: D(20) });
  });
  it("has no winner for a season nobody paid in", () => {
    const [day, week, month] = hallOfFame([a], [], NOW);
    expect([day.winner, week.winner, month.winner]).toEqual([null, null, null]);
    expect(day.entrants).toBe(0);
  });
  it("includes a bid exactly at a season start and excludes one exactly at its end", () => {
    const start = Date.UTC(2026, 9, 20);
    const end = Date.UTC(2026, 9, 21);
    const [day] = hallOfFame([a, b], [bid("a.example", 2, start), bid("b.example", 50, end)], NOW);
    expect(day.winner?.listing.domain).toBe("a.example");
  });
});

describe("recentActivity and stats", () => {
  const a = listing("a.example", NOW - 20 * DAY_MS);
  const b = listing("b.example", NOW - 19 * DAY_MS);
  const bids = [bid("a.example", 10, NOW - 5 * HOUR_MS), bid("b.example", 3, NOW - 4 * HOUR_MS), bid("b.example", 8, NOW - 2 * HOUR_MS)];

  it("lists newest first and respects the limit", () => {
    const items = recentActivity([a, b], bids, 3);
    expect(items.map((i) => i.at)).toEqual([NOW - 2 * HOUR_MS, NOW - 4 * HOUR_MS, NOW - 5 * HOUR_MS]);
    expect(recentActivity([a, b], bids, 0)).toEqual([]);
  });
  it("flags only the bid that took the all-time lead", () => {
    const items = recentActivity([a, b], bids, 10);
    const flagged = items.filter((i) => i.tookLead).map((i) => [i.name, i.amountCents]);
    expect(flagged).toEqual([["b.example", D(8)]]);
  });
  it("a tying bid by the older listing takes the lead back", () => {
    const more = [...bids, bid("a.example", 1, NOW - HOUR_MS)];
    const items = recentActivity([a, b], more, 10);
    expect(items[0]).toMatchObject({ domain: "a.example", tookLead: true });
  });
  it("skips bids for listings that do not exist", () => {
    expect(recentActivity([a], [bid("ghost.example", 5, NOW)], 5)).toEqual([]);
  });
  it("boardStats are sums of the rows", () => {
    const rows = rankListings([a, b], bids, { "a.example": 4, "b.example": 6 }, ALL, null, NOW);
    expect(boardStats(rows)).toEqual({ listings: 2, totalCents: D(21), clicks: 10 });
    expect(boardStats([])).toEqual({ listings: 0, totalCents: 0, clicks: 0 });
  });
});

describe("listingDetail and rankHistory", () => {
  const a = listing("a.example", NOW - 10 * DAY_MS);
  const b = listing("b.example", NOW - 9 * DAY_MS);
  const bids = [bid("a.example", 5, NOW - 8 * DAY_MS), bid("b.example", 9, NOW - 6 * DAY_MS), bid("a.example", 10, NOW - 2 * HOUR_MS)];

  it("returns null for an unknown listing", () => {
    expect(listingDetail("zzz.example", [a, b], bids, {}, NOW)).toBeNull();
  });
  it("gives per-season ranks, a newest-first ledger, clicks and lead costs", () => {
    const d = listingDetail("b.example", [a, b], bids, { "b.example": 3 }, NOW)!;
    expect(d.ranks.all).toEqual({ rank: 2, totalCents: D(9), of: 2 });
    expect(d.ranks.daily).toEqual({ rank: null, totalCents: 0, of: 1 });
    expect(d.ledger).toHaveLength(1);
    expect(d.clicks).toBe(3);
    expect(d.leadCostCents.all).toBe(D(15) + RULES.leadMarginCents - D(9));
    const lead = listingDetail("a.example", [a, b], bids, {}, NOW)!;
    expect(lead.leadCostCents.all).toBe(0);
    expect(lead.ledger.map((l) => l.amountCents)).toEqual([D(10), D(5)]);
  });
  it("rank history starts unranked or ranked as it was, ends at the current rank and is oldest first", () => {
    const h = rankHistory("a.example", [a, b], bids, NOW, 16);
    expect(h).toHaveLength(16);
    expect(h[0].at).toBeLessThan(h[15].at);
    expect(h[h.length - 1]).toEqual({ at: NOW, rank: 1 });
    expect(h[0].rank).toBeNull(); // first bid is 2 days after creation
    expect(rankHistory("zzz.example", [a], [], NOW)).toEqual([]);
  });
  it("a brand-new listing has a single point at now", () => {
    const fresh = listing("f.example", NOW - 1000);
    expect(rankHistory("f.example", [fresh], [bid("f.example", 1, NOW - 500)], NOW)).toEqual([{ at: NOW, rank: 1 }]);
  });
});

describe("settlePurchase", () => {
  const a = listing("a.example", NOW - DAY_MS);
  const empty = (): Ledger => ({ listings: [a], bids: [], receipts: {} });
  const newListing = { url: "https://fresh.example/?utm_source=x", name: "Fresh", tagline: "We make ads", category: "Developer" as const };

  it("requires accepted terms and a valid amount", () => {
    expect(settlePurchase(empty(), { domain: "a.example", amountCents: D(5), acceptedTerms: false }, "k1", NOW, "b1").result).toMatchObject({ ok: false });
    expect(settlePurchase(empty(), { domain: "a.example", amountCents: 50, acceptedTerms: true }, "k1", NOW, "b1").result).toMatchObject({ ok: false });
    expect(settlePurchase(empty(), { domain: "a.example", amountCents: 150, acceptedTerms: true }, "k1", NOW, "b1").result).toMatchObject({ ok: false });
  });
  it("a failed purchase changes nothing and records no receipt", () => {
    const l = empty();
    const r = settlePurchase(l, { domain: "a.example", amountCents: 50, acceptedTerms: true }, "k1", NOW, "b1");
    expect(r.ledger).toBe(l);
    expect(r.ledger.receipts).toEqual({});
  });
  it("records a bid on an existing listing", () => {
    const r = settlePurchase(empty(), { domain: "a.example", amountCents: D(5), acceptedTerms: true }, "k1", NOW, "b1");
    expect(r.result).toMatchObject({ ok: true, bid: { id: "b1", domain: "a.example", amountCents: D(5), at: NOW } });
    expect(r.ledger.bids).toHaveLength(1);
    expect(r.replayed).toBe(false);
  });
  it("rejects an unknown existing listing and a request with no target", () => {
    expect(settlePurchase(empty(), { domain: "nope.example", amountCents: D(5), acceptedTerms: true }, "k", NOW, "b").result).toMatchObject({ ok: false });
    expect(settlePurchase(empty(), { amountCents: D(5), acceptedTerms: true }, "k", NOW, "b").result).toMatchObject({ ok: false });
  });
  it("creates a new listing with a normalised key and url when paying for a new link", () => {
    const r = settlePurchase(empty(), { newListing, amountCents: D(5), acceptedTerms: true }, "k1", NOW, "b1");
    expect(r.result.ok && r.result.listing).toMatchObject({ domain: "fresh.example", url: "https://fresh.example", createdAt: NOW, verified: false });
    expect(r.ledger.listings).toHaveLength(2);
  });
  it("rejects an invalid new listing and surfaces the first problem", () => {
    const r = settlePurchase(empty(), { newListing: { ...newListing, url: "bit.ly/x" }, amountCents: D(5), acceptedTerms: true }, "k", NOW, "b").result;
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toMatch(/shortener/i);
  });
  it("paying for a link that is already on the Board adds to the existing listing and does not duplicate it", () => {
    const r = settlePurchase(empty(), { newListing: { ...newListing, url: "a.example", name: "Hijack" }, amountCents: D(5), acceptedTerms: true }, "k", NOW, "b");
    expect(r.ledger.listings).toHaveLength(1);
    expect(r.ledger.listings[0].name).toBe("a.example");
    expect(r.ledger.bids[0].domain).toBe("a.example");
  });
  it("is idempotent: the same key twice records exactly one bid and returns the same bid", () => {
    const req = { domain: "a.example", amountCents: D(5), acceptedTerms: true };
    const first = settlePurchase(empty(), req, "same-key", NOW, "b1");
    const second = settlePurchase(first.ledger, req, "same-key", NOW + 5000, "b2");
    expect(second.replayed).toBe(true);
    expect(second.ledger.bids).toHaveLength(1);
    expect(second.result.ok && second.result.bid?.id).toBe("b1");
  });
  it("two concurrent taps with the same key still produce one bid, even when settled from the same starting ledger", () => {
    // Both calls see the ledger as it was after the first one settled, which is how the demo store serialises them.
    const req = { newListing, amountCents: D(5), acceptedTerms: true };
    let ledger = empty();
    const results = [1, 2, 3].map((i) => {
      const r = settlePurchase(ledger, req, "double-click", NOW + i, `b${i}`);
      ledger = r.ledger;
      return r;
    });
    expect(ledger.bids).toHaveLength(1);
    expect(ledger.listings).toHaveLength(2);
    expect(results.map((r) => r.replayed)).toEqual([false, true, true]);
  });
  it("different keys are different purchases", () => {
    const req = { domain: "a.example", amountCents: D(5), acceptedTerms: true };
    const one = settlePurchase(empty(), req, "k1", NOW, "b1");
    const two = settlePurchase(one.ledger, req, "k2", NOW + 1, "b2");
    expect(two.ledger.bids).toHaveLength(2);
  });
  it("a replay does not depend on the request being valid again", () => {
    const good = { domain: "a.example", amountCents: D(5), acceptedTerms: true };
    const first = settlePurchase(empty(), good, "k", NOW, "b1");
    const again = settlePurchase(first.ledger, { ...good, amountCents: 1 }, "k", NOW, "b2");
    expect(again.replayed).toBe(true);
  });
  it("caps the receipts it remembers", () => {
    let ledger = empty();
    for (let i = 0; i < 250; i++) ledger = settlePurchase(ledger, { domain: "a.example", amountCents: D(1), acceptedTerms: true }, `k${i}`, NOW + i, `b${i}`).ledger;
    expect(Object.keys(ledger.receipts).length).toBe(200);
    expect(ledger.receipts.k249).toBe("b249");
    expect(ledger.receipts.k0).toBeUndefined();
  });
});

describe("demo seed", () => {
  const seed = buildSeed(NOW);
  it("has 14 to 25 realistic listings across every category, flagged for rebasing", () => {
    expect(seed.listings.length).toBeGreaterThanOrEqual(14);
    expect(seed.listings.length).toBeLessThanOrEqual(25);
    expect(new Set(seed.listings.map((l) => l.category))).toEqual(new Set(BOARD_CATEGORIES));
    for (const l of seed.listings) {
      expect(l.sample).toBe(true);
      expect(l.url).toBe(`https://${l.domain}`);
      expect(l.name.length).toBeGreaterThan(0);
      expect(l.tagline.length).toBeGreaterThan(0);
    }
    for (const b of seed.bids) expect(b.sample).toBe(true);
  });
  it("is deterministic", () => {
    expect(buildSeed(NOW)).toEqual(seed);
  });
  it("has bids spread over the past 30 days and every bid is whole dollars within the rules", () => {
    const oldest = Math.min(...seed.bids.map((b) => b.at));
    expect(NOW - oldest).toBeGreaterThan(25 * DAY_MS);
    for (const b of seed.bids) {
      expect(b.at).toBeLessThanOrEqual(NOW);
      expect(validateAmount(b.amountCents)).toBeNull();
    }
    for (const l of seed.listings) expect(seed.bids.filter((b) => b.domain === l.domain).length).toBeGreaterThanOrEqual(4);
  });
  it("has bids in the last hour, last day and last week so those windows have data", () => {
    expect(seed.bids.some((b) => NOW - b.at < HOUR_MS)).toBe(true);
    expect(seed.bids.some((b) => NOW - b.at < DAY_MS)).toBe(true);
    expect(seed.bids.some((b) => NOW - b.at < 7 * DAY_MS)).toBe(true);
  });
  it("the listing creation time is its first bid, so tie-breaks are consistent", () => {
    for (const l of seed.listings) {
      const first = Math.min(...seed.bids.filter((b) => b.domain === l.domain).map((b) => b.at));
      expect(l.createdAt).toBe(first);
    }
  });
  it("every season has ranked rows (checked at a mid-afternoon time, when the daily window is populated)", () => {
    for (const s of ["daily", "weekly", "monthly", "all"] as const) {
      expect(rankListings(seed.listings, seed.bids, seed.clicks, seasonWindow(s, NOW), null, NOW - HOUR_MS).length).toBeGreaterThan(0);
    }
    const [day, week, month] = hallOfFame(seed.listings, seed.bids, NOW);
    expect(week.winner).not.toBeNull();
    expect(month.winner).not.toBeNull();
    expect(day.entrants).toBeGreaterThanOrEqual(0);
  });
  it("rebasing slides sample data forward and leaves user data alone", () => {
    const user = bid("a.example", 5, NOW - 1000);
    const state = { ...seed, bids: [...seed.bids, user] };
    const later = rebaseSamples(state, NOW + 3 * HOUR_MS);
    expect(later.anchor).toBe(NOW + 3 * HOUR_MS);
    expect(later.bids.find((b) => b.id === user.id)).toEqual(user);
    expect(later.bids[0].at).toBe(state.bids[0].at + 3 * HOUR_MS);
    expect(later.listings[0].createdAt).toBe(state.listings[0].createdAt + 3 * HOUR_MS);
    expect(rebaseSamples(state, NOW - 5)).toBe(state);
  });
});

describe("untrusted server JSON (http parsers)", () => {
  const goodListing = { domain: "a.example", name: "A", url: "https://a.example", category: "Other", tagline: "t", createdAt: 1, verified: true };

  it("parseListing accepts a good listing and drops bad links and shapes", () => {
    expect(parseListing(goodListing)).toMatchObject({ domain: "a.example", url: "https://a.example", verified: true });
    expect(parseListing({ ...goodListing, url: "javascript:alert(1)" })).toBeNull();
    expect(parseListing({ ...goodListing, url: "data:text/html,hi" })).toBeNull();
    expect(parseListing({ ...goodListing, url: "https://bit.ly/x" })).toBeNull();
    expect(parseListing({ ...goodListing, name: "" })).toBeNull();
    expect(parseListing({ ...goodListing, createdAt: "yesterday" })).toBeNull();
    expect(parseListing(null)).toBeNull();
    expect(parseListing("x")).toBeNull();
  });
  it("parseListing normalises the url and falls back to a known category", () => {
    const l = parseListing({ ...goodListing, url: "a.example/?utm_source=x", category: "Hacked" });
    expect(l).toMatchObject({ url: "https://a.example", category: "Other" });
  });
  it("parseSnapshot recomputes stats from the rows, sorts them and drops malformed rows", () => {
    const row = (rank: number, total: number) => ({ rank, prevRank: null, listing: { ...goodListing, domain: `r${rank}.example`, url: `https://r${rank}.example` }, totalCents: total, clicks: 2, climbCostCents: rank === 1 ? null : 100 });
    const snap = parseSnapshot(
      { window: { start: 0, end: null }, leadCostCents: 500, generatedAt: 5, stats: { listings: 999, totalCents: 999, clicks: 999 }, rows: [row(2, 300), { junk: true }, row(1, 700)] },
      "all", null,
    )!;
    expect(snap.rows.map((r) => r.rank)).toEqual([1, 2]);
    expect(snap.stats).toEqual({ listings: 2, totalCents: 1000, clicks: 4 });
    expect(snap.mode).toBe("live");
    expect(parseSnapshot({ window: { start: 0, end: "never" }, leadCostCents: 5, rows: [] }, "daily", null)).toBeNull();
    expect(parseSnapshot({ window: { start: 0, end: null }, leadCostCents: -5, rows: [] }, "daily", null)).toBeNull();
    expect(parseSnapshot("nope", "daily", null)).toBeNull();
  });
  it("parseQuote handles ok, error and junk", () => {
    const ok = { ok: true, domain: "a.example", isNewListing: false, amountCents: 500, currentTotalCents: 0, newTotalCents: 500, currentRank: null, newRank: 3, of: 3, costToLeadCents: 900, costToClimbCents: null };
    expect(parseQuote(ok)).toMatchObject({ ok: true, newRank: 3, currentRank: null });
    expect(parseQuote({ ok: false, error: "nope" })).toEqual({ ok: false, error: "nope" });
    expect(parseQuote({ ...ok, newRank: 0 })).toBeNull();
    expect(parseQuote({ ...ok, amountCents: 5.5 })).toBeNull();
    expect(parseQuote({ ok: "yes" })).toBeNull();
  });
  it("only https checkout urls pass", () => {
    expect(safeCheckoutUrl("https://pay.example/session/1")).toBe("https://pay.example/session/1");
    expect(safeCheckoutUrl("http://pay.example/x")).toBeNull();
    expect(safeCheckoutUrl("javascript:alert(1)")).toBeNull();
    expect(safeCheckoutUrl("https://user:pw@pay.example/x")).toBeNull();
    expect(safeCheckoutUrl("//pay.example")).toBeNull();
    expect(safeCheckoutUrl(42)).toBeNull();
  });
  it("parseBidResult never passes an insecure checkout url through", () => {
    expect(parseBidResult({ checkoutUrl: "https://pay.example/s/1" })).toEqual({ ok: true, checkoutUrl: "https://pay.example/s/1" });
    const bad = parseBidResult({ ok: true, checkoutUrl: "http://pay.example/s/1" });
    expect(bad).toMatchObject({ ok: false });
    expect(parseBidResult({ ok: false, error: "card declined" })).toEqual({ ok: false, error: "card declined" });
    expect(parseBidResult({ ok: true })).toBeNull();
    expect(parseBidResult({ ok: true, bid: { id: "b", domain: "a.example", amountCents: 100, at: 1 }, listing: goodListing })).toMatchObject({ ok: true });
  });
  it("parseDetail requires every season", () => {
    const ranks = Object.fromEntries(["daily", "weekly", "monthly", "all"].map((s) => [s, { rank: 1, totalCents: 100, of: 3 }]));
    const lead = Object.fromEntries(["daily", "weekly", "monthly", "all"].map((s) => [s, 0]));
    const base = { listing: goodListing, ranks, leadCostCents: lead, ledger: [{ id: "b", domain: "a.example", amountCents: 100, at: 1 }, "junk"], history: [{ at: 1, rank: 1 }, { at: "x" }], clicks: 3 };
    const d = parseDetail(base)!;
    expect(d.ledger).toHaveLength(1);
    expect(d.history).toHaveLength(1);
    expect(parseDetail({ ...base, ranks: { daily: ranks.daily } })).toBeNull();
  });
});
