import { describe, expect, it } from "vitest";
import { SPONSOR, SPOTLIGHT } from "@/lib/board/config";
import {
  DAY_MS, HEADLINE_MAX, HOUR_MS, MAX_DAYS_PER_PURCHASE, MAX_SLOTS_PER_PURCHASE, SPONSOR_BUNDLE_TIERS, SPOTLIGHT_BUNDLE_TIERS,
  bestTier, checkUnits, cheapestOpenCents, dayStart, discountCents, groupRuns, horizon, hourStart, isAligned, nextOpenUnits, nextTier,
  quoteCart, slotPriceCents, unitPriceCents, unitState, utcHour, validateBooking,
} from "./rules";

// 2026-10-20 00:00:00 UTC
const D0 = Date.UTC(2026, 9, 20);
const at = (dayOffset: number, hour: number) => D0 + dayOffset * DAY_MS + hour * HOUR_MS;
const NONE = new Set<number>();

describe("time helpers", () => {
  it("floors to UTC hour and day", () => {
    const t = at(0, 14) + 37 * 60_000 + 12_345;
    expect(hourStart(t)).toBe(at(0, 14));
    expect(dayStart(t)).toBe(D0);
    expect(hourStart(at(0, 14))).toBe(at(0, 14));
  });
  it("reads the UTC hour of a slot", () => {
    expect(utcHour(at(0, 0))).toBe(0);
    expect(utcHour(at(3, 23))).toBe(23);
    expect(utcHour(at(5, 12))).toBe(12);
  });
  it("checks alignment", () => {
    expect(isAligned("hour", at(0, 5))).toBe(true);
    expect(isAligned("hour", at(0, 5) + 1)).toBe(false);
    expect(isAligned("hour", Number.NaN)).toBe(false);
    expect(isAligned("hour", 1.5 * HOUR_MS)).toBe(false);
    expect(isAligned("day", at(2, 0))).toBe(true);
    expect(isAligned("day", at(2, 1))).toBe(false);
  });
  it("horizon starts at 00:00 UTC today and spans the configured days", () => {
    const h = horizon("hour", at(0, 17) + 5);
    expect(h.start).toBe(D0);
    expect(h.end).toBe(D0 + SPOTLIGHT.horizonDays * DAY_MS);
    expect(horizon("day", at(0, 3)).end).toBe(D0 + SPONSOR.horizonDays * DAY_MS);
  });
});

describe("slotPriceCents at every boundary hour", () => {
  const { primeStartHourUtc: s, primeEndHourUtc: e, baseCents, primeCents } = SPOTLIGHT;
  it("is base before prime starts", () => {
    expect(slotPriceCents(at(0, s - 1))).toBe(baseCents);
  });
  it("is prime on the first prime hour", () => {
    expect(slotPriceCents(at(0, s))).toBe(primeCents);
  });
  it("is prime on the last prime hour", () => {
    expect(slotPriceCents(at(0, e - 1))).toBe(primeCents);
  });
  it("is base on the end hour (exclusive)", () => {
    expect(slotPriceCents(at(0, e))).toBe(baseCents);
  });
  it("is base at midnight and 23:00", () => {
    expect(slotPriceCents(at(0, 0))).toBe(baseCents);
    expect(slotPriceCents(at(4, 23))).toBe(baseCents);
  });
  it("prices all 24 hours consistently on any day", () => {
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        expect(slotPriceCents(at(d, h))).toBe(h >= s && h < e ? primeCents : baseCents);
      }
    }
  });
  it("sponsor days cost the flat day rate", () => {
    expect(unitPriceCents("day", at(3, 0))).toBe(SPONSOR.dayCents);
    expect(unitPriceCents("hour", at(3, 12))).toBe(primeCents);
  });
});

