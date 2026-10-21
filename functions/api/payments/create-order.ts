import { currencyOf, isTestKey, type Env } from "../../_lib/env";
import { HttpError, handle, json, originAllowed, readJson } from "../../_lib/http";
import { priceFor } from "../../_lib/catalog";
import { parsePromoPayload, type PromoPayload } from "../../_lib/promo";
import { sha256Hex } from "../../_lib/crypto";
import { putCreated, recallIdempotency, rememberIdempotency } from "../../_lib/ledger";
import { razorpay } from "../../_lib/razorpay";

interface Body {
  sku?: unknown;
  amountCents?: unknown;
  campaign?: unknown;
  idempotencyKey?: unknown;
}

const IDEM_RE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * POST /api/payments/create-order
 * The browser asks for a product; the SERVER decides the price, validates what is being bought,
 * and refuses to take money for anything it cannot deliver.
 */
export const onRequestPost = handle(async (request, env: Env) => {
  if (!originAllowed(request, env)) throw new HttpError(403, "forbidden_origin", "This request is not allowed.");
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new HttpError(503, "not_configured", "Payments are not set up yet.");

  const body = await readJson<Body>(request);
  const testMode = isTestKey(env.RAZORPAY_KEY_ID);
  const price = priceFor(body.sku, body.amountCents, { testMode });
  if (!price.ok) throw new HttpError(400, price.code, price.message);

  if (price.item.needsLedger && !env.PAYMENTS) {
    throw new HttpError(503, "storage_not_configured", "This product cannot be sold yet. You have not been charged.");
  }

  let pending: PromoPayload | undefined;
  if (price.item.kind === "fixed" && price.item.durationMs) {
    const parsed = parsePromoPayload(body.campaign);
    if (!parsed.ok) throw new HttpError(400, "invalid_campaign", parsed.message);
    pending = parsed.value;
  }

  const idem = typeof body.idempotencyKey === "string" && IDEM_RE.test(body.idempotencyKey) ? body.idempotencyKey : null;
  if (!idem) throw new HttpError(400, "invalid_idempotency_key", "Missing request id. Refresh and try again.");

  const currency = currencyOf(env);
  const mode = testMode ? "test" : "live";
  const sku = body.sku as string;

  // Double-clicks and retries return the same order instead of creating another, but ONLY when what is being
  // bought is identical. If the buyer edited their campaign, a fresh order is created with the new content.
  const hash = await sha256Hex(JSON.stringify({ sku, amount: price.amountCents, pending: pending ?? null }));
  if (env.PAYMENTS) {
    const prior = await recallIdempotency(env.PAYMENTS, idem);
    if (prior && prior.sku === sku && prior.hash === hash) {
      return json({ ok: true, orderId: prior.orderId, keyId: env.RAZORPAY_KEY_ID, amount: prior.amount, currency: prior.currency, name: price.item.name, mode });
    }
  }

  const order = await razorpay(env).createOrder({
    amount: price.amountCents,
    currency,
    receipt: `adv_${idem}`.slice(0, 40),
    notes: { sku, mode },
  });

  if (env.PAYMENTS) {
    await putCreated(
      env.PAYMENTS,
      { id: order.id, sku, amountCents: order.amount, currency: order.currency, status: "created", createdAt: Date.now(), mode },
      pending,
    );
    await rememberIdempotency(env.PAYMENTS, idem, { orderId: order.id, amount: order.amount, currency: order.currency, sku, hash });
  }

  return json({ ok: true, orderId: order.id, keyId: env.RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency, name: price.item.name, mode });
});
