/**
 * Spotlight and Sponsor rules. Pure functions only: no clock, no storage, no network.
 * Every function that depends on "now" takes it as an argument so it can be tested at any boundary.
 * All money is integer US cents. All hour and day boundaries are UTC.
 */
import { BOARD_CATEGORIES, RULES, SPONSOR, SPOTLIGHT } from "@/lib/board/config";
import { checkListingUrl, checkText, type ListingErrors, type ListingFields, type UrlCheck } from "@/lib/board/listing";
import type { PurchaseErrorCode, UnitKind } from "./types";

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const UNIT_MS: Record<UnitKind, number> = { hour: HOUR_MS, day: DAY_MS };

/** Longest headline shown on the homepage strip. */
export const HEADLINE_MAX = 60;
/** Most hours in one purchase (two full days). */
export const MAX_SLOTS_PER_PURCHASE = 48;
/** Most sponsor days in one purchase (the whole horizon). */
export const MAX_DAYS_PER_PURCHASE = SPONSOR.horizonDays;

export interface BundleTier {
  /** Units in one purchase needed to unlock this tier. */
  minCount: number;
  /** Percent off the cart subtotal. */
  percent: number;
}

/**
 * Bundle discounts for Spotlight hours, applied to the whole cart.
 * 3 or more hours in one purchase: 10% off. 6 or more: 15% off. The best matching tier applies (they do not stack).
 */
export const SPOTLIGHT_BUNDLE_TIERS: readonly BundleTier[] = [
  { minCount: 3, percent: 10 },
  { minCount: 6, percent: 15 },
];

/**
 * Multi-day discounts for Sponsor days.
 * 3 or more days in one purchase: 10% off. 7 or more: 15% off. The best matching tier applies.
 */
export const SPONSOR_BUNDLE_TIERS: readonly BundleTier[] = [
  { minCount: 3, percent: 10 },
  { minCount: 7, percent: 15 },
];

export const BUNDLE_TIERS: Record<UnitKind, readonly BundleTier[]> = {
  hour: SPOTLIGHT_BUNDLE_TIERS,
  day: SPONSOR_BUNDLE_TIERS,
};

/* ---------------------------------------------------------------- time */

export const hourStart = (ms: number): number => Math.floor(ms / HOUR_MS) * HOUR_MS;
export const dayStart = (ms: number): number => Math.floor(ms / DAY_MS) * DAY_MS;
export const unitStart = (kind: UnitKind, ms: number): number => (kind === "hour" ? hourStart(ms) : dayStart(ms));

/** True for a finite, safe integer exactly on an hour (or day) boundary. */
export function isAligned(kind: UnitKind, ms: number): boolean {
  return Number.isSafeInteger(ms) && ms % UNIT_MS[kind] === 0;
}

/** Bookable window: from 00:00 UTC today (earlier hours are already past) to the end of the horizon, exclusive. */
export function horizon(kind: UnitKind, now: number): { start: number; end: number } {
  const start = dayStart(now);
  const days = kind === "hour" ? SPOTLIGHT.horizonDays : SPONSOR.horizonDays;
  return { start, end: start + days * DAY_MS };
}

/** UTC hour of day (0-23) for an hour start. */
export const utcHour = (slot: number): number => Math.floor((((slot % DAY_MS) + DAY_MS) % DAY_MS) / HOUR_MS);

/* ---------------------------------------------------------------- price */

export function isPrimeHour(hourUtc: number): boolean {
  return hourUtc >= SPOTLIGHT.primeStartHourUtc && hourUtc < SPOTLIGHT.primeEndHourUtc;
}

export const isPrimeSlot = (slot: number): boolean => isPrimeHour(utcHour(slot));

/** Price of one Spotlight hour: the prime rate inside [primeStartHourUtc, primeEndHourUtc), else the base rate. */
export function slotPriceCents(slot: number): number {
  return isPrimeSlot(slot) ? SPOTLIGHT.primeCents : SPOTLIGHT.baseCents;
}

/** Price of one unit (a Spotlight hour, or a Sponsor day). */
export function unitPriceCents(kind: UnitKind, start: number): number {
  return kind === "hour" ? slotPriceCents(start) : SPONSOR.dayCents;
}

/* ------------------------------------------------------------ discounts */

