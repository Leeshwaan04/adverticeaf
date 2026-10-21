import { describe, expect, it } from "vitest";
import { createStore } from "@/lib/board/store";
import { createDemoApi } from "./demo";
import { priceAt } from "./rules";
import { buildSeed } from "./seed";
import type { TakeRequest, ThroneApi } from "./types";

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);

function setup() {
  let clock = NOW;
  let n = 0;
  const api = createDemoApi({
    store: createStore(`test-throne-${Math.random()}`, () => ({ v: 1 as const, ...buildSeed(clock), receipts: {} })),
    alertStore: createStore(`test-alerts-${Math.random()}`, () => ({ v: 1 as const, price: [], takeover: [] })),
    now: () => clock,
    latencyMs: 0,
    newId: () => `reign_${++n}`,
  });
  return { api, advance: (ms: number) => (clock += ms), clock: () => clock };
}

const request = (api: ThroneApi, over: Partial<TakeRequest> & { expected: number }): TakeRequest => ({
  listing: { url: "https://buyer-one.example", name: "Buyer One", tagline: "We buy thrones", category: "Other", ...over.listing },
  expectedPriceCents: over.expected,
  acceptedTerms: over.acceptedTerms ?? true,
  idempotencyKey: over.idempotencyKey ?? `key-${Math.random()}`,
});

async function price(api: ThroneApi, at: number) {
  const v = await api.getThrone();
  return priceAt({ holder: v.holder, lastTakeAt: v.lastTakeAt, startPriceCents: v.startPriceCents }, at);
}

describe("sample seed", () => {
  const seed = buildSeed(NOW);
  it("has about a dozen reigns, all clearly sample, on reserved .example domains", () => {
    expect(seed.reigns).toHaveLength(12);
    for (const r of seed.reigns) {
      expect(r.sample).toBe(true);
      expect(r.listing.sample).toBe(true);
      expect(r.listing.domain.endsWith(".example")).toBe(true);
      expect(r.listing.name).toMatch(/\(sample\)/);
    }
  });
  it("has exactly one ongoing reign, the newest, and reigns are contiguous", () => {
    expect(seed.reigns.filter((r) => r.endedAt === null)).toEqual([seed.reigns[0]]);
    for (let i = 1; i < seed.reigns.length; i++) expect(seed.reigns[i].endedAt).toBe(seed.reigns[i - 1].startedAt);
    expect(seed.state.holder).toBe(seed.reigns[0].listing);
    expect(seed.state.lastTakeAt).toBe(seed.reigns[0].startedAt);
  });
  it("holds the throne for about 3h12m and never lets one listing retake while holding", () => {
    expect(NOW - seed.reigns[0].startedAt).toBe(Math.round(3.2 * 3_600_000));
    for (let i = 1; i < seed.reigns.length; i++) expect(seed.reigns[i].listing.domain).not.toBe(seed.reigns[i - 1].listing.domain);
  });
});