describe("bundle tiers", () => {
  it("proposes 3+ hours at 10% and 6+ hours at 15%", () => {
    expect(SPOTLIGHT_BUNDLE_TIERS).toEqual([{ minCount: 3, percent: 10 }, { minCount: 6, percent: 15 }]);
    expect(SPONSOR_BUNDLE_TIERS).toEqual([{ minCount: 3, percent: 10 }, { minCount: 7, percent: 15 }]);
  });
  it("picks the best tier at each boundary and never stacks", () => {
    expect(bestTier(0, SPOTLIGHT_BUNDLE_TIERS)).toBeNull();
    expect(bestTier(2, SPOTLIGHT_BUNDLE_TIERS)).toBeNull();
    expect(bestTier(3, SPOTLIGHT_BUNDLE_TIERS)?.percent).toBe(10);
    expect(bestTier(5, SPOTLIGHT_BUNDLE_TIERS)?.percent).toBe(10);
    expect(bestTier(6, SPOTLIGHT_BUNDLE_TIERS)?.percent).toBe(15);
    expect(bestTier(48, SPOTLIGHT_BUNDLE_TIERS)?.percent).toBe(15);
    expect(bestTier(6, SPONSOR_BUNDLE_TIERS)?.percent).toBe(10);
    expect(bestTier(7, SPONSOR_BUNDLE_TIERS)?.percent).toBe(15);
  });
  it("reports the next tier and how many more units unlock it", () => {
    expect(nextTier(1, SPOTLIGHT_BUNDLE_TIERS)).toEqual({ tier: { minCount: 3, percent: 10 }, moreNeeded: 2 });
    expect(nextTier(3, SPOTLIGHT_BUNDLE_TIERS)).toEqual({ tier: { minCount: 6, percent: 15 }, moreNeeded: 3 });
    expect(nextTier(6, SPOTLIGHT_BUNDLE_TIERS)).toBeNull();
  });
  it("rounds the discount down to a whole cent and never exceeds the subtotal", () => {
    expect(discountCents(5000, 10)).toBe(500);
    expect(discountCents(1005, 10)).toBe(100); // 100.5 floors to 100
    expect(discountCents(1, 15)).toBe(0);
    expect(discountCents(199, 15)).toBe(29); // 29.85 floors to 29
    expect(discountCents(0, 15)).toBe(0);
    expect(discountCents(-5, 15)).toBe(0);
    expect(discountCents(1000, 0)).toBe(0);
    expect(discountCents(1000, 150)).toBe(1000);
  });
  it("never charges below the subtotal minus the exact discount", () => {
    for (const subtotal of [1, 7, 99, 101, 1005, 4999, 12_345]) {
      for (const percent of [10, 15]) {
        const d = discountCents(subtotal, percent);
        expect(subtotal - d).toBeGreaterThanOrEqual(subtotal - (subtotal * percent) / 100);
        expect(Number.isInteger(subtotal - d)).toBe(true);
      }
    }
  });
});

