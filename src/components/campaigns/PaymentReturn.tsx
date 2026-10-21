"use client";

import { useEffect, useState } from "react";

export default function PaymentReturn() {
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get("order_id");
    if (!order) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    // The provider's status query parameter is not evidence of payment.
    async function check() {
      try {
        const response = await fetch(`/api/payments/status?order_id=${encodeURIComponent(order!)}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Payment confirmation is temporarily unavailable. Do not pay again; check back shortly.");
        const data = await response.json();
        if (data.status === "active" || data.status === "scheduled") {
          setMessage(`${data.test_mode ? "Test payment" : "Payment"} verified. Your placement ${data.status === "active" ? "is active" : `starts ${new Date(data.starts_at).toLocaleString()}`} and ends ${new Date(data.ends_at).toLocaleString()}.`);
          setCanRetry(false);
          return;
        }
        if (data.status === "revoked" || data.status === "expired") {
          setMessage(data.status === "revoked" ? "This placement has been withdrawn following a refund or dispute. Contact support for help." : "Your paid placement has ended.");
          setCanRetry(false);
          return;
        }
        setMessage(params.get("checkout") === "cancelled"
          ? "Checkout was cancelled. No placement is active unless payment is verified."
          : "Awaiting verified payment confirmation. If you paid, do not pay again; confirmation may take a few minutes.");
        if (++attempts < 20) timer = setTimeout(check, 3000);
        else setCanRetry(true);
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(error instanceof Error ? error.message : "Could not check payment. Please try again.");
          setCanRetry(true);
        }
      }
    }
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [retry]);

  if (!message) return null;
  return (
    <div role="status" className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-fg">
      <p>{message}</p>
      {canRetry && <button type="button" onClick={() => { setCanRetry(false); setRetry((value) => value + 1); }} className="mt-2 font-semibold underline">Check payment again</button>}
    </div>
  );
}
