"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { BOARD_MODE, POLICY } from "@/lib/board/config";
import { formatUsd } from "@/lib/board/format";

export interface CheckoutLine {
  label: string;
  amountCents: number;
}

export type PurchaseOutcome = { ok: true; checkoutUrl?: string } | { ok: false; error: string };

interface Props {
  lines: CheckoutLine[];
  /** Performs the purchase. In live mode it may return a hosted checkout URL to redirect to. */
  onConfirm: () => Promise<PurchaseOutcome>;
  /** Called after a purchase that did not need a redirect (demo, or an on-site confirmation). */
  onDone: () => void;
  disabled?: boolean;
  /** Extra reason shown above the button when disabled. */
  disabledReason?: string;
}

/**
 * Shared last step for every paid product: line items, total, terms and refund policy, pay button.
 * It never claims a payment happened unless onConfirm resolved ok.
 */
export default function CheckoutPanel({ lines, onConfirm, onDone, disabled, disabledReason }: Props) {
  const [agreed, setAgreed] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const termsId = useId();
  const total = lines.reduce((s, l) => s + l.amountCents, 0);
  const demo = BOARD_MODE === "demo";

  async function pay() {
    if (!agreed) {
      setError("Please agree to the Board rules and refund policy to proceed.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await onConfirm();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      onDone();
    } catch {
      setError("Something went wrong and nothing was charged. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <dl className="rounded-xl border border-line bg-ink p-4 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-4 py-1">
            <dt className="text-muted">{l.label}</dt>
            <dd className="font-medium tabular-nums text-fg">{formatUsd(l.amountCents)}</dd>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-semibold text-fg">Total (USD)</dt>
          <dd className="text-lg font-bold tabular-nums text-fg">{formatUsd(total)}</dd>
        </div>
      </dl>

      {demo && (
        <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs leading-relaxed text-fg">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          Demo mode: this is a simulation. No card is charged and no real placement is created.
        </p>
      )}

      <p className="text-xs leading-relaxed text-muted">{POLICY.paidPlacementNote}</p>

      <label htmlFor={termsId} className="flex cursor-pointer items-start gap-3 text-sm text-fg">
        <input
          id={termsId}
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
        />
        <span>
          I agree to the{" "}
          <Link href="/board/rules" target="_blank" className="text-accent underline underline-offset-2">
            Board rules
          </Link>{" "}
          and understand the refund policy: <span className="text-muted">{POLICY.refund}</span>
        </span>
      </label>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-bad/40 bg-bad/10 p-3.5 text-sm text-fg">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
      {disabled && disabledReason && <p className="text-xs text-muted">{disabledReason}</p>}

      <Button size="lg" className="w-full" disabled={pending || disabled} onClick={pay} aria-busy={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Processing...
          </>
        ) : demo ? (
          `Simulate payment of ${formatUsd(total)}`
        ) : (
          `Pay ${formatUsd(total)}`
        )}
      </Button>
      {!agreed && !pending && <p className="text-center text-xs text-muted">Tick the box above to continue.</p>}
    </div>
  );
}