/** The best tier a purchase of `count` units qualifies for (highest percent), or null. */
export function bestTier(count: number, tiers: readonly BundleTier[]): BundleTier | null {
  let best: BundleTier | null = null;
  for (const t of tiers) {
    if (count >= t.minCount && (!best || t.percent > best.percent)) best = t;
  }
  return best;
}

/** The nearest tier not yet reached, with how many more units unlock it, or null if already at the top. */
export function nextTier(count: number, tiers: readonly BundleTier[]): { tier: BundleTier; moreNeeded: number } | null {
  let next: BundleTier | null = null;
  for (const t of tiers) {
    if (count < t.minCount && (!next || t.minCount < next.minCount)) next = t;
  }
  return next ? { tier: next, moreNeeded: next.minCount - count } : null;
}

/**
 * Discount on a subtotal: percent of the subtotal rounded DOWN to a whole cent. Rounding down means the buyer
 * is never charged less than (subtotal minus the exact discount), and the total is never below zero.
 */
export function discountCents(subtotalCents: number, percent: number): number {
  if (!(subtotalCents > 0) || !(percent > 0)) return 0;
  return Math.min(subtotalCents, Math.floor((subtotalCents * percent) / 100));
}

export interface CartLine {
  start: number;
  priceCents: number;
  prime: boolean;
}

export interface CartQuote {
  kind: UnitKind;
  count: number;
  lines: CartLine[];
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  /** Next discount tier and how many more units unlock it. */
  next: { tier: BundleTier; moreNeeded: number } | null;
}

/** Price a cart. Duplicates are ignored and lines are sorted by time. Does not check availability. */
export function quoteCart(kind: UnitKind, units: readonly number[]): CartQuote {
  const sorted = Array.from(new Set(units)).sort((a, b) => a - b);
  const lines = sorted.map((start) => ({
    start,
    priceCents: unitPriceCents(kind, start),
    prime: kind === "hour" && isPrimeSlot(start),
  }));
  const subtotalCents = lines.reduce((s, l) => s + l.priceCents, 0);
  const tiers = BUNDLE_TIERS[kind];
  const tier = bestTier(lines.length, tiers);
  const discount = discountCents(subtotalCents, tier?.percent ?? 0);
  return {
    kind,
    count: lines.length,
    lines,
    subtotalCents,
    discountPercent: tier?.percent ?? 0,
    discountCents: discount,
    totalCents: subtotalCents - discount,
    next: nextTier(lines.length, tiers),
  };
}

/* --------------------------------------------------------- availability */

export type UnitState = "open" | "booked" | "past" | "beyond";

/**
 * State of one unit. A unit is "past" once its hour (or day) has started, even if nobody booked it.
 * Past wins over booked so a started hour can never be sold, and beyond means outside the horizon.
 */
export function unitState(kind: UnitKind, start: number, now: number, booked: ReadonlySet<number>): UnitState {
  if (start <= now) return "past";
  if (start >= horizon(kind, now).end) return "beyond";
  return booked.has(start) ? "booked" : "open";
}

export type UnitCheck =
  | { ok: true; units: number[] }
  | { ok: false; code: PurchaseErrorCode; error: string; units: number[] };

/**
 * Atomic validation of a whole purchase: either every unit is bookable or the purchase is rejected.
 * `units` in a failure lists the offending units (empty when the problem is the purchase as a whole).
 */