describe("quoteCart", () => {
  const { baseCents: B, primeCents: P } = SPOTLIGHT;
  it("prices a single hour with no discount", () => {
    const q = quoteCart("hour", [at(1, 13)]);
    expect(q).toMatchObject({ count: 1, subtotalCents: P, discountPercent: 0, discountCents: 0, totalCents: P });
    expect(q.next).toEqual({ tier: { minCount: 3, percent: 10 }, moreNeeded: 2 });
  });
  it("two hours get no discount", () => {
    expect(quoteCart("hour", [at(1, 10), at(1, 11)]).totalCents).toBe(2 * B);
  });
  it("three hours across the prime boundary get 10% off the mixed subtotal", () => {
    const q = quoteCart("hour", [at(1, 11), at(1, 12), at(1, 13)]);
    expect(q.subtotalCents).toBe(B + 2 * P);
    expect(q.discountPercent).toBe(10);
    expect(q.discountCents).toBe(Math.floor(((B + 2 * P) * 10) / 100));
    expect(q.totalCents).toBe(B + 2 * P - q.discountCents);
  });
  it("six prime hours get 15% off", () => {
    const hours = [12, 13, 14, 15, 16, 17].map((h) => at(2, h));
    const q = quoteCart("hour", hours);
    expect(q.subtotalCents).toBe(6 * P);
    expect(q.discountPercent).toBe(15);
    expect(q.totalCents).toBe(6 * P - Math.floor((6 * P * 15) / 100));
    expect(q.next).toBeNull();
    expect(q.lines.every((l) => l.prime)).toBe(true);
  });
  it("sorts lines, ignores duplicates and marks prime lines", () => {
    const q = quoteCart("hour", [at(1, 20), at(1, 19), at(1, 19)]);
    expect(q.lines.map((l) => l.start)).toEqual([at(1, 19), at(1, 20)]);
    expect(q.lines.map((l) => l.prime)).toEqual([true, false]);
  });
  it("prices sponsor days with the multi-day discount", () => {
    const d = (n: number) => D0 + n * DAY_MS;
    expect(quoteCart("day", [d(1), d(2)]).totalCents).toBe(2 * SPONSOR.dayCents);
    const three = quoteCart("day", [d(1), d(2), d(3)]);
    expect(three.discountPercent).toBe(10);
    expect(three.totalCents).toBe(3 * SPONSOR.dayCents - Math.floor((3 * SPONSOR.dayCents * 10) / 100));
    const seven = quoteCart("day", [1, 2, 3, 4, 5, 6, 7].map(d));
    expect(seven.discountPercent).toBe(15);
    expect(seven.totalCents).toBe(7 * SPONSOR.dayCents - Math.floor((7 * SPONSOR.dayCents * 15) / 100));
  });
  it("an empty cart costs nothing", () => {
    expect(quoteCart("hour", [])).toMatchObject({ count: 0, subtotalCents: 0, totalCents: 0, discountCents: 0 });
  });
});

describe("unitState and past-slot rejection", () => {
  const now = at(0, 14) + 20 * 60_000; // 14:20
  it("a slot is past the instant its hour starts", () => {
    expect(unitState("hour", at(0, 14), now, NONE)).toBe("past");
    expect(unitState("hour", at(0, 14), at(0, 14), NONE)).toBe("past"); // exactly on the boundary
  });
  it("the next hour is open until it starts, down to the last millisecond", () => {
    expect(unitState("hour", at(0, 15), now, NONE)).toBe("open");
    expect(unitState("hour", at(0, 15), at(0, 15) - 1, NONE)).toBe("open");
    expect(unitState("hour", at(0, 15), at(0, 15), NONE)).toBe("past");
  });
  it("earlier hours today are past even if nobody booked them", () => {
    expect(unitState("hour", at(0, 3), now, NONE)).toBe("past");
  });
  it("past wins over booked", () => {
    expect(unitState("hour", at(0, 9), now, new Set([at(0, 9)]))).toBe("past");
  });
  it("the last hour of the horizon is open and the next one is beyond", () => {
    const end = horizon("hour", now).end;
    expect(unitState("hour", end - HOUR_MS, now, NONE)).toBe("open");
    expect(unitState("hour", end, now, NONE)).toBe("beyond");
  });
  it("booked slots report booked", () => {
    expect(unitState("hour", at(1, 12), now, new Set([at(1, 12)]))).toBe("booked");
  });
  it("sponsor today is already started, tomorrow is bookable, day 14 is beyond", () => {
    expect(unitState("day", D0, now, NONE)).toBe("past");
    expect(unitState("day", D0 + DAY_MS, now, NONE)).toBe("open");
    expect(unitState("day", D0 + (SPONSOR.horizonDays - 1) * DAY_MS, now, NONE)).toBe("open");
    expect(unitState("day", D0 + SPONSOR.horizonDays * DAY_MS, now, NONE)).toBe("beyond");
  });
});

