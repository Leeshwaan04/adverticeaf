import type { Env } from "./env";
import { hmacSha256Hex, timingSafeEqualHex } from "./crypto";
import { RazorpayError } from "./http";

const API = "https://api.razorpay.com/v1";

export interface RzpOrder {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  status: string; // created | attempted | paid
  receipt?: string;
  notes?: Record<string, string> | unknown[];
}

export interface RzpPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
  captured?: boolean;
  created_at: number; // epoch seconds
  notes?: Record<string, string> | unknown[];
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Thin Razorpay REST client. The secret is only ever used in the Authorization header. */
export function razorpay(env: Env, fetchImpl: FetchLike = fetch as FetchLike) {
  const auth = `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; description?: string } } & T;
    if (!res.ok) throw new RazorpayError(res.status, data.error?.code ?? "unknown", data.error?.description ?? "");
    return data;
  }

  return {
    createOrder: (o: { amount: number; currency: string; receipt: string; notes: Record<string, string> }) => call<RzpOrder>("POST", "/orders", o),
    fetchOrder: (id: string) => call<RzpOrder>("GET", `/orders/${encodeURIComponent(id)}`),
    fetchPayment: (id: string) => call<RzpPayment>("GET", `/payments/${encodeURIComponent(id)}`),
    capturePayment: (id: string, amount: number, currency: string) =>
      call<RzpPayment>("POST", `/payments/${encodeURIComponent(id)}/capture`, { amount, currency }),
  };
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret), hex. */
export async function verifyCheckoutSignature(env: Env, orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const expected = await hmacSha256Hex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
  return timingSafeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook_secret), hex, in X-Razorpay-Signature. */
export async function verifyWebhookSignature(secret: string, rawBody: string, signature: string): Promise<boolean> {
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqualHex(expected, signature);
}

export const ORDER_ID_RE = /^order_[A-Za-z0-9]{8,32}$/;
export const PAYMENT_ID_RE = /^pay_[A-Za-z0-9]{8,32}$/;
export const HEX_SIG_RE = /^[a-fA-F0-9]{64}$/;
