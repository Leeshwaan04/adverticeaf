/**
 * The Throne rules. Pure functions only: no clock, no storage, no randomness.
 * Every caller passes `now` (epoch ms) so behaviour is exact and testable.
 * All money is integer US cents. All arithmetic that decides a price uses integer maths.
 */
import { RULES, THRONE } from "@/lib/board/config";
import type { Listing } from "@/lib/board/types";
import { usd2 } from "./format";
import type { Reign, ThroneData, ThroneState, TimeLeaderRow, TimeWindow } from "./types";

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
export const DECAY_MS = THRONE.decayHours * HOUR_MS;

export const INITIAL_STATE: ThroneState = { holder: null, lastTakeAt: null, startPriceCents: THRONE.openingCents };
export const INITIAL_DATA: ThroneData = { state: INITIAL_STATE, reigns: [] };

/** Exact integer division for non-negative integers (floating point division can misround large products). */
const floorDiv = (n: number, d: number) => (n - (n % d)) / d;
const ceilDiv = (n: number, d: number) => floorDiv(n + d - 1, d);

/**
 * Current price. Linear decay from the starting price to the floor over THRONE.decayHours, in whole cents,
 * never above the start and never below the floor. The decay is rounded down, so the price is rounded up:
 * the displayed price is never lower than the true line. Before the first take it is the flat opening price.
 */
export function priceAt(state: ThroneState, now: number): number {
  const floor = THRONE.floorCents;
  const start = Math.max(state.startPriceCents, floor);
  if (state.lastTakeAt === null) return start;
  const elapsed = Math.max(0, now - state.lastTakeAt);
  if (elapsed >= DECAY_MS) return floor;
  return start - floorDiv((start - floor) * elapsed, DECAY_MS);
}

/** Round up to a whole dollar. */
export const ceilToDollar = (cents: number) => ceilDiv(cents, 100) * 100;

/**
 * The starting price after someone pays `paidCents`: raised by THRONE.raisePercent, rounded UP to a whole dollar,
 * never below THRONE.openingCents.
 */
export function nextStartCents(paidCents: number): number {
  const raised = ceilDiv(paidCents * (100 + THRONE.raisePercent), 100);
  return Math.max(ceilToDollar(raised), THRONE.openingCents);
}

/**
 * The next whole-dollar level the price will fall to, and the exact instant it gets there.
 * null when the price is already at the floor or the throne has never been taken (flat opening price).
 */
export function nextDollarDrop(state: ThroneState, now: number): { priceCents: number; atMs: number } | null {
  if (state.lastTakeAt === null) return null;
  const floor = THRONE.floorCents;
  const start = Math.max(state.startPriceCents, floor);
  const price = priceAt(state, now);
  if (price <= floor) return null;
  const target = Math.max(price % 100 === 0 ? price - 100 : price - (price % 100), floor);
  const needed = start - target; // cents of decay required
  const range = start - floor;
  return { priceCents: target, atMs: state.lastTakeAt + ceilDiv(needed * DECAY_MS, range) };
}

/** Price points for the chart: from `now` for `hours`, evenly spaced, as if nobody takes the throne. */
export function priceCurve(state: ThroneState, now: number, hours = 24, steps = 48): { atMs: number; priceCents: number }[] {
  const span = hours * HOUR_MS;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const atMs = now + Math.round((span * i) / steps);
    return { atMs, priceCents: priceAt(state, atMs) };
  });
}

/** The same curve if someone paid the current price right now: starts at nextStartCents and decays from there. */
export function priceCurveAfterTake(state: ThroneState, now: number, hours = 24, steps = 48): { atMs: number; priceCents: number }[] {
  const after: ThroneState = { holder: state.holder, lastTakeAt: now, startPriceCents: nextStartCents(priceAt(state, now)) };
  return priceCurve(after, now, hours, steps);
}

export function reignDurationMs(reign: Reign, now: number): number {
  return Math.max(0, Math.min(reign.endedAt ?? now, now) - reign.startedAt);
}

/** What the buyer sees when they lose the race. */
export function priceChangedMessage(currentCents: number): string {
  return `The price changed to ${usd2(currentCents)}. Someone took the throne while you were checking out, so the price went up. Nothing was charged.`;
}

export type TakeDecision =
  | { ok: true; chargedCents: number; nextStartCents: number; data: ThroneData; reign: Reign; closed: Reign | null }
  | { ok: false; code: "price_changed" | "already_holder" | "invalid_request"; error: string; currentPriceCents: number };

