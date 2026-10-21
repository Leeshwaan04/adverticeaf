import { describe, expect, it } from "vitest";
import { THRONE } from "@/lib/board/config";
import type { Listing } from "@/lib/board/types";
import {
  DAY_MS, DECAY_MS, HOUR_MS, INITIAL_DATA, INITIAL_STATE, applyTake, checkEmail, checkThresholdCents, nextDollarDrop,
  nextStartCents, parseDollarsToCents, priceAt, priceCurve, priceCurveAfterTake, reignDurationMs, timeLeaderboard, windowStart,
} from "./rules";
import type { Reign, ThroneState } from "./types";

const listing = (domain: string, createdAt = 1_700_000_000_000): Listing => ({
  domain, name: domain, url: `https://${domain}`, category: "Other", tagline: "A sample listing", createdAt, verified: false, sample: true,
});
const A = listing("a.example");
const B = listing("b.example");
const C = listing("c.example");

const T0 = Date.UTC(2026, 9, 20, 12, 0, 0); // Tue 2026-10-20 12:00 UTC
const state = (start: number, at: number | null = T0, holder: Listing | null = A): ThroneState => ({ holder, lastTakeAt: at, startPriceCents: start });

describe("priceAt", () => {
  it("is exactly the starting price the instant after a take", () => {
    expect(priceAt(state(700), T0)).toBe(700);
  });
  it("is the flat opening price before anyone has taken it, however late it is", () => {
    expect(priceAt(INITIAL_STATE, T0)).toBe(THRONE.openingCents);
    expect(priceAt(INITIAL_STATE, T0 + 10 * DECAY_MS)).toBe(THRONE.openingCents);
  });
  it("decays linearly to the floor", () => {
    expect(priceAt(state(700), T0 + DECAY_MS / 2)).toBe(400); // 700 - 600/2
    expect(priceAt(state(700), T0 + DECAY_MS / 4)).toBe(550);
  });
  it("hits the floor exactly at the end of the decay and stays there", () => {
    expect(priceAt(state(700), T0 + DECAY_MS - 1)).toBe(THRONE.floorCents + 1); // still above the floor 1 ms early
    expect(priceAt(state(700), T0 + DECAY_MS)).toBe(THRONE.floorCents);
    expect(priceAt(state(700), T0 + DECAY_MS * 5)).toBe(THRONE.floorCents);
  });
  it("rounds the price up to whole cents (decay is rounded down)", () => {
    // start 500, floor 100: 400 cents over 24h = 16.666.. cents per hour
    expect(priceAt(state(500), T0 + HOUR_MS)).toBe(484);
    expect(priceAt(state(500), T0 + 2 * HOUR_MS)).toBe(467); // 33.33 decayed -> 33
    expect(Number.isInteger(priceAt(state(999), T0 + 12_345_678))).toBe(true);
  });
  it("never goes above the start or below the floor, even with a clock that runs backwards", () => {
    expect(priceAt(state(700), T0 - 5 * HOUR_MS)).toBe(700);
    expect(priceAt(state(10), T0)).toBe(THRONE.floorCents); // a corrupt start below the floor is clamped
  });
  it("never rises over time (sampled)", () => {
    const s = state(1300);
    let prev = Infinity;
    for (let ms = 0; ms <= DECAY_MS + HOUR_MS; ms += 97_531) {
      const p = priceAt(s, T0 + ms);
      expect(p).toBeLessThanOrEqual(prev);
      expect(p).toBeGreaterThanOrEqual(THRONE.floorCents);
      expect(p).toBeLessThanOrEqual(1300);
      prev = p;
    }
  });
});

describe("nextStartCents", () => {
  it("raises by the configured percent and rounds UP to a whole dollar", () => {
    expect(nextStartCents(500)).toBe(700); // 625 -> 700
    expect(nextStartCents(2000)).toBe(2500); // exactly 2500 stays
    expect(nextStartCents(401)).toBe(600); // 501.25 -> 502 -> 600
    expect(nextStartCents(4001)).toBe(5100); // 5001.25 -> 5002 -> 5100
  });
  it("is never below the opening price", () => {
    expect(nextStartCents(THRONE.floorCents)).toBe(THRONE.openingCents);
    expect(nextStartCents(300)).toBe(THRONE.openingCents); // 375 -> 400 -> lifted to 500
  });
  it("is always a whole dollar", () => {
    for (const p of [100, 101, 137, 999, 1234, 5555, 99_999]) expect(nextStartCents(p) % 100).toBe(0);
  });
});

