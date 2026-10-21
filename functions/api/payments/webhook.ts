import type { Env } from "../../_lib/env";
import { HttpError, handle, json } from "../../_lib/http";
import { CATALOG } from "../../_lib/catalog";
import { fulfilPaid } from "../../_lib/ledger";
import { ORDER_ID_RE, PAYMENT_ID_RE, razorpay, verifyWebhookSignature } from "../../_lib/razorpay";

interface WebhookBody {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } } };
}

/**
 * POST /api/payments/webhook
 * Razorpay's server-to-server notice. This is the source of truth: it fulfils orders even if the buyer
 * closed the tab before the browser could call /verify. Signature is checked over the RAW body.
 */
export const onRequestPost = handle(async (request, env: Env) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new HttpError(503, "not_configured", "Webhook secret is not set.");
  const signature = request.headers.get("X-Razorpay-Signature") ?? "";
  const raw = await request.text();
  if (raw.length > 100_000) throw new HttpError(413, "payload_too_large", "Too large.");
  if (!(await verifyWebhookSignature(env.RAZORPAY_WEBHOOK_SECRET, raw, signature))) {
    throw new HttpError(400, "bad_signature", "Invalid signature.");
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    throw new HttpError(400, "invalid_json", "Invalid body.");
  }

  // Only act on money-received events; acknowledge everything else so Razorpay stops retrying.
  if (body.event !== "payment.captured" && body.event !== "order.paid") return json({ ok: true, ignored: body.event ?? null });

  const pay = body.payload?.payment?.entity;
  const orderId = pay?.order_id ?? body.payload?.order?.entity?.id;
  const paymentId = pay?.id;
  if (!orderId || !ORDER_ID_RE.test(orderId) || !paymentId || !PAYMENT_ID_RE.test(paymentId)) return json({ ok: true, ignored: "no_ids" });

  // Never trust the webhook body for amounts or products: re-read from Razorpay.
  const rp = razorpay(env);
  const [order, payment] = await Promise.all([rp.fetchOrder(orderId), rp.fetchPayment(paymentId)]);
  if (payment.order_id !== orderId || payment.status !== "captured" || payment.amount !== order.amount || payment.currency !== order.currency) {
    return json({ ok: true, ignored: "not_captured_or_mismatch" });
  }

  const notes = (order.notes && !Array.isArray(order.notes) ? order.notes : {}) as Record<string, string>;
  const item = notes.sku ? CATALOG[notes.sku] : undefined;
  if (env.PAYMENTS && item && item.needsLedger) {
    await fulfilPaid(env.PAYMENTS, {
      orderId,
      paymentId,
      paidAtMs: payment.created_at * 1000,
      durationMs: item.kind === "fixed" ? item.durationMs : undefined,
    });
  }
  return json({ ok: true });
});