/**
 * Apply a purchase to the throne. The decision is atomic: either the whole new state comes back or nothing does.
 *  - The holder cannot retake while holding.
 *  - expectedPriceCents is the price the buyer saw and is an UPPER BOUND. If the current price is lower the
 *    buyer pays the lower price. If it is higher (someone else took the throne meanwhile) the take is rejected.
 *  - On success the previous reign closes at `now` and the next starting price is nextStartCents(charged).
 */
export function applyTake(
  data: ThroneData,
  req: { listing: Listing; expectedPriceCents: number },
  now: number,
  reignId: string,
  opts: { sample?: boolean } = {},
): TakeDecision {
  const current = priceAt(data.state, now);
  if (!Number.isSafeInteger(req.expectedPriceCents) || req.expectedPriceCents < THRONE.floorCents || req.expectedPriceCents > RULES.maxBidCents) {
    return { ok: false, code: "invalid_request", error: "That price is not valid. Reload the page and try again.", currentPriceCents: current };
  }
  if (data.state.holder && data.state.holder.domain === req.listing.domain) {
    return {
      ok: false,
      code: "already_holder",
      error: "This listing already holds the throne. You can take it back after someone else does.",
      currentPriceCents: current,
    };
  }
  if (current > req.expectedPriceCents) {
    return { ok: false, code: "price_changed", error: priceChangedMessage(current), currentPriceCents: current };
  }

  const startedAt = Math.max(now, data.state.lastTakeAt ?? now);
  const reign: Reign = { id: reignId, listing: req.listing, startedAt, endedAt: null, pricePaidCents: current, ...(opts.sample ? { sample: true } : {}) };
  const open = data.reigns.find((r) => r.endedAt === null);
  const closed: Reign | null = open ? { ...open, endedAt: Math.max(startedAt, open.startedAt) } : null;
  const previous = data.reigns.map((r) => (closed && r.id === closed.id ? closed : r));
  const next = nextStartCents(current);
  return {
    ok: true,
    chargedCents: current,
    nextStartCents: next,
    reign,
    closed,
    data: { state: { holder: req.listing, lastTakeAt: startedAt, startPriceCents: next }, reigns: [reign, ...previous] },
  };
}

/** Start of the UTC window containing `now`. Weeks start on Monday. */
export function windowStart(window: TimeWindow, now: number): number {
  if (window === "all") return 0;
  const dayStart = Math.floor(now / DAY_MS) * DAY_MS;
  if (window === "day") return dayStart;
  const sinceMonday = (new Date(dayStart).getUTCDay() + 6) % 7; // Monday 0 ... Sunday 6
  return dayStart - sinceMonday * DAY_MS;
}

/**
 * Time on the throne per listing inside the window. Reigns are clipped to [windowStart, now]; an ongoing reign
 * counts up to `now`. Ties go to the older listing, then the key, so the order is stable.
 */
export function timeLeaderboard(reigns: readonly Reign[], window: TimeWindow, now: number): TimeLeaderRow[] {
  const from = windowStart(window, now);
  const byListing = new Map<string, { listing: Listing; ms: number; count: number; holding: boolean }>();
  for (const r of reigns) {
    const ms = Math.max(0, Math.min(r.endedAt ?? now, now) - Math.max(r.startedAt, from));
    if (ms <= 0) continue;
    const row = byListing.get(r.listing.domain) ?? { listing: r.listing, ms: 0, count: 0, holding: false };
    row.ms += ms;
    row.count += 1;
    row.holding ||= r.endedAt === null;
    byListing.set(r.listing.domain, row);
  }
  return [...byListing.values()]
    .sort((a, b) => b.ms - a.ms || a.listing.createdAt - b.listing.createdAt || a.listing.domain.localeCompare(b.listing.domain))
    .map((r, i) => ({ rank: i + 1, listing: r.listing, totalMs: r.ms, reigns: r.count, holdingNow: r.holding }));
}

/** "$3", "3.50" or "$3.5" to cents. null for anything else (negative, 3 decimals, text, empty). */
export function parseDollarsToCents(input: string): number | null {
  const m = /^\$?(\d{1,7})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export function checkThresholdCents(cents: number | null): string | undefined {
  if (cents === null) return "Enter an amount like 3 or 2.50.";
  if (cents < THRONE.floorCents) return `The price never goes below ${usd2(THRONE.floorCents)}. Choose ${usd2(THRONE.floorCents)} or more.`;
  if (cents > RULES.maxBidCents) return "That amount is too large.";
  return undefined;
}

export function checkEmail(email: string): string | undefined {
  const v = email.trim();
  if (!v) return "Enter your email address.";
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That email address does not look right.";
  return undefined;
}
