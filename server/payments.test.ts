import test from "node:test";
import assert from "node:assert/strict";
import { parsePromotion, PROMOTION_PLANS } from "../src/lib/campaigns/promotion.ts";
import { validateProduct, paymentMatches, verifyWebhook } from "./payments.ts";

test("PROMOTION_PLANS contains 24h and 7d plans", () => {
  assert.equal(PROMOTION_PLANS["24h"].cents, 2900);
  assert.equal(PROMOTION_PLANS["7d"].cents, 7900);
});

test("parsePromotion validates valid campaign submission", () => {
  const result = parsePromotion({
    plan: "24h",
    campaign: {
      title: "Liquid Death Tea",
      brand: "Liquid Death",
      tagline: "Heavy-metal flavored iced tea in recyclable cans.",
      format: "Reel / TikTok",
      category: "Food & Beverage",
      websiteUrl: "https://liquiddeath.com",
    },
  });

  assert.equal(result.plan, "24h");
  assert.equal(result.campaign.title, "Liquid Death Tea");
  assert.equal(result.campaign.brand, "Liquid Death");
  assert.equal(result.campaign.websiteUrl, "https://liquiddeath.com/");
  assert.equal(result.campaign.promoted, true);
});

test("parsePromotion rejects missing required fields", () => {
  assert.throws(() => {
    parsePromotion({
      plan: "24h",
      campaign: {
        title: "",
        brand: "Brand",
        tagline: "Tagline",
        format: "Reel / TikTok",
        category: "Food & Beverage",
        websiteUrl: "https://example.com",
      },
    });
  }, /Invalid title/);
});

test("parsePromotion rejects invalid URL protocol", () => {
  assert.throws(() => {
    parsePromotion({
      plan: "24h",
      campaign: {
        title: "Test",
        brand: "Brand",
        tagline: "Tagline",
        format: "Reel / TikTok",
        category: "Food & Beverage",
        websiteUrl: "http://insecure.com",
      },
    });
  }, /public HTTPS URL/);
});

test("validateProduct verifies legitimate Dodo one-time product", () => {
  assert.doesNotThrow(() => {
    validateProduct(
      {
        product_id: "pdt_24h",
        business_id: "biz_123",
        is_recurring: false,
        price: {
          type: "one_time_price",
          currency: "USD",
          price: 2900,
          tax_inclusive: true,
          pay_what_you_want: false,
        },
      },
      "pdt_24h",
      2900,
      "biz_123"
    );
  });
});

test("validateProduct rejects mismatched price or business", () => {
  assert.throws(() => {
    validateProduct(
      {
        product_id: "pdt_24h",
        business_id: "biz_other",
        is_recurring: false,
        price: {
          type: "one_time_price",
          currency: "USD",
          price: 2900,
          tax_inclusive: true,
          pay_what_you_want: false,
        },
      },
      "pdt_24h",
      2900,
      "biz_123"
    );
  }, /does not match/);
});

test("paymentMatches verifies succeeded payment matches order", () => {
  const order = {
    id: "ord_123",
    mode: "test_mode",
    plan: "24h" as const,
    product_id: "pdt_24h",
    amount: 2900,
    duration_ms: 86400000,
    session_id: "ses_abc",
  };

  const payment = {
    payment_id: "pay_1",
    business_id: "biz_123",
    status: "succeeded",
    currency: "USD",
    total_amount: 2900,
    checkout_session_id: "ses_abc",
    product_cart: [{ product_id: "pdt_24h", quantity: 1 }],
    metadata: { order_id: "ord_123", plan: "24h" },
  };

  assert.equal(paymentMatches(payment, order, "biz_123"), true);
});

test("paymentMatches rejects payment with wrong order metadata", () => {
  const order = {
    id: "ord_123",
    mode: "test_mode",
    plan: "24h" as const,
    product_id: "pdt_24h",
    amount: 2900,
    duration_ms: 86400000,
    session_id: "ses_abc",
  };

  const payment = {
    payment_id: "pay_1",
    business_id: "biz_123",
    status: "succeeded",
    currency: "USD",
    total_amount: 2900,
    checkout_session_id: "ses_abc",
    product_cart: [{ product_id: "pdt_24h", quantity: 1 }],
    metadata: { order_id: "ord_different", plan: "24h" },
  };

  assert.equal(paymentMatches(payment, order, "biz_123"), false);
});

test("verifyWebhook verifies valid HMAC signature", async () => {
  const secret = "whsec_MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE"; // base64 secret
  const rawSecret = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const id = "msg_123";
  const now = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_123" } });

  const key = await crypto.subtle.importKey("raw", rawSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${now}.${rawBody}`));
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  const headers = new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(now),
    "webhook-signature": `v1,${signatureBase64}`,
  });

  const valid = await verifyWebhook(rawBody, headers, secret, now * 1000);
  assert.equal(valid, true);

  // Reject tampered body
  const invalid = await verifyWebhook(rawBody + "tamper", headers, secret, now * 1000);
  assert.equal(invalid, false);

  // Reject expired timestamp (> 300s)
  const expired = await verifyWebhook(rawBody, headers, secret, (now + 400) * 1000);
  assert.equal(expired, false);
});

