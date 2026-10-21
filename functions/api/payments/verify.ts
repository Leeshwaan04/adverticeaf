import type { Env } from "../../_lib/env";
import { HttpError, handle, json, originAllowed, readJson } from "../../_lib/http";
import { CATALOG } from "../../_lib/catalog";
import { fulfilPaid, getOrder } from "../../_lib/ledger";
import { HEX_SIG_RE, ORDER_ID_RE, PAYMENT_ID_RE, razorpay, verifyCheckoutSignature } from "../../_lib/razorpay";

interface Body {
  orderId?: unknown;
  paymentId?: unknown;
  signature?: unknown;
}

/**
 * POST /api/payments/verify
 * Called by the browser after Razorpay Checkout succeeds. Never trusts the browser:
 * checks the signature, then re-reads the order and payment from Razorpay and confirms the money matches.
 */
export const onRequestPost = handle(async (request, env: Env) => {
  if (!originAllowed(request, env)) throw new HttpError(403, "forbidden_origin", "This request is not allowed.");
  const body = await readJson<Body>(request);
  const { orderId, paymentId, signature } = body;
  if (typeof orderId !== "string" || !ORDER_ID_RE.test(orderId) || typeof paymentId !== "string" || !PAYMENT_ID_RE.test(paymentId) || typeof signature !== "string" || !HEX_SIG_RE.test(signature)) {
    throw new HttpError(400, "invalid_request", "Payment details are not valid.");
  }

  if (!(await verifyCheckoutSignature(env, orderId, paymentId, signature))) {
    throw new HttpError(400, "bad_signature", "We could not confirm this payment.");
  }

  const rp = razorpay(env);
  const [order, initial] = await Promise.all([rp.fetchOrder(orderId), rp.fetchPayment(paymentId)]);
  if (initial.order_id !== orderId) throw new HttpError(400, "mismatch", "We could not confirm this payment.");

  let payment = initial;
  if (payment.status === "authorized") payment = await rp.capturePayment(paymentId, order.amount, order.currency);
  if (payment.status !== "captured") throw new HttpError(402, "not_captured", "The payment has not completed.");
  if (payment.amount !== order.amount || payment.currency !== order.currency) throw new HttpError(400, "mismatch", "We could not confirm this payment.");

  const notes = (order.notes && !Array.isArray(order.notes) ? order.notes : {}) as Record<string, string>;
  const sku = notes.sku;
  const item = sku ? CATALOG[sku] : undefined;

  let persisted = false;
  let alreadyPaid = false;
  if (env.PAYMENTS && item) {
    if (item.needsLedger || (await getOrder(env.PAYMENTS, orderId))) {
      const res = await fulfilPaid(env.PAYMENTS, {
        orderId,
        paymentId,
        paidAtMs: payment.created_at * 1000,
        durationMs: item.kind === "fixed" ? item.durationMs : undefined,
      });
      persisted = Boolean(res);
      alreadyPaid = Boolean(res?.alreadyPaid);
    }
  }

  return json({
    ok: true,
    status: "paid",
    orderId,
    paymentId,
    sku: sku ?? null,
    amount: payment.amount,
    currency: payment.currency,
    persisted,
    alreadyPaid,
  });
});