describe("nextDollarDrop", () => {
  it("finds the exact instant the price reaches the next whole dollar", () => {
    const s = state(700);
    const d = nextDollarDrop(s, T0);
    expect(d).toEqual({ priceCents: 600, atMs: T0 + 4 * HOUR_MS });
    expect(priceAt(s, d!.atMs)).toBe(600);
    expect(priceAt(s, d!.atMs - 1)).toBe(601);
  });
  it("targets the level below when the price is already a whole dollar", () => {
    const s = state(700);
    expect(nextDollarDrop(s, T0 + 4 * HOUR_MS)?.priceCents).toBe(500);
  });
  it("targets the whole dollar just under a fractional price", () => {
    const s = state(700);
    const d = nextDollarDrop(s, T0 + HOUR_MS); // 700 - 25 = 675
    expect(d?.priceCents).toBe(600);
    expect(d!.atMs).toBeGreaterThan(T0 + HOUR_MS);
  });
  it("ends at the floor, then returns null", () => {
    const s = state(700);
    const last = nextDollarDrop(s, T0 + 20 * HOUR_MS); // price 700-500 = 200 -> next target 100
    expect(last).toEqual({ priceCents: THRONE.floorCents, atMs: T0 + DECAY_MS });
    expect(nextDollarDrop(s, T0 + DECAY_MS)).toBeNull();
  });
  it("is null before the first take", () => {
    expect(nextDollarDrop(INITIAL_STATE, T0)).toBeNull();
  });
  it("agrees with priceAt for every whole-dollar level (sampled)", () => {
    const s = state(1300);
    let now = T0;
    for (let i = 0; i < 20; i++) {
      const d = nextDollarDrop(s, now);
      if (!d) break;
      expect(priceAt(s, d.atMs)).toBeLessThanOrEqual(d.priceCents);
      expect(priceAt(s, d.atMs - 1)).toBeGreaterThan(d.priceCents);
      now = d.atMs;
    }
  });
});

describe("priceCurve", () => {
  it("starts at the current price and is non-increasing", () => {
    const pts = priceCurve(state(700), T0 + 2 * HOUR_MS, 24, 24);
    expect(pts).toHaveLength(25);
    expect(pts[0].priceCents).toBe(priceAt(state(700), T0 + 2 * HOUR_MS));
    expect(pts[24].priceCents).toBe(THRONE.floorCents);
    for (let i = 1; i < pts.length; i++) expect(pts[i].priceCents).toBeLessThanOrEqual(pts[i - 1].priceCents);
  });
  it("after a take now, starts at the next starting price", () => {
    const now = T0 + 4 * HOUR_MS; // price 600 -> next start 750 -> 800
    expect(priceCurveAfterTake(state(700), now)[0].priceCents).toBe(800);
  });
});

