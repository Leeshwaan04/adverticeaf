import { currencyOf, isTestKey, type Env } from "../../_lib/env";
import { json } from "../../_lib/http";

/** GET /api/payments/config : lets the UI show honest states (not set up, test mode) BEFORE a buyer fills in a form. */
export const onRequestGet = async ({ env }: { env: Env }): Promise<Response> => {
  const configured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  return json(
    {
      ok: true,
      configured,
      mode: configured ? (isTestKey(env.RAZORPAY_KEY_ID) ? "test" : "live") : null,
      currency: currencyOf(env),
      // Promotions need somewhere to be stored; without it they are not for sale.
      promotionsAvailable: configured && Boolean(env.PAYMENTS),
    },
    200,
    { "Cache-Control": "public, max-age=30" },
  );
};
