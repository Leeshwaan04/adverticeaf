import { describe, expect, it } from "vitest";
import { hmacSha256Hex, timingSafeEqualHex } from "./crypto";
import { verifyCheckoutSignature, verifyWebhookSignature } from "./razorpay";
import { priceFor } from "./catalog";
import { cleanHttpsUrl, cleanText, parsePromoPayload } from "./promo";
import { activePromo, type PromoRecord } from "./ledger";
import { hmac, makeEnv, VALID_CAMPAIGN } from "./testkit";

describe("signatures", () => {
  it("hmac matches node's implementation", async () => {
    expect(await hmacSha256Hex("k", "order_1|pay_1")).toBe(hmac("k", "order_1|pay_1"));
  });
  it("accepts only the correct checkout signature", async () => {
    const env = makeEnv();
    const good = hmac(env.RAZORPAY_KEY_SECRET, "order_ABCDEFGH1|pay_ABCDEFGH1");
    expect(await verifyCheckoutSignature(env, "order_ABCDEFGH1", "pay_ABCDEFGH1", good)).toBe(true);
    expect(await verifyCheckoutSignature(env, "order_ABCDEFGH1", "pay_ABCDEFGH2", good)).toBe(false); // other payment
    expect(await verifyCheckoutSignature(env, "order_ABCDEFGH2", "pay_ABCDEFGH1", good)).toBe(false); // other order
    expect(await verifyCheckoutSignature(env, "order_ABCDEFGH1", "pay_ABCDEFGH1", good.slice(0, -1) + "0")).toBe(false);
  });
  it("verifies webhook signatures over the raw body", async () => {
    const body = '{"event":"payment.captured"}';
    expect(await verifyWebhookSignature("s", body, hmac("s", body))).toBe(true);
    expect(await verifyWebhookSignature("s", body + " ", hmac("s", body))).toBe(false);
    expect(await verifyWebhookSignature("other", body, hmac("s", body))).toBe(false);
  });
  it("timingSafeEqualHex handles length mismatch and case", () => {
    expect(timingSafeEqualHex("ab", "abc")).toBe(false);
    expect(timingSafeEqualHex("ABCDEF", "abcdef")).toBe(true);
  });
});

describe("catalog pricing", () => {
  it("never lets the client change a fixed price", () => {
    const r = priceFor("promo-24h", 1, { testMode: false });
    expect(r).toMatchObject({ ok: true, amountCents: 2900 });
  });
  it("rejects unknown skus including prototype keys", () => {
    for (const sku of ["nope", "__proto__", "constructor", "toString", 5, null, undefined]) {
      expect(priceFor(sku, 100, { testMode: true }).ok).toBe(false);
    }
  });
  it("sells the test product only with test keys", () => {
    expect(priceFor("test-1", undefined, { testMode: true }).ok).toBe(true);
    expect(priceFor("test-1", undefined, { testMode: false }).ok).toBe(false);
  });
  it("keeps Board bids disabled until the Board exists", () => {
    expect(priceFor("bid", 500, { testMode: true })).toMatchObject({ ok: false, code: "unavailable" });
  });
});

describe("promo payload", () => {
  it("accepts a valid campaign and cleans the link", () => {
    const r = parsePromoPayload(VALID_CAMPAIGN);
    expect(r.ok && r.value.websiteUrl).toBe("https://acme.example/launch");
    expect(r.ok && r.value.agencyName).toBe("Acme");
  });
  it.each([
    ["http link", { websiteUrl: "http://acme.example" }],
    ["shortener", { websiteUrl: "https://bit.ly/abc" }],
    ["ip address", { websiteUrl: "https://10.0.0.1/x" }],
    ["credentials", { websiteUrl: "https://u:p@acme.example" }],
    ["javascript url", { websiteUrl: "javascript:alert(1)" }],
    ["bad category", { category: "Casino" }],
    ["bad format", { format: "Hologram" }],
    ["short title", { title: "ab" }],
  ])("rejects %s", (_n, patch) => {
    expect(parsePromoPayload({ ...VALID_CAMPAIGN, ...patch }).ok).toBe(false);
  });
  it("strips control, direction-override and angle-bracket characters", () => {
    expect(cleanText("a\u202Eb<script>c\u0000", 50)).toBe("abscriptc");
    expect(cleanHttpsUrl("https://acme.example/#frag")).toBe("https://acme.example");
  });
});

describe("promotion queue", () => {
  const promo = (orderId: string, paidAt: number, durationMs: number): PromoRecord => ({
    orderId, sku: "promo-24h", durationMs, paidAt, mode: "test", campaign: { ...VALID_CAMPAIGN, agencyName: "x", theHook: "", theAngle: "", theResult: "" },
  });
  const H = 3_600_000;
  it("returns null when nothing is live", () => {
    expect(activePromo([], 1000)).toEqual({ active: null, queued: 0 });
  });
  it("runs promotions one at a time in paid order", () => {
    const a = promo("a", 0, 24 * H);
    const b = promo("b", 1 * H, 24 * H); // paid while a is live: starts when a ends
    expect(activePromo([b, a], 10 * H).active?.promo.orderId).toBe("a");
    expect(activePromo([b, a], 10 * H).queued).toBe(1);
    expect(activePromo([b, a], 24 * H).active?.promo.orderId).toBe("b"); // exact boundary hands over
    expect(activePromo([b, a], 24 * H).active?.startsAt).toBe(24 * H);
    expect(activePromo([b, a], 48 * H).active).toBeNull(); // b ended exactly at 48h
  });
  it("starts immediately at paid time when the slot is free, and leaves gaps", () => {
    const a = promo("a", 0, 1 * H);
    const b = promo("b", 5 * H, 1 * H);
    expect(activePromo([a, b], 3 * H).active).toBeNull();
    expect(activePromo([a, b], 5 * H + 1).active?.promo.orderId).toBe("b");
  });
  it("is deterministic for ties", () => {
    const x = promo("x", 0, H);
    const y = promo("y", 0, H);
    expect(activePromo([y, x], 1).active?.promo.orderId).toBe("x");
  });
});