describe("checkUnits (atomic, all or none)", () => {
  const now = at(0, 14) + 5_000;
  it("accepts a clean purchase and returns the units sorted", () => {
    const r = checkUnits("hour", [at(1, 12), at(0, 15)], now, NONE);
    expect(r).toEqual({ ok: true, units: [at(0, 15), at(1, 12)] });
  });
  it("rejects an empty cart", () => {
    expect(checkUnits("hour", [], now, NONE)).toMatchObject({ ok: false, code: "empty" });
  });
  it("rejects misaligned and non-integer starts", () => {
    expect(checkUnits("hour", [at(1, 12) + 1], now, NONE)).toMatchObject({ ok: false, code: "invalid" });
    expect(checkUnits("hour", [Number.NaN], now, NONE)).toMatchObject({ ok: false, code: "invalid" });
    expect(checkUnits("hour", [at(1, 12) + 0.5], now, NONE)).toMatchObject({ ok: false, code: "invalid" });
  });
  it("rejects duplicates so one hour can never be charged twice", () => {
    expect(checkUnits("hour", [at(1, 12), at(1, 12)], now, NONE)).toMatchObject({ ok: false, code: "duplicate" });
  });
  it("rejects more than the per-purchase maximum", () => {
    const many = Array.from({ length: MAX_SLOTS_PER_PURCHASE + 1 }, (_, i) => at(1, 0) + i * HOUR_MS);
    expect(checkUnits("hour", many, now, NONE)).toMatchObject({ ok: false, code: "too_many" });
    const ok = many.slice(0, MAX_SLOTS_PER_PURCHASE);
    expect(checkUnits("hour", ok, now, NONE).ok).toBe(true);
    const days = Array.from({ length: MAX_DAYS_PER_PURCHASE + 1 }, (_, i) => D0 + (i + 1) * DAY_MS);
    expect(checkUnits("day", days, now, NONE)).toMatchObject({ ok: false, code: "too_many" });
  });
  it("rejects the whole purchase if any hour has started", () => {
    const r = checkUnits("hour", [at(0, 14), at(1, 12)], now, NONE);
    expect(r).toMatchObject({ ok: false, code: "past", units: [at(0, 14)] });
  });
  it("rejects hours beyond the horizon", () => {
    const end = horizon("hour", now).end;
    expect(checkUnits("hour", [end], now, NONE)).toMatchObject({ ok: false, code: "beyond", units: [end] });
    expect(checkUnits("hour", [end - HOUR_MS], now, NONE).ok).toBe(true);
  });
  it("rejects the whole purchase if any hour is already booked and names the conflicts", () => {
    const booked = new Set([at(1, 13)]);
    const r = checkUnits("hour", [at(1, 12), at(1, 13), at(1, 14)], now, booked);
    expect(r).toMatchObject({ ok: false, code: "conflict", units: [at(1, 13)] });
  });
  it("reports past before beyond before conflict", () => {
    const end = horizon("hour", now).end;
    const booked = new Set([at(1, 13)]);
    expect(checkUnits("hour", [at(0, 1), end, at(1, 13)], now, booked)).toMatchObject({ code: "past" });
    expect(checkUnits("hour", [end, at(1, 13)], now, booked)).toMatchObject({ code: "beyond" });
  });
  it("applies the same conflict rules to sponsor days", () => {
    expect(checkUnits("day", [D0], now, NONE)).toMatchObject({ ok: false, code: "past" });
    expect(checkUnits("day", [D0 + 2 * DAY_MS], now, new Set([D0 + 2 * DAY_MS]))).toMatchObject({ ok: false, code: "conflict" });
    expect(checkUnits("day", [D0 + 3 * DAY_MS + HOUR_MS], now, NONE)).toMatchObject({ ok: false, code: "invalid" });
    expect(checkUnits("day", [D0 + DAY_MS, D0 + 2 * DAY_MS], now, NONE).ok).toBe(true);
  });
});