export function checkUnits(kind: UnitKind, units: readonly number[], now: number, booked: ReadonlySet<number>): UnitCheck {
  const noun = kind === "hour" ? "hour" : "day";
  const max = kind === "hour" ? MAX_SLOTS_PER_PURCHASE : MAX_DAYS_PER_PURCHASE;
  if (!Array.isArray(units) || units.length === 0) return { ok: false, code: "empty", error: `Pick at least one ${noun}.`, units: [] };

  const bad = units.filter((u) => typeof u !== "number" || !isAligned(kind, u));
  if (bad.length) return { ok: false, code: "invalid", error: `One of the ${noun}s is not a valid ${noun} start.`, units: [] };

  const unique = Array.from(new Set(units)).sort((a, b) => a - b);
  if (unique.length !== units.length) return { ok: false, code: "duplicate", error: `Each ${noun} can only be picked once.`, units: [] };
  if (unique.length > max) return { ok: false, code: "too_many", error: `You can book up to ${max} ${noun}s at a time.`, units: [] };

  const states = unique.map((u) => ({ u, s: unitState(kind, u, now, booked) }));
  const past = states.filter((x) => x.s === "past").map((x) => x.u);
  if (past.length) {
    return { ok: false, code: "past", error: `${past.length === 1 ? `That ${noun} has` : `Some of those ${noun}s have`} already started and cannot be booked.`, units: past };
  }
  const beyond = states.filter((x) => x.s === "beyond").map((x) => x.u);
  if (beyond.length) {
    const days = kind === "hour" ? SPOTLIGHT.horizonDays : SPONSOR.horizonDays;
    return { ok: false, code: "beyond", error: `You can only book up to ${days} days ahead.`, units: beyond };
  }
  const taken = states.filter((x) => x.s === "booked").map((x) => x.u);
  if (taken.length) {
    return { ok: false, code: "conflict", error: `${taken.length === 1 ? `That ${noun} was` : `Some of those ${noun}s were`} just booked by someone else.`, units: taken };
  }
  return { ok: true, units: unique };
}

/**
 * The next `count` open units after now, in time order, optionally only prime hours. Used for one-tap quick picks.
 * `onlyOn` restricts to units starting inside [from, to).
 */
export function nextOpenUnits(
  kind: UnitKind,
  count: number,
  now: number,
  booked: ReadonlySet<number>,
  opts: { primeOnly?: boolean; from?: number; to?: number } = {},
): number[] {
  const { end } = horizon(kind, now);
  const step = UNIT_MS[kind];
  const first = unitStart(kind, now) + step;
  const out: number[] = [];
  for (let t = Math.max(first, opts.from ?? 0); t < end && out.length < count; t += step) {
    if (opts.to !== undefined && t >= opts.to) break;
    if (opts.primeOnly && !isPrimeSlot(t)) continue;
    if (unitState(kind, t, now, booked) === "open") out.push(t);
  }
  return out;
}

/** Cheapest price among bookable units, or null if everything in the horizon is taken or past. */
export function cheapestOpenCents(kind: UnitKind, now: number, booked: ReadonlySet<number>): number | null {
  const { end } = horizon(kind, now);
  const step = UNIT_MS[kind];
  let best: number | null = null;
  for (let t = unitStart(kind, now) + step; t < end; t += step) {
    if (unitState(kind, t, now, booked) !== "open") continue;
    const p = unitPriceCents(kind, t);
    if (best === null || p < best) best = p;
  }
  return best;
}

/** Group sorted units into runs of consecutive units. [1h,2h,3h,5h] -> [[1h,2h,3h],[5h]]. */
export function groupRuns(units: readonly number[], step: number): number[][] {
  const sorted = Array.from(new Set(units)).sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const u of sorted) {
    const last = runs[runs.length - 1];
    if (last && u - last[last.length - 1] === step) last.push(u);
    else runs.push([u]);
  }
  return runs;
}

/* ----------------------------------------------------------- validation */

export const HEADLINE_LABEL: Record<UnitKind, string> = { hour: "Headline", day: "Message" };

export interface BookingFormCheck {
  errors: ListingErrors;
  url?: UrlCheck & { ok: true };
}

/**
 * Validate the booking form. For Spotlight the "tagline" field is the headline (max 60).
 * For Sponsor it is the message (max SPONSOR.taglineMax) and the name is capped at SPONSOR.nameMax.
 */
export function validateBooking(kind: UnitKind, f: ListingFields): BookingFormCheck {
  const errors: ListingErrors = {};
  const urlCheck = checkListingUrl(f.url);
  if (!urlCheck.ok) errors.url = urlCheck.error;
  const nameMax = kind === "hour" ? RULES.nameMax : SPONSOR.nameMax;
  const n = checkText(f.name, "Name", nameMax);
  if (n) errors.name = n;
  const headlineMax = kind === "hour" ? HEADLINE_MAX : SPONSOR.taglineMax;
  const t = checkText(f.tagline, HEADLINE_LABEL[kind], headlineMax, 3);
  if (t) errors.tagline = t;
  if (!f.category || !(BOARD_CATEGORIES as readonly string[]).includes(f.category)) errors.category = "Choose a category.";
  return { errors, url: urlCheck.ok ? urlCheck : undefined };
}
