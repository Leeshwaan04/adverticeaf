import { parsePromotion, PROMOTION_PLANS } from "../src/lib/campaigns/promotion.ts";

// Structural subset of the Cloudflare D1 binding, also used by the SQLite tests.
interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface PaymentEnv {
  PROMOTIONS_DB: { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown> };
  DODO_PAYMENTS_API_KEY: string;
  DODO_PAYMENTS_WEBHOOK_KEY: string;
  DODO_PAYMENTS_ENVIRONMENT: "test_mode" | "live_mode";
  DODO_BUSINESS_ID: string;
  DODO_PRODUCT_24H: string;
  DODO_PRODUCT_7D: string;
  DODO_LIVE_APPROVED?: string;
  PAYMENTS_SITE_URL: string;
}

interface Order {
  id: string;
  mode: string;
  plan: "24h" | "7d";
  product_id: string;
  amount: number;
  duration_ms: number;
  session_id: string | null;
}
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
}
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" },
  });
}
function configuration(env: PaymentEnv) {
  if (!env.PROMOTIONS_DB || !["test_mode", "live_mode"].includes(env.DODO_PAYMENTS_ENVIRONMENT)) {
    throw new HttpError(503, "Payments are not configured yet. No payment was taken.");
  }
  return env.DODO_PAYMENTS_ENVIRONMENT;
}
function checkoutConfiguration(env: PaymentEnv) {
  const mode = configuration(env);
  if (!env.DODO_PAYMENTS_API_KEY || !env.DODO_PAYMENTS_WEBHOOK_KEY || !env.DODO_BUSINESS_ID ||
      !env.DODO_PRODUCT_24H || !env.DODO_PRODUCT_7D || env.DODO_PRODUCT_24H === env.DODO_PRODUCT_7D ||
      (mode === "live_mode" && env.DODO_LIVE_APPROVED !== "true")) {
    throw new HttpError(503, "Checkout is not enabled yet. No payment was taken.");
  }
  let site: URL;
  try { site = new URL(env.PAYMENTS_SITE_URL); } catch { throw new HttpError(503, "Checkout URL is not configured."); }
  if (site.username || site.password || site.search || site.hash || site.pathname !== "/" ||
      (site.protocol !== "https:" && !(mode === "test_mode" && site.protocol === "http:" && ["localhost", "127.0.0.1"].includes(site.hostname)))) {
    throw new HttpError(503, "Checkout requires a trusted HTTPS site URL.");
  }
  return { mode, site };
}
async function dodo(env: PaymentEnv, path: string, body?: unknown): Promise<ObjectValue> {
  if (!env.DODO_PAYMENTS_API_KEY) throw new HttpError(503, "Payment provider is not configured.");
  const host = env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live" : "test";
  const response = await fetch(`https://${host}.dodopayments.com${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${env.DODO_PAYMENTS_API_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new HttpError(502, "Dodo Payments is unavailable. Please try again later.");
  return object(await response.json());
}

async function readBody(request: Request, maxBytes: number) {
  if (!request.body) throw new HttpError(400, "Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function validateProduct(product: ObjectValue, productId: string, cents: number, businessId: string) {
  const price = object(product.price);
  const discount = price.discount_bps ?? (Number(price.discount ?? 0) * 100);
  if (product.product_id !== productId || product.business_id !== businessId || product.is_recurring !== false ||
      product.pricing_mode != null || price.type !== "one_time_price" || price.currency !== "USD" ||
      price.price !== cents || price.tax_inclusive !== true || price.pay_what_you_want !== false ||
      price.purchasing_power_parity === true || discount !== 0) {
    throw new HttpError(503, "The Dodo product does not match this placement plan. Checkout is disabled.");
  }
}

export async function verifyWebhook(raw: string, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !/^\d+$/.test(timestamp) || !signatures || !secret ||
      Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  try {
    const decode = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", decode(secret.replace(/^whsec_/, "")), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const content = new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
    for (const entry of signatures.split(/\s+/)) {
      const [version, signature] = entry.split(",");
      if (version !== "v1" || !signature) continue;
      try {
        if (await crypto.subtle.verify("HMAC", key, decode(signature), content)) return true;
      } catch { /* A malformed rotation signature must not hide a valid one. */ }
    }
  } catch { return false; }
  return false;
}

async function checkout(request: Request, env: PaymentEnv) {
  const { mode, site } = checkoutConfiguration(env);
  if (request.headers.get("origin") !== site.origin) throw new HttpError(403, "Checkout must be opened from this site.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Use JSON for checkout.");
  const bucket = Math.floor(Date.now() / 600000);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${bucket}:${request.headers.get("cf-connecting-ip") || "local"}`));
  const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const limit = await env.PROMOTIONS_DB.prepare(`INSERT INTO checkout_limits (key, bucket, attempts) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1 RETURNING attempts`).bind(key, bucket).first<{ attempts: number }>();
  if (!limit || limit.attempts > 10) throw new HttpError(429, "Too many checkout attempts. Please wait ten minutes.");
  await env.PROMOTIONS_DB.prepare("DELETE FROM checkout_limits WHERE bucket < ?").bind(bucket - 1).run();
  const raw = await readBody(request, 20000);
  let parsed: ReturnType<typeof parsePromotion>;
  try { parsed = parsePromotion(JSON.parse(raw)); } catch (error) {
    throw new HttpError(400, error instanceof SyntaxError ? "Invalid JSON." : error instanceof Error ? error.message : "Invalid campaign.");
  }
  const { plan, campaign } = parsed;
  const { cents, durationMs } = PROMOTION_PLANS[plan];
  const productId = plan === "24h" ? env.DODO_PRODUCT_24H : env.DODO_PRODUCT_7D;
  validateProduct(await dodo(env, `/products/${encodeURIComponent(productId)}`), productId, cents, env.DODO_BUSINESS_ID);
  const id = crypto.randomUUID();
  await env.PROMOTIONS_DB.prepare(`INSERT INTO promotion_orders
    (id, mode, plan, product_id, amount, duration_ms, campaign_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, mode, plan, productId, cents, durationMs, JSON.stringify(campaign), Date.now()).run();
  const session = await dodo(env, "/checkouts", {
    product_cart: [{ product_id: productId, quantity: 1 }],
    billing_currency: "USD",
    feature_flags: { allow_currency_selection: false, allow_discount_code: false },
    metadata: { order_id: id, plan },
    return_url: `${site.origin}/campaigns?order_id=${id}`,
    cancel_url: `${site.origin}/campaigns?order_id=${id}&checkout=cancelled`,
  });
  let url: URL;
  try { url = new URL(String(session.checkout_url)); } catch { throw new HttpError(502, "Dodo did not return a checkout URL."); }
  const host = mode === "live_mode" ? "checkout.dodopayments.com" : "test.checkout.dodopayments.com";
  if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password || typeof session.session_id !== "string") {
    throw new HttpError(502, "Dodo returned an invalid checkout session.");
  }
  await env.PROMOTIONS_DB.prepare("UPDATE promotion_orders SET session_id = ? WHERE id = ?").bind(session.session_id, id).run();
  return json({ checkout_url: url.href });
}

export function paymentMatches(payment: ObjectValue, order: Order, businessId: string): boolean {
  const cart = payment.product_cart;
  const metadata = object(payment.metadata);
  return payment.business_id === businessId && payment.status === "succeeded" &&
    payment.currency === "USD" && payment.total_amount === order.amount &&
    payment.checkout_session_id === order.session_id && !!order.session_id &&
    metadata.order_id === order.id && metadata.plan === order.plan &&
    Array.isArray(cart) && cart.length === 1 && object(cart[0]).product_id === order.product_id && object(cart[0]).quantity === 1 &&
    !payment.subscription_id && (!Array.isArray(payment.subscription_ids) || payment.subscription_ids.length === 0) &&
    !payment.discount_id && (!Array.isArray(payment.discounts) || payment.discounts.length === 0);
}

async function webhook(request: Request, env: PaymentEnv) {
  if (!env.DODO_PAYMENTS_WEBHOOK_KEY || !env.DODO_BUSINESS_ID) throw new HttpError(503, "Webhook is not configured.");
  const raw = await readBody(request, 262144);
  if (!await verifyWebhook(raw, request.headers, env.DODO_PAYMENTS_WEBHOOK_KEY)) throw new HttpError(401, "Invalid webhook signature.");
  let event: ObjectValue;
  try { event = object(JSON.parse(raw)); } catch { throw new HttpError(400, "Invalid event JSON."); }
  const id = request.headers.get("webhook-id")!;
  if (await env.PROMOTIONS_DB.prepare("SELECT id FROM payment_webhooks WHERE id = ?").bind(id).first()) return json({ received: true });
  const type = String(event.type);
  if (type !== "payment.succeeded" && type !== "refund.succeeded" && !type.startsWith("dispute.")) return json({ received: true });
  if (event.business_id !== env.DODO_BUSINESS_ID) throw new HttpError(400, "Event business does not match.");
  const paymentId = object(event.data).payment_id;
  if (typeof paymentId !== "string") throw new HttpError(400, "Missing payment ID.");
  const payment = await dodo(env, `/payments/${encodeURIComponent(paymentId)}`);
  if (payment.payment_id !== paymentId || payment.business_id !== env.DODO_BUSINESS_ID) throw new HttpError(409, "Payment identity does not match.");
  const orderId = object(payment.metadata).order_id;
  if (typeof orderId !== "string") return json({ received: true });
  const order = await env.PROMOTIONS_DB.prepare("SELECT * FROM promotion_orders WHERE id = ? AND mode = ?")
    .bind(orderId, env.DODO_PAYMENTS_ENVIRONMENT).first<Order>();
  // Other products in the same Dodo account are not fulfilled by this application.
  if (!order) return json({ received: true });
  if (!order.session_id) throw new HttpError(503, "Checkout is still being recorded. Retry delivery.");
  if (payment.checkout_session_id !== order.session_id) throw new HttpError(409, "Checkout session does not match.");
  const now = Date.now();
  const refunded = type === "refund.succeeded" || payment.refund_status === "partial" || payment.refund_status === "full" ||
    (Array.isArray(payment.refunds) && payment.refunds.some((refund) => object(refund).status === "succeeded"));
  const disputed = Array.isArray(payment.disputes) && payment.disputes.some((dispute) =>
    !["dispute_won", "dispute_cancelled"].includes(String(object(dispute).dispute_status)));
  const statements: Statement[] = [];
  if (refunded || disputed) {
    statements.push(env.PROMOTIONS_DB.prepare("INSERT OR IGNORE INTO revoked_payments (payment_id, revoked_at) VALUES (?, ?)").bind(paymentId, now));
  } else if (type === "payment.succeeded") {
    if (!paymentMatches(payment, order, env.DODO_BUSINESS_ID)) throw new HttpError(409, "Payment does not match the purchased placement. Manual review required.");
    // A single SQL statement allocates the next free slot. D1 serializes writes;
    // the order/payment uniqueness constraints make retries harmless.
    statements.push(env.PROMOTIONS_DB.prepare(`INSERT OR IGNORE INTO promotion_placements
      (order_id, payment_id, mode, starts_at, ends_at)
      SELECT ?, ?, ?, slot, slot + ? FROM
        (SELECT MAX(?, COALESCE(MAX(ends_at), 0)) AS slot FROM promotion_placements WHERE mode = ?)
      WHERE NOT EXISTS (SELECT 1 FROM revoked_payments WHERE payment_id = ?)`)
      .bind(order.id, paymentId, order.mode, order.duration_ms, now, order.mode, paymentId));
  }
  statements.push(env.PROMOTIONS_DB.prepare("INSERT OR IGNORE INTO payment_webhooks (id, processed_at) VALUES (?, ?)").bind(id, now));
  await env.PROMOTIONS_DB.batch(statements);
  return json({ received: true });
}

async function status(url: URL, env: PaymentEnv) {
  const id = url.searchParams.get("order_id");
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, "Invalid order ID.");
  const row = await env.PROMOTIONS_DB.prepare(`SELECT p.starts_at, p.ends_at, r.payment_id AS revoked
    FROM promotion_orders o LEFT JOIN promotion_placements p ON p.order_id = o.id
    LEFT JOIN revoked_payments r ON r.payment_id = p.payment_id WHERE o.id = ? AND o.mode = ?`)
    .bind(id, env.DODO_PAYMENTS_ENVIRONMENT).first<{ starts_at: number | null; ends_at: number | null; revoked: string | null }>();
  if (!row) throw new HttpError(404, "Order not found.");
  const now = Date.now();
  const state = row.revoked ? "revoked" : row.starts_at === null || row.ends_at === null ? "pending"
    : row.ends_at <= now ? "expired" : row.starts_at > now ? "scheduled" : "active";
  return json({ status: state, starts_at: row.starts_at, ends_at: row.ends_at, test_mode: env.DODO_PAYMENTS_ENVIRONMENT === "test_mode" });
}

async function promotions(env: PaymentEnv) {
  const now = Date.now();
  const row = await env.PROMOTIONS_DB.prepare(`SELECT o.campaign_json, p.ends_at FROM promotion_placements p
    JOIN promotion_orders o ON o.id = p.order_id
    LEFT JOIN revoked_payments r ON r.payment_id = p.payment_id
    WHERE p.mode = ? AND p.starts_at <= ? AND p.ends_at > ? AND r.payment_id IS NULL
    ORDER BY p.starts_at LIMIT 1`).bind(env.DODO_PAYMENTS_ENVIRONMENT, now, now)
    .first<{ campaign_json: string; ends_at: number }>();
  return json({ campaign: row ? { ...JSON.parse(row.campaign_json), promotedUntil: new Date(row.ends_at).toISOString() } : null,
    test_mode: env.DODO_PAYMENTS_ENVIRONMENT === "test_mode" });
}

export async function handlePaymentRequest(request: Request, env: PaymentEnv): Promise<Response> {
  try {
    configuration(env);
    const url = new URL(request.url);
    const route = url.pathname.replace(/\/$/, "");
    if (route === "/api/payments/checkout" && request.method === "POST") return await checkout(request, env);
    if (route === "/api/payments/webhook" && request.method === "POST") return await webhook(request, env);
    if (route === "/api/payments/status" && request.method === "GET") return await status(url, env);
    if (route === "/api/payments/promotions" && request.method === "GET") return await promotions(env);
    return json({ error: "Payment route or method not found." }, 404);
  } catch (error) {
    // Never return provider responses, credentials, customer data or database errors.
    return json({ error: error instanceof HttpError ? error.message : "Payments are temporarily unavailable. Please try again later." }, error instanceof HttpError ? error.status : 503);
  }
}