describe("nextOpenUnits and cheapestOpenCents", () => {
  const now = at(0, 14) + 5_000;
  it("starts at the next hour and skips booked ones", () => {
    expect(nextOpenUnits("hour", 3, now, NONE)).toEqual([at(0, 15), at(0, 16), at(0, 17)]);
    expect(nextOpenUnits("hour", 3, now, new Set([at(0, 16)]))).toEqual([at(0, 15), at(0, 17), at(0, 18)]);
  });
  it("can be limited to prime hours inside a window", () => {
    const tomorrow = D0 + DAY_MS;
    const r = nextOpenUnits("hour", 99, now, NONE, { primeOnly: true, from: tomorrow, to: tomorrow + DAY_MS });
    expect(r).toHaveLength(SPOTLIGHT.primeEndHourUtc - SPOTLIGHT.primeStartHourUtc);
    expect(r[0]).toBe(at(1, SPOTLIGHT.primeStartHourUtc));
  });
  it("returns fewer than asked when the horizon runs out", () => {
    const r = nextOpenUnits("hour", 1000, now, NONE);
    expect(r[r.length - 1]).toBe(horizon("hour", now).end - HOUR_MS);
    expect(r.length).toBe(SPOTLIGHT.horizonDays * 24 - 15);
  });
  it("picks the next days for sponsors", () => {
    expect(nextOpenUnits("day", 2, now, NONE)).toEqual([D0 + DAY_MS, D0 + 2 * DAY_MS]);
  });
  it("cheapest open price is base unless only prime hours remain", () => {
    expect(cheapestOpenCents("hour", now, NONE)).toBe(SPOTLIGHT.baseCents);
    const all = new Set<number>();
    for (let t = D0; t < horizon("hour", now).end; t += HOUR_MS) if (!(slotPriceCents(t) === SPOTLIGHT.primeCents)) all.add(t);
    expect(cheapestOpenCents("hour", now, all)).toBe(SPOTLIGHT.primeCents);
    for (let t = D0; t < horizon("hour", now).end; t += HOUR_MS) all.add(t);
    expect(cheapestOpenCents("hour", now, all)).toBeNull();
    expect(cheapestOpenCents("day", now, NONE)).toBe(SPONSOR.dayCents);
  });
});

describe("groupRuns", () => {
  it("groups consecutive units", () => {
    expect(groupRuns([at(0, 5), at(0, 3), at(0, 4), at(0, 9)], HOUR_MS)).toEqual([[at(0, 3), at(0, 4), at(0, 5)], [at(0, 9)]]);
    expect(groupRuns([], HOUR_MS)).toEqual([]);
    expect(groupRuns([D0, D0 + DAY_MS], DAY_MS)).toEqual([[D0, D0 + DAY_MS]]);
  });
  it("splits across midnight only when not consecutive", () => {
    expect(groupRuns([at(0, 23), at(1, 0)], HOUR_MS)).toEqual([[at(0, 23), at(1, 0)]]);
  });
});

describe("validateBooking", () => {
  const good = { url: "northwind-studio.example", name: "Northwind Studio", tagline: "Video ads people finish watching", category: "Marketing" as const };
  it("accepts a good spotlight booking", () => {
    const r = validateBooking("hour", good);
    expect(r.errors).toEqual({});
    expect(r.url?.key).toBe("northwind-studio.example");
  });
  it("caps the headline at 60 characters", () => {
    expect(HEADLINE_MAX).toBe(60);
    expect(validateBooking("hour", { ...good, tagline: "a".repeat(60) }).errors.tagline).toBeUndefined();
    expect(validateBooking("hour", { ...good, tagline: "a".repeat(61) }).errors.tagline).toMatch(/Headline must be 60/);
  });
  it("rejects links in the headline and bad urls", () => {
    expect(validateBooking("hour", { ...good, tagline: "See us at www.example.com" }).errors.tagline).toBeTruthy();
    expect(validateBooking("hour", { ...good, url: "javascript:alert(1)" }).errors.url).toBeTruthy();
    expect(validateBooking("hour", { ...good, url: "bit.ly/abc" }).errors.url).toBeTruthy();
  });
  it("requires a category and a name", () => {
    expect(validateBooking("hour", { ...good, category: "" }).errors.category).toBeTruthy();
    expect(validateBooking("hour", { ...good, name: " " }).errors.name).toBeTruthy();
  });
  it("sponsor uses the tighter name and message caps", () => {
    expect(validateBooking("day", { ...good, name: "n".repeat(SPONSOR.nameMax) }).errors.name).toBeUndefined();
    expect(validateBooking("day", { ...good, name: "n".repeat(SPONSOR.nameMax + 1) }).errors.name).toBeTruthy();
    expect(validateBooking("day", { ...good, tagline: "m".repeat(SPONSOR.taglineMax + 1) }).errors.tagline).toMatch(/Message must be/);
  });
});