describe("applyTake", () => {
  const first = () => {
    const r = applyTake(INITIAL_DATA, { listing: A, expectedPriceCents: 500 }, T0, "r1");
    if (!r.ok) throw new Error("setup failed");
    return r;
  };

  it("opens the throne at the opening price and sets the next starting price", () => {
    const r = first();
    expect(r.chargedCents).toBe(500);
    expect(r.nextStartCents).toBe(700);
    expect(r.closed).toBeNull();
    expect(r.data.state).toEqual({ holder: A, lastTakeAt: T0, startPriceCents: 700 });
    expect(r.data.reigns).toEqual([{ id: "r1", listing: A, startedAt: T0, endedAt: null, pricePaidCents: 500 }]);
  });

  it("closes the previous reign with its duration and price paid", () => {
    const r1 = first();
    const at = T0 + 5 * HOUR_MS; // price = 700 - 125 = 575
    const r2 = applyTake(r1.data, { listing: B, expectedPriceCents: 700 }, at, "r2");
    if (!r2.ok) throw new Error("expected ok");
    expect(r2.closed).toMatchObject({ id: "r1", startedAt: T0, endedAt: at, pricePaidCents: 500 });
    expect(reignDurationMs(r2.closed!, at)).toBe(5 * HOUR_MS);
    expect(r2.data.reigns.map((r) => r.id)).toEqual(["r2", "r1"]);
    expect(r2.data.reigns.filter((r) => r.endedAt === null)).toHaveLength(1);
    expect(r2.data.state.holder).toBe(B);
  });

  it("charges the CURRENT price when it is lower than the price the buyer saw", () => {
    const r1 = first();
    const at = T0 + DECAY_MS / 2; // 700 -> 400
    const r2 = applyTake(r1.data, { listing: B, expectedPriceCents: 700 }, at, "r2");
    expect(r2.ok && r2.chargedCents).toBe(400);
    expect(r2.ok && r2.nextStartCents).toBe(500); // 400 * 1.25 = 500 exactly
  });

  it("accepts when the current price equals the expected price", () => {
    const r1 = first();
    const r2 = applyTake(r1.data, { listing: B, expectedPriceCents: 700 }, T0, "r2");
    expect(r2.ok && r2.chargedCents).toBe(700);
  });

  it("rejects with price_changed when someone else took it and the price rose", () => {
    const r1 = first(); // price now 700
    const r2 = applyTake(r1.data, { listing: B, expectedPriceCents: 500 }, T0 + 1000, "r2"); // buyer saw 500
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.code).toBe("price_changed");
      expect(r2.currentPriceCents).toBe(700); // 1s of decay is under a cent
    }
  });

  it("double take: two buyers saw the same price, only the first wins", () => {
    const seen = priceAt(INITIAL_DATA.state, T0);
    const a = applyTake(INITIAL_DATA, { listing: A, expectedPriceCents: seen }, T0, "r1");
    if (!a.ok) throw new Error("first take should win");
    const b = applyTake(a.data, { listing: B, expectedPriceCents: seen }, T0, "r2");
    expect(b.ok).toBe(false);
    expect(b.ok === false && b.code).toBe("price_changed");
    expect(b.ok === false && b.error).toContain("$7.00");
    // The losing attempt must not have changed anything.
    expect(a.data.reigns).toHaveLength(1);
    expect(a.data.state.holder).toBe(A);
  });

  it("the holder cannot retake while holding", () => {
    const r1 = first();
    const again = applyTake(r1.data, { listing: A, expectedPriceCents: 700 }, T0 + HOUR_MS, "r2");
    expect(again.ok).toBe(false);
    expect(again.ok === false && again.code).toBe("already_holder");
  });

  it("the holder can take it back after someone else has it", () => {
    const r1 = first();
    const r2 = applyTake(r1.data, { listing: B, expectedPriceCents: 700 }, T0 + HOUR_MS, "r2");
    if (!r2.ok) throw new Error("setup");
    const r3 = applyTake(r2.data, { listing: A, expectedPriceCents: r2.nextStartCents }, T0 + 2 * HOUR_MS, "r3");
    expect(r3.ok).toBe(true);
  });

  it("rejects invalid expected prices without touching state", () => {
    for (const bad of [0, -5, 99, 1.5, NaN, Infinity, 1e12]) {
      const r = applyTake(INITIAL_DATA, { listing: A, expectedPriceCents: bad }, T0, "x");
      expect(r.ok === false && r.code).toBe("invalid_request");
    }
  });

  it("can be taken for exactly the floor once the decay has finished", () => {
    const r1 = first();
    const r2 = applyTake(r1.data, { listing: B, expectedPriceCents: THRONE.floorCents }, T0 + DECAY_MS, "r2");
    expect(r2.ok && r2.chargedCents).toBe(THRONE.floorCents);
    expect(r2.ok && r2.nextStartCents).toBe(THRONE.openingCents);
  });

  it("does not mutate its input", () => {
    const r1 = first();
    const snapshot = JSON.stringify(r1.data);
    applyTake(r1.data, { listing: B, expectedPriceCents: 700 }, T0 + HOUR_MS, "r2");
    expect(JSON.stringify(r1.data)).toBe(snapshot);
  });
});

describe("windowStart", () => {
  const wed = Date.UTC(2026, 9, 21, 15, 30, 0); // Wed
  it("day is 00:00 UTC", () => {
    expect(windowStart("day", wed)).toBe(Date.UTC(2026, 9, 21));
  });
  it("week starts on Monday 00:00 UTC", () => {
    expect(windowStart("week", wed)).toBe(Date.UTC(2026, 9, 19));
    expect(windowStart("week", Date.UTC(2026, 9, 25, 23, 59, 59))).toBe(Date.UTC(2026, 9, 19)); // Sunday
    expect(windowStart("week", Date.UTC(2026, 9, 26, 0, 0, 0))).toBe(Date.UTC(2026, 9, 26)); // Monday midnight
    expect(windowStart("week", Date.UTC(2026, 9, 19, 0, 0, 0))).toBe(Date.UTC(2026, 9, 19));
  });
  it("day boundary is exact", () => {
    expect(windowStart("day", Date.UTC(2026, 9, 21, 0, 0, 0))).toBe(Date.UTC(2026, 9, 21));
    expect(windowStart("day", Date.UTC(2026, 9, 20, 23, 59, 59, 999))).toBe(Date.UTC(2026, 9, 20));
  });
  it("all time starts at zero", () => {
    expect(windowStart("all", wed)).toBe(0);
  });
});