describe("demo api", () => {
  it("serves the throne, newest reigns first, and a leaderboard computed from them", async () => {
    const { api } = setup();
    const view = await api.getThrone();
    expect(view.mode).toBe("demo");
    expect(view.reignCount).toBe(12);
    const reigns = await api.getReigns(5);
    expect(reigns).toHaveLength(5);
    expect(reigns[0].endedAt).toBeNull();
    const all = await api.getTimeLeaderboard("all");
    expect(all.rows[0].rank).toBe(1);
    const summed = all.rows.reduce((s, r) => s + r.totalMs, 0);
    const reignsAll = await api.getReigns(100);
    expect(summed).toBe(reignsAll.reduce((s, r) => s + ((r.endedAt ?? NOW) - r.startedAt), 0));
  });

  it("takes the throne, charges the current price and crowns the buyer", async () => {
    const { api } = setup();
    const seen = await price(api, NOW);
    const res = await api.purchaseTake(request(api, { expected: seen }));
    expect(res.ok).toBe(true);
    if (!res.ok || res.kind !== "taken") throw new Error("expected a take");
    expect(res.chargedCents).toBe(seen);
    expect(res.reign.listing.domain).toBe("buyer-one.example");
    expect(res.reign.listing.sample).toBeUndefined();
    const view = await api.getThrone();
    expect(view.holder?.domain).toBe("buyer-one.example");
    expect(view.startPriceCents).toBe(res.nextStartCents);
    expect(view.reignCount).toBe(13);
    const reigns = await api.getReigns(2);
    expect(reigns[1].endedAt).toBe(NOW); // the previous reign closed
  });

  it("charges less when the price fell between seeing it and paying", async () => {
    const { api, advance } = setup();
    const seen = await price(api, NOW);
    advance(2 * 3_600_000);
    const res = await api.purchaseTake(request(api, { expected: seen }));
    expect(res.ok && res.kind === "taken" && res.chargedCents).toBeLessThan(seen);
  });

  it("two simultaneous takes at the same price: exactly one wins", async () => {
    const { api } = setup();
    const seen = await price(api, NOW);
    const [a, b] = await Promise.all([
      api.purchaseTake(request(api, { expected: seen, listing: { url: "https://buyer-one.example", name: "Buyer One", tagline: "First here", category: "Other" } })),
      api.purchaseTake(request(api, { expected: seen, listing: { url: "https://buyer-two.example", name: "Buyer Two", tagline: "Second here", category: "Other" } })),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    const loser = a.ok ? b : a;
    expect(!loser.ok && loser.code).toBe("price_changed");
    expect(!loser.ok && loser.error).toMatch(/price changed to \$/i);
    expect((await api.getThrone()).reignCount).toBe(13);
  });

  it("a retry with the same idempotency key never charges or creates a reign twice", async () => {
    const { api } = setup();
    const seen = await price(api, NOW);
    const req = request(api, { expected: seen, idempotencyKey: "same-key" });
    const [one, two] = await Promise.all([api.purchaseTake(req), api.purchaseTake(req)]);
    const three = await api.purchaseTake(req);
    expect(one).toEqual(two);
    expect(one).toEqual(three);
    expect((await api.getThrone()).reignCount).toBe(13);
  });

  it("refuses a retake by the current holder", async () => {
    const { api } = setup();
    const view = await api.getThrone();
    const res = await api.purchaseTake(
      request(api, { expected: await price(api, NOW), listing: { url: view.holder!.url, name: "Same Holder", tagline: "Trying again", category: "Other" } }),
    );
    expect(!res.ok && res.code).toBe("already_holder");
  });

  it("rejects missing terms and invalid listings before any charge", async () => {
    const { api } = setup();
    const seen = await price(api, NOW);
    const noTerms = await api.purchaseTake(request(api, { expected: seen, acceptedTerms: false }));
    expect(!noTerms.ok && noTerms.code).toBe("terms_required");
    const bad = await api.purchaseTake(request(api, { expected: seen, listing: { url: "bit.ly/x", name: "Short", tagline: "Shortener", category: "Other" } }));
    expect(!bad.ok && bad.code).toBe("invalid_listing");
    expect((await api.getThrone()).reignCount).toBe(12);
  });

  it("notifies subscribers after a take and stops after unsubscribe", async () => {
    const { api } = setup();
    let calls = 0;
    const off = api.subscribe(() => calls++);
    await api.purchaseTake(request(api, { expected: await price(api, NOW) }));
    expect(calls).toBe(1);
    off();
    await api.purchaseTake(request(api, { expected: 100_000, listing: { url: "https://buyer-two.example", name: "Two", tagline: "Another", category: "Other" } }));
    expect(calls).toBe(1);
  });

  it("validates alert inputs and accepts good ones", async () => {
    const { api } = setup();
    expect((await api.setPriceAlert("nope", 300)).ok).toBe(false);
    expect((await api.setPriceAlert("a@brand.example", 50)).ok).toBe(false);
    expect((await api.setPriceAlert("a@brand.example", 300)).ok).toBe(true);
    expect((await api.setTakeoverAlert("bad")).ok).toBe(false);
    expect((await api.setTakeoverAlert("a@brand.example")).ok).toBe(true);
  });

  it("recovers from damaged stored data by reseeding", async () => {
    const store = createStore("test-damaged", () => ({ v: 1 as const, ...buildSeed(NOW), receipts: {} }));
    store.set({ junk: true } as never);
    const api = createDemoApi({ store, now: () => NOW, latencyMs: 0 });
    expect((await api.getThrone()).reignCount).toBe(12);
  });
});
