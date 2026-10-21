import { beforeEach, describe, expect, it } from "vitest";
import { SPONSOR, SPOTLIGHT } from "@/lib/board/config";
import { DAY_MS, HOUR_MS, horizon } from "./rules";
import { createDemoSpotlight } from "./demo";
import { sampleDayBooking, sampleHourBooking } from "./samples";
import type { PurchaseSlotsRequest } from "./types";

const D0 = Date.UTC(2026, 9, 20);
const NOW = D0 + 14 * HOUR_MS + 5 * 60_000; // 14:05 UTC
let n = 0;
const make = () => createDemoSpotlight({ storeKey: `test-${n++}`, latencyMs: 0, now: () => NOW });

/** First `count` future hours with no sample booking and (optionally) starting at least `from`. */
function freeHours(count: number, from = NOW): number[] {
  const out: number[] = [];
  for (let t = Math.floor(from / HOUR_MS) * HOUR_MS + HOUR_MS; out.length < count; t += HOUR_MS) if (!sampleHourBooking(t)) out.push(t);
  return out;
}
const takenHour = (): number => {
  for (let t = D0 + DAY_MS; ; t += HOUR_MS) if (sampleHourBooking(t)) return t;
};
const freeDay = (skip = 0): number => {
  let seen = 0;
  for (let t = D0 + DAY_MS; ; t += DAY_MS) if (!sampleDayBooking(t) && seen++ === skip) return t;
};

const listing = { url: "https://studio-one.example/?utm_source=x", name: "Studio One", tagline: "ignored", category: "Other" as const };
const req = (slots: number[], extra: Partial<PurchaseSlotsRequest> = {}): PurchaseSlotsRequest => ({
  slots, listing, headline: "Ads that earn the second watch", acceptedTerms: true, ...extra,
});

