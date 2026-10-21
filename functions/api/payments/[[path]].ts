import { handlePaymentRequest, type PaymentEnv } from "../../../server/payments.ts";

export function onRequest(context: { request: Request; env: PaymentEnv }) {
  return handlePaymentRequest(context.request, context.env);
}
