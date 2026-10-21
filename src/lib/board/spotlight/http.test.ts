import { describe, expect, it, vi } from "vitest";
import { createHttpSpotlight } from "./http";
import { parseBooking, parseCheckoutUrl, parseError, parseOrder } from "./parse";
import { DAY_MS, HOUR_MS } from "./rules";

const D0 = Date.UTC(2026, 9, 20);
const goodBooking = {
  id: "bk1", start: D0 + DAY_MS + 12 * HOUR_MS, headline: "Ads that work",
  listing: { domain: "a.example", name: "A Studio", url: "https://a.example/?utm_source=x", category: "Other" },
};
const goodOrder = { orderId: "ord_1", kind: "hour", status: "paid", bookings: [goodBooking], subtotalCents: 2000, discountCents: 0, totalCents: 2000 };

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
}
const req = { slots: [D0 + DAY_MS + 12 * HOUR_MS], headline: "Ads that work", acceptedTerms: true, listing: { url: "a.example", name: "A", tagline: "x", category: "Other" as const } };

describe("parse (untrusted JSON)", () => {
  it("normalises the link and keeps a valid booking", () => {
    const b = parseBooking(goodBooking);
    expect(b?.listing.url).toBe("https://a.example");
    expect(b?.start).toBe(goodBooking.start);
  });
  it("drops unsafe links but keeps the booking so the slot still reads as taken", () => {
    const b = parseBooking({ ...goodBooking, listing: { ...goodBooking.listing, url: "javascript:alert(1)" } });
    expect(b).not.toBeNull();
    expect(b?.listing.url).toBeNull();
    expect(parseBooking({ ...goodBooking, listing: { ...goodBooking.listing, url: "data:text/html,x" } })?.listing.url).toBeNull();
  });
  it("rejects malformed bookings and strips control characters and long text", () => {
    expect(parseBooking(null)).toBeNull();
    expect(parseBooking({ ...goodBooking, start: "soon" })).toBeNull();
    expect(parseBooking({ ...goodBooking, start: 1.5 })).toBeNull();
    expect(parseBooking({ ...goodBooking, headline: 42 })).toBeNull();
    expect(parseBooking({ ...goodBooking, listing: null })).toBeNull();
    expect(parseBooking({ ...goodBooking, headline: "Hi\u202Ethere" })?.headline).toBe("Hithere");
    expect(parseBooking({ ...goodBooking, headline: "x".repeat(500) })?.headline).toHaveLength(120);
    expect(parseBooking({ ...goodBooking, listing: { ...goodBooking.listing, category: "<script>" } })?.listing.category).toBeNull();
  });
  it("only accepts https checkout URLs", () => {
    expect(parseCheckoutUrl("https://pay.example/session/abc")).toBe("https://pay.example/session/abc");
    expect(parseCheckoutUrl("http://pay.example/abc")).toBeNull();
    expect(parseCheckoutUrl("javascript:alert(1)")).toBeNull();
    expect(parseCheckoutUrl("https://user:pw@pay.example/")).toBeNull();
    expect(parseCheckoutUrl("//pay.example")).toBeNull();
    expect(parseCheckoutUrl(5)).toBeNull();
    expect(parseCheckoutUrl("https://pay.example/ x")).toBeNull();
  });
  it("parses orders and rejects bad money", () => {
    expect(parseOrder(goodOrder)?.totalCents).toBe(2000);
    expect(parseOrder({ ...goodOrder, totalCents: -1 })).toBeNull();
    expect(parseOrder({ ...goodOrder, totalCents: 19.99 })).toBeNull();
    expect(parseOrder({ ...goodOrder, status: "refunded" })).toBeNull();
    expect(parseOrder({ ...goodOrder, kind: "week" })).toBeNull();
  });
  it("maps error codes and falls back safely", () => {
    expect(parseError({ error: { code: "conflict", message: "Taken", conflicts: [goodBooking.start, "x"] } }, 409)).toEqual({ code: "conflict", error: "Taken", conflicts: [goodBooking.start] });
    expect(parseError({ error: { code: "made_up" } }, 500).code).toBe("server");
    expect(parseError(null, 429).code).toBe("rate_limited");
    expect(parseError("oops", 500).error).toMatch(/Nothing was charged/);
  });
});

