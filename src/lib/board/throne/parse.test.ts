import { describe, expect, it } from "vitest";
import { parseError, parseLeaderboard, parseListing, parseReign, parseReigns, parseTake, parseThroneView, safeCheckoutUrl } from "./parse";
import { parseMine } from "./mine";

const T = Date.UTC(2026, 9, 20, 12);
const listing = { domain: "a.example", name: "A (sample)", url: "https://a.example", category: "Other", tagline: "Hello there", createdAt: T - 1000, verified: false };
const reign = { id: "r1", listing, startedAt: T - 5000, endedAt: null, pricePaidCents: 500 };

describe("parseListing", () => {
  it("accepts a good listing and falls back to Other for an unknown category", () => {
    expect(parseListing({ ...listing, category: "Weird" })?.category).toBe("Other");
    expect(parseListing(listing)).toMatchObject({ domain: "a.example", name: "A (sample)" });
  });
  it("rejects junk shapes and oversize strings", () => {
    for (const bad of [null, 5, "x", [], { ...listing, name: 7 }, { ...listing, domain: "" }, { ...listing, name: "x".repeat(500) }]) {
      expect(parseListing(bad)).toBeNull();
    }
  });
});

describe("parseReign", () => {
  it("accepts ongoing and closed reigns", () => {
    expect(parseReign(reign)?.endedAt).toBeNull();
    expect(parseReign({ ...reign, endedAt: T })?.endedAt).toBe(T);
  });
  it("rejects invalid ends, negative prices and ends before starts instead of treating them as ongoing", () => {
    expect(parseReign({ ...reign, endedAt: "soon" })).toBeNull();
    expect(parseReign({ ...reign, endedAt: T - 99_999 })).toBeNull();
    expect(parseReign({ ...reign, pricePaidCents: -1 })).toBeNull();
    expect(parseReign({ ...reign, pricePaidCents: 5.5 })).toBeNull();
  });
  it("drops bad rows from a list but keeps good ones", () => {
    expect(parseReigns({ reigns: [reign, { nope: 1 }] })).toHaveLength(1);
    expect(parseReigns({ reigns: "x" })).toBeNull();
  });
});

describe("parseThroneView", () => {
  const body = { holder: listing, lastTakeAt: T - 5000, startPriceCents: 700, reignCount: 3, serverNow: T };
  it("computes the clock skew against the middle of the round trip", () => {
    const v = parseThroneView(body, T - 2000 - 400, T - 2000 + 400);
    expect(v?.clockSkewMs).toBe(2000);
    expect(v?.mode).toBe("live");
  });
  it("accepts an empty seat and rejects inconsistent or malformed state", () => {
    expect(parseThroneView({ ...body, holder: null, lastTakeAt: null }, T, T)?.holder).toBeNull();
    expect(parseThroneView({ ...body, holder: null }, T, T)).toBeNull();
    expect(parseThroneView({ ...body, lastTakeAt: null }, T, T)).toBeNull();
    expect(parseThroneView({ ...body, startPriceCents: "700" }, T, T)).toBeNull();
    expect(parseThroneView({ ...body, holder: { bad: 1 } }, T, T)).toBeNull();
    expect(parseThroneView("nope", T, T)).toBeNull();
  });
});

describe("parseLeaderboard", () => {
  it("re-ranks from the order received and drops bad rows", () => {
    const b = parseLeaderboard({ window: "day", generatedAt: T, rows: [{ listing, totalMs: 5000, reigns: 1, holdingNow: true }, { listing: 1 }] }, "day");
    expect(b?.rows).toHaveLength(1);
    expect(b?.rows[0]).toMatchObject({ rank: 1, holdingNow: true });
  });
  it("rejects a response for the wrong window", () => {
    expect(parseLeaderboard({ window: "week", generatedAt: T, rows: [] }, "day")).toBeNull();
  });
});

describe("checkout url and take parsing", () => {
  it("only allows https without credentials", () => {
    expect(safeCheckoutUrl("https://pay.example/c/123")).toBe("https://pay.example/c/123");
    for (const bad of ["http://pay.example", "javascript:alert(1)", "https://u:p@pay.example", "//pay.example", "", 5, null]) expect(safeCheckoutUrl(bad)).toBeNull();
  });
  it("parses a redirect and a finished take, and rejects an unsafe redirect", () => {
    expect(parseTake({ checkoutUrl: "https://pay.example/c/1" })).toEqual({ kind: "redirect", checkoutUrl: "https://pay.example/c/1" });
    expect(parseTake({ checkoutUrl: "http://pay.example/c/1" })).toBeNull();
    expect(parseTake({ ok: true, reign, chargedCents: 500, nextStartCents: 700 })).toMatchObject({ kind: "taken", chargedCents: 500 });
    expect(parseTake({ ok: true, reign, chargedCents: -5, nextStartCents: 700 })).toBeNull();
    expect(parseTake({ ok: false })).toBeNull();
  });
  it("parses error bodies defensively", () => {
    expect(parseError({ error: { code: "price_changed", message: "m", currentPriceCents: 800 } })).toEqual({ code: "price_changed", message: "m", currentPriceCents: 800 });
    expect(parseError("html error page")).toEqual({ code: null, message: null, currentPriceCents: null });
  });
});

describe("parseMine", () => {
  const ok = { url: "brand.example", name: "Brand", tagline: "Something nice", category: "Other" };
  it("is empty for absent or broken storage", () => {
    expect(parseMine(null)).toEqual([]);
    expect(parseMine("{not json")).toEqual([]);
    expect(parseMine("42")).toEqual([]);
  });
  it("accepts arrays, {listings} and {listing} wrappers, drops invalid and duplicate entries", () => {
    expect(parseMine(JSON.stringify([ok, { ...ok, url: "bit.ly/x" }, { ...ok, url: "https://brand.example/?utm_source=a" }]))).toHaveLength(1);
    expect(parseMine(JSON.stringify({ listings: [{ listing: ok }] }))).toHaveLength(1);
  });
});
