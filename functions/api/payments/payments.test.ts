/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it } from "vitest";
import { onRequestPost as createOrder } from "./create-order";
import { onRequestPost as verify } from "./verify";
import { onRequestPost as webhook } from "./webhook";
import { onRequestGet as promoted } from "../promoted";
import { hmac, installRazorpay, makeEnv, post, VALID_CAMPAIGN, type RzpState } from "../../_lib/testkit";
import type { Env } from "../../_lib/env";

type Ctx = { request: Request; env: Env };
const call = (fn: unknown, request: Request, env: Env) => (fn as (c: Ctx) => Promise<Response>)({ request, env });
const body = async (r: Response) => (await r.json()) as Record<string, any>;

let rz: RzpState;
beforeEach(() => {
  rz = installRazorpay();
});

/** Simulate the buyer paying an order in Razorpay Checkout; returns what the browser would send to /verify. */
function pay(env: Env, orderId: string, status: "captured" | "authorized" = "captured", over: Partial<{ amount: number; currency: string }> = {}) {
  const paymentId = `pay_TEST${orderId.slice(-8)}`;
  const o = rz.orders[orderId];
  rz.payments[paymentId] = { id: paymentId, order_id: orderId, amount: over.amount ?? o.amount, currency: over.currency ?? o.currency, status, created_at: Math.floor(Date.now() / 1000) };
  return { orderId, paymentId, signature: hmac(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`) };
}

const promoReq = (extra: Record<string, unknown> = {}) => ({ sku: "promo-24h", campaign: VALID_CAMPAIGN, idempotencyKey: "idem-key-0001", ...extra });

describe("create-order", () => {
  it("rejects requests without a matching Origin", async () => {
    const env = makeEnv();
    expect((await call(createOrder, post("/api/payments/create-order", promoReq(), { Origin: "https://evil.example" }), env)).status).toBe(403);
    const noOrigin = new Request("https://adverticeaf.com/api/payments/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect((await call(createOrder, noOrigin, env)).status).toBe(403);
    expect(rz.calls).toHaveLength(0);
  });

  it("uses the server price even if the client sends another amount", async () => {
    const env = makeEnv();
    const res = await call(createOrder, post("/api/payments/create-order", promoReq({ amountCents: 1, amount: 1 })), env);
    expect(res.status).toBe(200);
    const j = await body(res);
    expect(j).toMatchObject({ ok: true, amount: 2900, currency: "USD", mode: "test" });
    expect(rz.calls[0].body).toMatchObject({ amount: 2900, currency: "USD" });
    expect(JSON.stringify(j)).not.toContain(env.RAZORPAY_KEY_SECRET); // the secret never leaves the server
  });

  it("refuses to take money for a product it cannot store (no KV)", async () => {
    const env = makeEnv({ kv: false });
    const res = await call(createOrder, post("/api/payments/create-order", promoReq()), env);
    expect(res.status).toBe(503);
    expect((await body(res)).error.code).toBe("storage_not_configured");
    expect(rz.calls).toHaveLength(0); // Razorpay was never contacted
  });

  it("validates the campaign before creating an order", async () => {
    const env = makeEnv();
    const bad = await call(createOrder, post("/api/payments/create-order", promoReq({ campaign: { ...VALID_CAMPAIGN, websiteUrl: "https://bit.ly/x" } })), env);
    expect(bad.status).toBe(400);
    expect((await body(bad)).error.code).toBe("invalid_campaign");
    expect(rz.calls).toHaveLength(0);
  });

  it("is idempotent: a double click returns the same order", async () => {
    const env = makeEnv();
    const a = await body(await call(createOrder, post("/api/payments/create-order", promoReq()), env));
    const b = await body(await call(createOrder, post("/api/payments/create-order", promoReq()), env));
    expect(b.orderId).toBe(a.orderId);
    expect(rz.calls.filter((c) => c.path === "/orders")).toHaveLength(1);
  });

  it("creates a NEW order when the same request id is reused with different campaign content", async () => {
    const env = makeEnv();
    const a = await body(await call(createOrder, post("/api/payments/create-order", promoReq()), env));
    const edited = promoReq({ campaign: { ...VALID_CAMPAIGN, title: "Edited Title" } });
    const b = await body(await call(createOrder, post("/api/payments/create-order", edited), env));
    expect(b.orderId).not.toBe(a.orderId);
    const sent = pay(env, b.orderId);
    await call(verify, post("/api/payments/verify", sent), env);
    expect((await body(await call(promoted, new Request("https://adverticeaf.com/api/promoted"), env))).active.campaign.title).toBe("Edited Title");
  });

  it("only sells the test product in test mode", async () => {
    const live = makeEnv({ RAZORPAY_KEY_ID: "rzp_live_unitTestKey01" });
    const res = await call(createOrder, post("/api/payments/create-order", { sku: "test-1", idempotencyKey: "idem-key-0002" }), live);
    expect(res.status).toBe(400);
    const test = makeEnv({ kv: false });
    expect((await call(createOrder, post("/api/payments/create-order", { sku: "test-1", idempotencyKey: "idem-key-0003" }), test)).status).toBe(200);
  });

  it("rejects bad json, wrong content type and a missing idempotency key", async () => {
    const env = makeEnv();
    expect((await call(createOrder, post("/api/payments/create-order", "{nope"), env)).status).toBe(400);
    const wrongType = post("/api/payments/create-order", "{}", { "Content-Type": "text/plain" });
    expect((await call(createOrder, wrongType, env)).status).toBe(415);
    expect((await call(createOrder, post("/api/payments/create-order", { sku: "promo-24h", campaign: VALID_CAMPAIGN }), env)).status).toBe(400);
  });
});

describe("verify", () => {
  async function ordered(env: Env) {
    return (await body(await call(createOrder, post("/api/payments/create-order", promoReq()), env))).orderId as string;
  }

  it("publishes the promotion after a valid captured payment", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env));
    const res = await call(verify, post("/api/payments/verify", sent), env);
    expect(await body(res)).toMatchObject({ ok: true, status: "paid", sku: "promo-24h", persisted: true, alreadyPaid: false });
    const live = await body(await call(promoted, new Request("https://adverticeaf.com/api/promoted"), env));
    expect(live.active?.campaign?.title).toBe("Test Campaign");
    expect(live.active?.campaign?.websiteUrl).toBe("https://acme.example/launch");
  });

  it("rejects a forged signature without contacting Razorpay", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env));
    const before = rz.calls.length;
    const res = await call(verify, post("/api/payments/verify", { ...sent, signature: "0".repeat(64) }), env);
    expect(res.status).toBe(400);
    expect(rz.calls.length).toBe(before);
    expect((await body(await call(promoted, new Request("https://adverticeaf.com/api/promoted"), env))).active).toBeNull();
  });

  it("rejects a payment whose amount does not match the order", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env), "captured", { amount: 100 });
    expect((await call(verify, post("/api/payments/verify", sent), env)).status).toBe(400);
  });

  it("captures an authorized payment, then confirms", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env), "authorized");
    expect((await call(verify, post("/api/payments/verify", sent), env)).status).toBe(200);
    expect(rz.calls.some((c) => c.method === "POST" && c.path.endsWith("/capture"))).toBe(true);
  });

  it("does not publish a payment that is not captured", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env), "captured");
    rz.payments[sent.paymentId].status = "failed";
    expect((await call(verify, post("/api/payments/verify", sent), env)).status).toBe(402);
    expect((await body(await call(promoted, new Request("https://adverticeaf.com/api/promoted"), env))).active).toBeNull();
  });

  it("is safe to replay: no duplicate promotion", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env));
    await call(verify, post("/api/payments/verify", sent), env);
    const again = await body(await call(verify, post("/api/payments/verify", sent), env));
    expect(again.alreadyPaid).toBe(true);
    expect([...env._kv!.store.keys()].filter((k) => k.startsWith("promo:"))).toHaveLength(1);
  });

  it("rejects malformed ids", async () => {
    const env = makeEnv();
    const r = await call(verify, post("/api/payments/verify", { orderId: "x", paymentId: "y", signature: "z" }), env);
    expect(r.status).toBe(400);
  });
});

describe("webhook", () => {
  const event = (orderId: string, paymentId: string, name = "payment.captured") =>
    JSON.stringify({ event: name, payload: { payment: { entity: { id: paymentId, order_id: orderId } } } });
  const signed = (env: Env, raw: string) => post("/api/payments/webhook", raw, { "X-Razorpay-Signature": hmac(env.RAZORPAY_WEBHOOK_SECRET!, raw), Origin: "https://api.razorpay.com" });

  async function ordered(env: Env) {
    return (await body(await call(createOrder, post("/api/payments/create-order", promoReq()), env))).orderId as string;
  }

  it("fulfils the order even if the buyer never returned to the site", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env));
    const res = await call(webhook, signed(env, event(sent.orderId, sent.paymentId)), env);
    expect(res.status).toBe(200);
    expect((await body(await call(promoted, new Request("https://adverticeaf.com/api/promoted"), env))).active).not.toBeNull();
  });

  it("rejects an unsigned or wrongly signed webhook", async () => {
    const env = makeEnv();
    const raw = event("order_ABCDEFGH1", "pay_ABCDEFGH1");
    expect((await call(webhook, post("/api/payments/webhook", raw, { "X-Razorpay-Signature": "bad" }), env)).status).toBe(400);
    expect((await call(webhook, post("/api/payments/webhook", raw), env)).status).toBe(400);
  });

  it("ignores a forged 'captured' event when Razorpay says the payment was not captured", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env));
    rz.payments[sent.paymentId].status = "failed";
    const res = await body(await call(webhook, signed(env, event(sent.orderId, sent.paymentId)), env));
    expect(res.ignored).toBe("not_captured_or_mismatch");
    expect((await body(await call(promoted, new Request("https://adverticeaf.com/api/promoted"), env))).active).toBeNull();
  });

  it("acknowledges unrelated events without acting", async () => {
    const env = makeEnv();
    const res = await call(webhook, signed(env, event("order_ABCDEFGH1", "pay_ABCDEFGH1", "refund.created")), env);
    expect(res.status).toBe(200);
    expect(rz.calls).toHaveLength(0);
  });

  it("works together with verify without duplicating the promotion", async () => {
    const env = makeEnv();
    const sent = pay(env, await ordered(env));
    await call(verify, post("/api/payments/verify", sent), env);
    await call(webhook, signed(env, event(sent.orderId, sent.paymentId)), env);
    expect([...env._kv!.store.keys()].filter((k) => k.startsWith("promo:"))).toHaveLength(1);
  });

  it("returns 503 when no webhook secret is configured", async () => {
    const env = makeEnv({ RAZORPAY_WEBHOOK_SECRET: undefined });
    expect((await call(webhook, post("/api/payments/webhook", "{}"), env)).status).toBe(503);
  });
});

describe("error handling", () => {
  it("does not leak upstream details and treats gateway auth failure as a config problem", async () => {
    const env = makeEnv();
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" } }), { status: 401 })) as typeof fetch;
    const res = await call(createOrder, post("/api/payments/create-order", promoReq()), env);
    const j = await body(res);
    expect(res.status).toBe(503);
    expect(j.error.code).toBe("gateway_auth");
    expect(JSON.stringify(j)).not.toMatch(/Authentication failed|rzp_|secret/i);
  });
});