describe("samples", () => {
  it("are deterministic, flagged as sample and use the reserved .example TLD", () => {
    let seen = 0;
    for (let t = D0; t < D0 + 7 * DAY_MS; t += HOUR_MS) {
      const a = sampleHourBooking(t);
      expect(sampleHourBooking(t)).toEqual(a);
      if (a) {
        seen++;
        expect(a.sample).toBe(true);
        expect(a.listing.domain.endsWith(".example")).toBe(true);
        expect(a.listing.url?.endsWith(".example")).toBe(true);
        expect(a.listing.name.endsWith("(sample)")).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(20);
    expect(seen).toBeLessThan(150);
    const day = Array.from({ length: 14 }, (_, i) => sampleDayBooking(D0 + i * DAY_MS)).filter(Boolean);
    expect(day.length).toBeGreaterThan(0);
    expect(day.every((b) => b!.sample && b!.listing.name.length <= SPONSOR.nameMax && b!.headline.length <= SPONSOR.taglineMax)).toBe(true);
  });
});

describe("demo spotlight adapter", () => {
  beforeEach(() => undefined);

  it("returns the calendar with sample bookings and no user bookings", async () => {
    const api = make();
    const cal = await api.getSpotlight(D0, D0 + 7 * DAY_MS);
    expect(cal.kind).toBe("hour");
    expect(cal.bookings.length).toBeGreaterThan(0);
    expect(cal.bookings.every((b) => b.sample)).toBe(true);
  });

  it("books hours atomically and shows them on the calendar with a normalised link", async () => {
    const api = make();
    const [a, b, c] = freeHours(3);
    const r = await api.purchaseSlots(req([c, a, b]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order?.status).toBe("paid");
    expect(r.order?.bookings.map((x) => x.start)).toEqual([a, b, c]);
    expect(r.order?.bookings[0].listing).toMatchObject({ name: "Studio One", domain: "studio-one.example", url: "https://studio-one.example" });
    expect(r.order?.discountCents).toBe(Math.floor((r.order!.subtotalCents * 10) / 100));
    const cal = await api.getSpotlight(D0, D0 + 7 * DAY_MS);
    expect(cal.bookings.filter((x) => !x.sample)).toHaveLength(3);
  });

  it("is all or none: one taken hour rejects the whole purchase and books nothing", async () => {
    const api = make();
    const [a, b] = freeHours(2);
    const taken = takenHour();
    const r = await api.purchaseSlots(req([a, taken, b]));
    expect(r).toMatchObject({ ok: false, code: "conflict", conflicts: [taken] });
    const cal = await api.getSpotlight(D0, D0 + 7 * DAY_MS);
    expect(cal.bookings.filter((x) => !x.sample)).toHaveLength(0);
  });

  it("two concurrent purchases for the same hour: exactly one wins", async () => {
    const api = make();
    const [a] = freeHours(1);
    const [r1, r2] = await Promise.all([api.purchaseSlots(req([a])), api.purchaseSlots(req([a], { listing: { ...listing, url: "other.example", name: "Other" } }))]);
    expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
    const loser = r1.ok ? r2 : r1;
    expect(loser).toMatchObject({ ok: false, code: "conflict" });
  });

  it("a second purchase for an already booked hour is a conflict (double purchase)", async () => {
    const api = make();
    const [a] = freeHours(1);
    expect((await api.purchaseSlots(req([a]))).ok).toBe(true);
    expect(await api.purchaseSlots(req([a]))).toMatchObject({ ok: false, code: "conflict" });
  });

  it("retrying with the same idempotency key returns the same order and books once", async () => {
    const api = make();
    const [a, b] = freeHours(2);
    const r1 = await api.purchaseSlots(req([a, b], { idempotencyKey: "k1" }));
    const r2 = await api.purchaseSlots(req([a, b], { idempotencyKey: "k1" }));
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r2.orderId).toBe(r1.orderId);
    const cal = await api.getSpotlight(D0, D0 + 7 * DAY_MS);
    expect(cal.bookings.filter((x) => !x.sample)).toHaveLength(2);
    const order = await api.getOrder(r1.ok ? r1.orderId : "");
    expect(order.ok).toBe(true);
  });

  it("rejects an hour that has started, one beyond the horizon, and a missing consent", async () => {
    const api = make();
    expect(await api.purchaseSlots(req([D0 + 14 * HOUR_MS]))).toMatchObject({ ok: false, code: "past" });
    expect(await api.purchaseSlots(req([horizon("hour", NOW).end]))).toMatchObject({ ok: false, code: "beyond" });
    const [a] = freeHours(1);
    expect(await api.purchaseSlots(req([a], { acceptedTerms: false }))).toMatchObject({ ok: false, code: "terms" });
    expect(await api.purchaseSlots(req([]))).toMatchObject({ ok: false, code: "empty" });
  });

  it("validates the listing and the headline before booking", async () => {
    const api = make();
    const [a] = freeHours(1);
    expect(await api.purchaseSlots(req([a], { listing: { ...listing, url: "javascript:alert(1)" } }))).toMatchObject({ ok: false, code: "listing" });
    expect(await api.purchaseSlots(req([a], { headline: "x".repeat(61) }))).toMatchObject({ ok: false, code: "headline" });
    expect(await api.purchaseSlots(req([a], { listing: undefined }))).toMatchObject({ ok: false, code: "listing" });
    expect(await api.purchaseSlots(req([a], { listing: undefined, domain: "nobody.example" }))).toMatchObject({ ok: false, code: "unknown_listing" });
  });

  it("rebooks for a known listing by domain", async () => {
    const api = make();
    const [a, b] = freeHours(2);
    await api.purchaseSlots(req([a]));
    const r = await api.purchaseSlots({ slots: [b], domain: "studio-one.example", headline: "Second headline here", acceptedTerms: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order?.bookings[0].headline).toBe("Second headline here");
  });

  it("current spotlight reports the holder of this hour, or an open hour with a from price", async () => {
    const api = make();
    const cur = await api.getCurrentSpotlight();
    expect(cur.start).toBe(D0 + 14 * HOUR_MS);
    expect(cur.booking?.start ?? cur.start).toBe(cur.start);
    expect(cur.fromCents).toBe(SPOTLIGHT.baseCents);
  });

  it("notifies subscribers when a booking is made", async () => {
    const api = make();
    let calls = 0;
    const off = api.subscribe(() => calls++);
    await api.purchaseSlots(req(freeHours(1)));
    expect(calls).toBe(1);
    off();
    await api.purchaseSlots(req(freeHours(1, freeHours(1)[0])));
    expect(calls).toBe(1);
  });
});

describe("demo sponsor days", () => {
  const dreq = (days: number[], extra = {}) => ({ days, listing: { ...listing, name: "Tool Co" }, headline: "Free tools, presented by Tool Co", acceptedTerms: true, ...extra });

  it("books days with the multi-day discount and shows them as the current sponsor on the day", async () => {
    const api = make();
    const d1 = freeDay(0), d2 = freeDay(1), d3 = freeDay(2);
    const r = await api.purchaseSponsorDays(dreq([d1, d2, d3]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order?.subtotalCents).toBe(3 * SPONSOR.dayCents);
    expect(r.order?.discountCents).toBe(Math.floor((3 * SPONSOR.dayCents * 10) / 100));
    const cal = await api.getSponsorDays();
    expect(cal.kind).toBe("day");
    expect(cal.bookings.filter((b) => !b.sample)).toHaveLength(3);
  });

  it("rejects today (already started), a taken day and a double purchase", async () => {
    const api = make();
    expect(await api.purchaseSponsorDays(dreq([D0]))).toMatchObject({ ok: false, code: "past" });
    const d = freeDay();
    expect((await api.purchaseSponsorDays(dreq([d]))).ok).toBe(true);
    expect(await api.purchaseSponsorDays(dreq([d]))).toMatchObject({ ok: false, code: "conflict" });
    let taken = D0 + DAY_MS;
    while (!sampleDayBooking(taken)) taken += DAY_MS;
    expect(await api.purchaseSponsorDays(dreq([taken]))).toMatchObject({ ok: false, code: "conflict" });
  });

  it("enforces the sponsor name and message caps", async () => {
    const api = make();
    const d = freeDay();
    expect(await api.purchaseSponsorDays(dreq([d], { listing: { ...listing, name: "n".repeat(SPONSOR.nameMax + 1) } }))).toMatchObject({ ok: false, code: "listing" });
    expect(await api.purchaseSponsorDays(dreq([d], { headline: "m".repeat(SPONSOR.taglineMax + 1) }))).toMatchObject({ ok: false, code: "headline" });
  });

  it("current sponsor has a from price equal to the day rate", async () => {
    const api = make();
    const cur = await api.getCurrentSponsor();
    expect(cur.start).toBe(D0);
    expect(cur.fromCents).toBe(SPONSOR.dayCents);
  });
});
