/**
 * Browser side of the Razorpay integration. The browser never sees the secret and never sets a price:
 * it asks the server for an order, opens Razorpay Checkout, then asks the server to verify the result.
 * Nothing is reported as paid until /api/payments/verify says so.
 */
const API = (process.env.NEXT_PUBLIC_PAYMENTS_API ?? "").replace(/\/$/, "");
const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface PaymentConfig {
  configured: boolean;
  mode: "test" | "live" | null;
  currency: string;
  promotionsAvailable: boolean;
}

export interface PaymentRequest {
  sku: string;
  campaign?: Record<string, unknown>;
  amountCents?: number;
  description?: string;
  prefill?: { name?: string; email?: string };
  /** Reuse across retries of the SAME purchase so a double click cannot create two orders. */
  idempotencyKey?: string;
}

export type PaymentResult =
  | { ok: true; orderId: string; paymentId: string; amount: number; currency: string; mode: "test" | "live"; persisted: boolean }
  | { ok: false; reason: "dismissed" | "declined" | "config" | "network" | "verify" | "rejected"; message: string; orderId?: string; paymentId?: string };

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void;
}
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;
declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const res = await fetch(`${API}/api/payments/config`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("bad status");
    const j = (await res.json()) as PaymentConfig & { ok?: boolean };
    return { configured: !!j.configured, mode: j.mode ?? null, currency: j.currency ?? "USD", promotionsAvailable: !!j.promotionsAvailable };
  } catch {
    // Static hosting without Functions (or offline): treat as not available rather than guessing.
    return { configured: false, mode: null, currency: "USD", promotionsAvailable: false };
  }
}

let scriptPromise: Promise<RazorpayCtor> | null = null;

/** Load Razorpay's checkout script only when a buyer actually starts paying (see the privacy policy). */
function loadCheckout(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  scriptPromise ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CHECKOUT_SRC;
    s.async = true;
    const timer = setTimeout(() => reject(new Error("timeout")), 15_000);
    s.onload = () => {
      clearTimeout(timer);
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("missing"));
    };
    s.onerror = () => {
      clearTimeout(timer);
      reject(new Error("blocked"));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    scriptPromise = null; // allow a retry
    throw e;
  });
  return scriptPromise;
}

async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

interface ApiError {
  ok?: boolean;
  error?: { code?: string; message?: string };
}
interface OrderResponse extends ApiError {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  name: string;
  mode: "test" | "live";
}
interface VerifyResponse extends ApiError {
  status?: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  persisted: boolean;
}

export async function startPayment(req: PaymentRequest): Promise<PaymentResult> {
  // 1) Ask the server for an order. The price comes from the server's catalog.
  let order: OrderResponse;
  try {
    const { status, data } = await postJson<OrderResponse>("/api/payments/create-order", {
      sku: req.sku,
      amountCents: req.amountCents,
      campaign: req.campaign,
      idempotencyKey: req.idempotencyKey ?? newIdempotencyKey(),
    });
    if (status !== 200 || !data.orderId) {
      const code = data.error?.code;
      const config = code === "not_configured" || code === "gateway_auth" || code === "storage_not_configured";
      return {
        ok: false,
        reason: config ? "config" : "rejected",
        message: data.error?.message ?? "We could not start the payment. You have not been charged.",
      };
    }
    order = data;
  } catch {
    return { ok: false, reason: "network", message: "We could not reach the payment service. You have not been charged. Check your connection and try again." };
  }

  // 2) Open Razorpay Checkout.
  let Razorpay: RazorpayCtor;
  try {
    Razorpay = await loadCheckout();
  } catch {
    return { ok: false, reason: "network", message: "The payment window could not load (an ad blocker or network issue may be blocking it). You have not been charged.", orderId: order.orderId };
  }

  const paid = await new Promise<RazorpaySuccess | { dismissed: true } | { declined: string }>((resolve) => {
    const rzp = new Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "AdverticeAF",
      description: req.description ?? order.name,
      order_id: order.orderId,
      prefill: req.prefill,
      theme: { color: "#22d3ee" },
      modal: { confirm_close: true, ondismiss: () => resolve({ dismissed: true }) },
      handler: (r: RazorpaySuccess) => resolve(r),
    });
    rzp.on("payment.failed", (r) => resolve({ declined: r.error?.description ?? "The payment was declined." }));
    rzp.open();
  });

  if ("dismissed" in paid) return { ok: false, reason: "dismissed", message: "Payment cancelled. You have not been charged.", orderId: order.orderId };
  if ("declined" in paid) return { ok: false, reason: "declined", message: `${paid.declined} You have not been charged. Try another card or method.`, orderId: order.orderId };

  // 3) Never trust the browser callback: the server confirms with Razorpay.
  try {
    const { status, data } = await postJson<VerifyResponse>("/api/payments/verify", {
      orderId: paid.razorpay_order_id,
      paymentId: paid.razorpay_payment_id,
      signature: paid.razorpay_signature,
    });
    if (status === 200 && data.status === "paid") {
      return { ok: true, orderId: data.orderId, paymentId: data.paymentId, amount: data.amount, currency: data.currency, mode: order.mode, persisted: !!data.persisted };
    }
    return {
      ok: false,
      reason: "verify",
      message: data.error?.message ?? "We could not confirm your payment yet.",
      orderId: paid.razorpay_order_id,
      paymentId: paid.razorpay_payment_id,
    };
  } catch {
    return {
      ok: false,
      reason: "verify",
      message: "Your payment went through at the bank but we could not confirm it just now.",
      orderId: paid.razorpay_order_id,
      paymentId: paid.razorpay_payment_id,
    };
  }
}

/** Shown when a buyer may have been charged but we could not confirm: gives them something to quote to support. */
export function supportReference(r: Extract<PaymentResult, { ok: false }>): string | null {
  return r.reason === "verify" && r.paymentId ? `Reference: ${r.paymentId}` : null;
}