describe("http adapter", () => {
  it("sends the idempotency key header and a JSON body without it", async () => {
    const f = mockFetch(200, { ok: true, order: goodOrder });
    const api = createHttpSpotlight("https://api.example/board/", { fetchImpl: f });
    const r = await api.purchaseSlots({ ...req, idempotencyKey: "key-123" });
    expect(r).toMatchObject({ ok: true, orderId: "ord_1" });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example/board/spotlight/slots/purchase");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("key-123");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    const body = JSON.parse(init.body as string);
    expect(body.slots).toEqual(req.slots);
    expect(body.idempotencyKey).toBeUndefined();
  });
  it("generates an idempotency key when none is given", async () => {
    const f = mockFetch(200, { ok: true, order: goodOrder });
    await createHttpSpotlight("https://api.example", { fetchImpl: f }).purchaseSlots(req);
    const init = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect(((init.headers as Record<string, string>)["Idempotency-Key"] ?? "").length).toBeGreaterThan(8);
  });
  it("returns a https checkoutUrl for a hosted payment page", async () => {
    const f = mockFetch(202, { orderId: "ord_9", checkoutUrl: "https://pay.example/c/9" });
    const r = await createHttpSpotlight("https://api.example", { fetchImpl: f }).purchaseSlots(req);
    expect(r).toEqual({ ok: true, orderId: "ord_9", order: null, checkoutUrl: "https://pay.example/c/9" });
  });
  it("refuses a non-https checkoutUrl", async () => {
    for (const bad of ["http://pay.example/c", "javascript:alert(1)", "data:text/html,hi", 5]) {
      const r = await createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(202, { orderId: "o", checkoutUrl: bad }) }).purchaseSlots(req);
      expect(r).toMatchObject({ ok: false, code: "server" });
    }
  });
  it("maps a 409 conflict to a clear failure with the conflicting hours", async () => {
    const f = mockFetch(409, { error: { code: "conflict", message: "Some hours were taken.", conflicts: [req.slots[0]] } });
    const r = await createHttpSpotlight("https://api.example", { fetchImpl: f }).purchaseSlots(req);
    expect(r).toEqual({ ok: false, code: "conflict", error: "Some hours were taken.", conflicts: [req.slots[0]] });
  });
  it("treats a malformed success body as unconfirmed, never as success", async () => {
    const r = await createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, { ok: true, order: { nope: 1 } }) }).purchaseSlots(req);
    expect(r).toMatchObject({ ok: false, code: "server" });
    const r2 = await createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, "garbage") }).purchaseSlots(req);
    expect(r2.ok).toBe(false);
  });
  it("rejects a mismatched order kind and failed orders", async () => {
    const wrongKind = await createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, { ok: true, order: { ...goodOrder, kind: "day" } }) }).purchaseSlots(req);
    expect(wrongKind.ok).toBe(false);
    const failed = await createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, { ok: true, order: { ...goodOrder, status: "failed" } }) }).purchaseSlots(req);
    expect(failed.ok).toBe(false);
  });
  it("reports a network failure without claiming a charge", async () => {
    const f = vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
    const r = await createHttpSpotlight("https://api.example", { fetchImpl: f }).purchaseSlots(req);
    expect(r).toMatchObject({ ok: false, code: "network" });
    expect(r.ok ? "" : r.error).toMatch(/not be charged twice|Nothing was charged/);
  });
  it("fails safely when no API base is configured", async () => {
    const r = await createHttpSpotlight("", { fetchImpl: mockFetch(200, {}) }).purchaseSlots(req);
    expect(r).toMatchObject({ ok: false, code: "network" });
    await expect(createHttpSpotlight("", {}).getSpotlight(D0, D0 + DAY_MS)).rejects.toThrow();
  });
  it("loads a calendar and drops garbage rows", async () => {
    const f = mockFetch(200, { rangeStart: D0, rangeEnd: D0 + DAY_MS, serverTime: D0 + HOUR_MS, bookings: [goodBooking, { id: 1 }, null, "x"] });
    const cal = await createHttpSpotlight("https://api.example", { fetchImpl: f }).getSpotlight(D0, D0 + DAY_MS);
    expect(cal.bookings).toHaveLength(1);
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(`https://api.example/spotlight/slots?start=${D0}&end=${D0 + DAY_MS}`);
  });
  it("rejects a calendar with the wrong shape and a 500", async () => {
    await expect(createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, { bookings: "nope" }) }).getSpotlight(D0, D0 + DAY_MS)).rejects.toThrow();
    await expect(createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(500, {}) }).getSpotlight(D0, D0 + DAY_MS)).rejects.toThrow();
  });
  it("reads the current spotlight and order, and refuses unsafe order ids", async () => {
    const cur = await createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, { start: D0 + 14 * HOUR_MS, booking: null, fromCents: 1000 }) }).getCurrentSpotlight();
    expect(cur).toEqual({ kind: "hour", start: D0 + 14 * HOUR_MS, booking: null, fromCents: 1000 });
    const api = createHttpSpotlight("https://api.example", { fetchImpl: mockFetch(200, { order: goodOrder }) });
    expect((await api.getOrder("ord_1")).ok).toBe(true);
    expect((await api.getOrder("../etc/passwd")).ok).toBe(false);
  });
});
