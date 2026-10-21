/// <reference types="@cloudflare/workers-types" />

/** Bindings and secrets for the payment functions. Set in the Cloudflare Pages dashboard (never in the repo). */
export interface Env {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  /** Secret configured on the Razorpay webhook. Required for /api/payments/webhook. */
  RAZORPAY_WEBHOOK_SECRET?: string;
  /** ISO currency code for new orders. Defaults to USD. */
  RAZORPAY_CURRENCY?: string;
  /** Comma-separated extra origins allowed to call the API (previews, localhost). */
  ALLOWED_ORIGINS?: string;
  /** KV namespace used as the order and promotion ledger. Required for products that need fulfilment. */
  PAYMENTS?: KVNamespace;
}

export const isTestKey = (keyId: string) => keyId.startsWith("rzp_test_");
export const currencyOf = (env: Env) => (env.RAZORPAY_CURRENCY || "USD").toUpperCase();