describe("timeLeaderboard", () => {
  const reign = (id: string, l: Listing, startedAt: number, endedAt: number | null): Reign => ({ id, listing: l, startedAt, endedAt, pricePaidCents: 500 });
  const now = Date.UTC(2026, 9, 20, 3, 0, 0); // Tue 03:00

  it("counts an ongoing reign up to now, clipped at the window edge", () => {
    const reigns = [reign("r1", A, Date.UTC(2026, 9, 19, 22, 0, 0), null)]; // started Mon 22:00, 5h ago
    const day = timeLeaderboard(reigns, "day", now);
    const week = timeLeaderboard(reigns, "week", now);
    const all = timeLeaderboard(reigns, "all", now);
    expect(day[0].totalMs).toBe(3 * HOUR_MS); // only since Tue 00:00
    expect(week[0].totalMs).toBe(5 * HOUR_MS);
    expect(all[0].totalMs).toBe(5 * HOUR_MS);
    expect(day[0].holdingNow).toBe(true);
  });

  it("clips a closed reign that spans the window start and ignores one that ended exactly at it", () => {
    const midnight = Date.UTC(2026, 9, 20);
    const reigns = [
      reign("r2", B, midnight - 2 * HOUR_MS, midnight + HOUR_MS), // spans: 1h inside today
      reign("r1", C, midnight - 5 * HOUR_MS, midnight), // ends exactly at the edge: 0 today
    ];
    const day = timeLeaderboard(reigns, "day", now);
    expect(day.map((r) => [r.listing.domain, r.totalMs])).toEqual([["b.example", HOUR_MS]]);
    const all = timeLeaderboard(reigns, "all", now);
    expect(all.map((r) => r.listing.domain)).toEqual(["c.example", "b.example"]); // 5h vs 3h
  });

  it("sums several reigns per listing and counts them", () => {
    const noon = Date.UTC(2026, 9, 20, 12, 0, 0);
    const reigns = [
      reign("r3", A, noon - HOUR_MS, null), // 1h, ongoing
      reign("r2", B, noon - 5 * HOUR_MS, noon - HOUR_MS), // 4h
      reign("r1", A, noon - 7 * HOUR_MS, noon - 5 * HOUR_MS), // 2h
    ];
    const rows = timeLeaderboard(reigns, "day", noon);
    expect(rows.map((r) => [r.rank, r.listing.domain, r.totalMs, r.reigns, r.holdingNow])).toEqual([
      [1, "b.example", 4 * HOUR_MS, 1, false],
      [2, "a.example", 3 * HOUR_MS, 2, true],
    ]);
  });

  it("breaks ties in favour of the older listing, then the key", () => {
    const old = listing("old.example", 1_000);
    const young = listing("young.example", 2_000);
    const reigns = [reign("r2", young, now - 2 * HOUR_MS, now - HOUR_MS), reign("r1", old, now - 4 * HOUR_MS, now - 3 * HOUR_MS)];
    expect(timeLeaderboard(reigns, "all", now).map((r) => r.listing.domain)).toEqual(["old.example", "young.example"]);
    const same = [listing("zz.example", 5), listing("aa.example", 5)];
    const r2 = [reign("r2", same[0], now - 2 * HOUR_MS, now - HOUR_MS), reign("r1", same[1], now - 4 * HOUR_MS, now - 3 * HOUR_MS)];
    expect(timeLeaderboard(r2, "all", now).map((r) => r.listing.domain)).toEqual(["aa.example", "zz.example"]);
  });

  it("returns nothing when nobody has reigned in the window", () => {
    expect(timeLeaderboard([], "day", now)).toEqual([]);
    expect(timeLeaderboard([reign("r1", A, now - 3 * DAY_MS, now - 2 * DAY_MS)], "day", now)).toEqual([]);
  });
});

describe("input parsing", () => {
  it("parses dollars to cents", () => {
    expect(parseDollarsToCents("3")).toBe(300);
    expect(parseDollarsToCents("$2.5")).toBe(250);
    expect(parseDollarsToCents(" 2.05 ")).toBe(205);
    expect(parseDollarsToCents("0.99")).toBe(99);
  });
  it("rejects anything that is not a plain amount", () => {
    for (const bad of ["", "abc", "-3", "3.999", "1e3", "3,50", "$", "."]) expect(parseDollarsToCents(bad)).toBeNull();
  });
  it("threshold must be at least the floor", () => {
    expect(checkThresholdCents(null)).toBeTruthy();
    expect(checkThresholdCents(99)).toContain("$1.00");
    expect(checkThresholdCents(100)).toBeUndefined();
    expect(checkThresholdCents(1e12)).toBeTruthy();
  });
  it("validates email shape and length", () => {
    expect(checkEmail("")).toBeTruthy();
    expect(checkEmail("nobody")).toBeTruthy();
    expect(checkEmail("a b@c.com")).toBeTruthy();
    expect(checkEmail(`${"a".repeat(250)}@x.com`)).toBeTruthy();
    expect(checkEmail(" person@brand.example ")).toBeUndefined();
  });
});
