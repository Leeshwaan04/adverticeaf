"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { getPaymentConfig, newIdempotencyKey, startPayment, type PaymentConfig, type PaymentResult } from "@/lib/payments/client";

/** End-to-end check of the Razorpay setup using the $1 test product, which the server only sells with TEST keys. */
export default function PayTestClient() {
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [key] = useState(() => newIdempotencyKey());

  useEffect(() => {
    let cancelled = false;
    getPaymentConfig().then((c) => {
      if (!cancelled) setCfg(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    setBusy(true);
    setResult(null);
    setResult(await startPayment({ sku: "test-1", idempotencyKey: key + String(Date.now()).slice(-6) }));
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg">Payment test</h1>
      <p className="mt-3 text-muted">Checks that the payment setup works end to end. It sells one test product, and only when the server is using Razorpay TEST keys.</p>

      <dl className="panel mt-8 divide-y divide-line text-sm">
        {[
          ["Configured", cfg === null ? "checking..." : cfg.configured ? "yes" : "no"],
          ["Mode", cfg?.mode ?? "n/a"],
          ["Currency", cfg?.currency ?? "n/a"],
          ["Promotions can be sold", cfg === null ? "checking..." : cfg.promotionsAvailable ? "yes" : "no (no storage bound)"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      {cfg?.mode === "test" && (
        <p className="mt-4 text-xs leading-relaxed text-muted">Use test card 4111 1111 1111 1111, any future expiry, any CVV. No real money moves.</p>
      )}

      <Button className="mt-6" size="lg" disabled={busy || !cfg?.configured || cfg.mode !== "test"} onClick={run}>
        {busy ? "Working..." : "Pay $1 (test)"}
      </Button>
      {cfg && cfg.mode === "live" && <p className="mt-3 text-sm text-muted">This page only works with test keys.</p>}

      {result && (
        <pre role="status" className="panel mt-6 overflow-x-auto p-4 text-xs text-fg">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
