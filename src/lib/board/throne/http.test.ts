import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const T = Date.UTC(2026, 9, 20, 12);
const listing = { domain: "a.example", name: "A (sample)", url: "https://a.example", category: "Other", tagline: "Hello there", createdAt: T - 1000, verified: false };
const reign = { id: "r1", listing, startedAt: T, endedAt: null, pricePaidCents: 500 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_BOARD_API", "https://api.example/board/");
  return (await import("./http")).httpApi;
}

const req = {
  listing: { url: "a.example", name: "A", tagline: "Hello there", category: "Other" as const },
  expectedPriceCents: 700, acceptedTerms: true, idempotencyKey: "key-123",
};

describe("http adapter", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the Idempotency-Key header and strips the trailing slash from the base", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, reign, chargedCents: 500, nextStartCents: 700 }));
    vi.stubGlobal("fetch", fetchMock);
    const api = await load();
    const res = await api.purchaseTake(req);
    expect(res).toMatchObject({ ok: true, kind: "taken", chargedCents: 500 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example/board/throne/take");
    expect(init.headers["Idempotency-Key"]).toBe("key-123");
    expect(init.credentials).toBe("omit");
  });

  it("returns an https checkout URL and refuses any other", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ checkoutUrl: "https://pay.example/c/1" })).mockResolvedValueOnce(json({ checkoutUrl: "http://pay.example/c/1" })));
    const api = await load();
    expect(await api.purchaseTake(req)).toEqual({ ok: true, kind: "redirect", checkoutUrl: "https://pay.example/c/1" });
    const bad = await api.purchaseTake(req);
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.code).toBe("network"); // unreadable success is treated as a lost response, safe to retry
  });

  it("maps a 409 price_changed to a clear error with the new price", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: { code: "price_changed", message: "x", currentPriceCents: 900 } }, 409)));
    const api = await load();
    const res = await api.purchaseTake(req);
    expect(!res.ok && res.code).toBe("price_changed");
    expect(!res.ok && res.error).toContain("$9.00");
    expect(!res.ok && res.currentPriceCents).toBe(900);
  });

  it("maps statuses without a code, and never echoes server text for payment errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({}, 402)).mockResolvedValueOnce(json({}, 429)).mockResolvedValueOnce(json({ error: { code: "payment_failed", message: "<b>boom</b>" } }, 402)).mockResolvedValueOnce(new Response("<html>oops</html>", { status: 502 })));
    const api = await load();
    expect((await api.purchaseTake(req)) as { code: string }).toMatchObject({ code: "payment_failed" });
    expect((await api.purchaseTake(req)) as { code: string }).toMatchObject({ code: "rate_limited" });
    const third = await api.purchaseTake(req);
    expect(!third.ok && third.error).not.toContain("boom");
    expect((await api.purchaseTake(req)) as { code: string }).toMatchObject({ code: "server" });
  });

  it("reports a lost connection as an ambiguous result that is safe to retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const api = await load();
    const res = await api.purchaseTake(req);
    expect(!res.ok && res.code).toBe("network");
    expect(!res.ok && res.error).toMatch(/not be charged twice/);
  });

  it("reads the throne and rejects malformed responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ holder: listing, lastTakeAt: T, startPriceCents: 700, reignCount: 1, serverNow: T })).mockResolvedValueOnce(json({ holder: 5 })));
    const api = await load();
    expect((await api.getThrone()).holder?.domain).toBe("a.example");
    await expect(api.getThrone()).rejects.toThrow(/could not read/);
  });

  it("validates alert input locally before calling the server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const api = await load();
    expect((await api.setPriceAlert("bad", 300)).ok).toBe(false);
    expect((await api.setPriceAlert("a@brand.example", 10)).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await api.setPriceAlert("a@brand.example", 300)).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails loudly when no API base is configured", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_BOARD_API", "");
    const api = (await import("./http")).httpApi;
    await expect(api.getReigns(5)).rejects.toThrow();
  });
});
