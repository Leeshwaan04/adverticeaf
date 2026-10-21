"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { AlertCircle, Check, Info, Loader2, Trophy, Zap } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_FORMATS } from "@/data/campaigns";
import {
  getPaymentConfig,
  newIdempotencyKey,
  startPayment,
  supportReference,
  type PaymentConfig,
} from "@/lib/payments/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PLANS = {
  "24h": { sku: "promo-24h", label: "24-hour Spotlight", price: "$29", per: "/ day", blurb: "Pinned to the top spotlight for 24 hours." },
  "7d": { sku: "promo-7d", label: "7-day Spotlight", price: "$79", per: "/ week", blurb: "Pinned to the top spotlight for 7 days." },
} as const;
type PlanId = keyof typeof PLANS;

const EMPTY = {
  title: "", brand: "", agencyName: "", tagline: "", theHook: "", websiteUrl: "",
  format: CAMPAIGN_FORMATS[0] as string, category: CAMPAIGN_CATEGORIES[0] as string,
};
type Field = "title" | "brand" | "tagline" | "websiteUrl";

export default function PromoteModal({ open, onClose, onSuccess }: Props) {
  const [plan, setPlan] = useState<PlanId>("24h");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [status, setStatus] = useState<"idle" | "paying" | "done">("idle");
  const [notice, setNotice] = useState<{ text: string; reference?: string | null; tone: "info" | "error" } | null>(null);
  const [idemKey] = useState(() => newIdempotencyKey());

  // Ask the server what is actually available, so the buyer never fills a form for something that cannot be sold.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getPaymentConfig().then((c) => {
      if (!cancelled) setCfg(c);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate(): boolean {
    const next: Partial<Record<Field, string>> = {};
    if (form.title.trim().length < 3) next.title = "Add a headline (at least 3 characters).";
    if (form.brand.trim().length < 2) next.brand = "Add the brand name.";
    if (form.tagline.trim().length < 3) next.tagline = "Add a one-line hook.";
    if (!/^https:\/\/\S+\.\S+/i.test(form.websiteUrl.trim())) next.websiteUrl = "Enter a full https link, like https://yourbrand.com/campaign.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!validate()) return;
    setStatus("paying");
    const res = await startPayment({
      sku: PLANS[plan].sku,
      description: `AdverticeAF ${PLANS[plan].label}`,
      idempotencyKey: idemKey,
      campaign: {
        title: form.title, brand: form.brand, agencyName: form.agencyName, tagline: form.tagline, theHook: form.theHook,
        websiteUrl: form.websiteUrl, format: form.format, category: form.category,
      },
    });
    if (res.ok) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setStatus("done");
      onSuccess();
      return;
    }
    setStatus("idle");
    if (res.reason === "dismissed") {
      setNotice({ text: res.message, tone: "info" });
      return;
    }
    setNotice({ text: res.message, reference: supportReference(res), tone: "error" });
  }

  const unavailable = cfg !== null && !cfg.promotionsAvailable;
  const busy = status === "paying";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Promote your campaign"
      description="Pin your campaign to the top spotlight on this page. This is paid placement, clearly labelled, and not an endorsement."
    >
      {status === "done" ? (
        <div className="flex flex-col items-center justify-center py-8 text-center" role="status">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
            <Trophy className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-fg">Payment received</h3>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Your {PLANS[plan].label.toLowerCase()} is booked. Spotlights run one at a time in the order they were paid for, so yours goes live
            right away if the slot is free, or as soon as the current one ends.
          </p>
          <Button className="mt-6" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={pay} noValidate className="space-y-4">
          {cfg?.mode === "test" && (
            <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs leading-relaxed text-fg">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
              <span>
                <strong>Test mode.</strong> No real money moves. In the payment window use Razorpay&apos;s test card 4111 1111 1111 1111 with any
                future expiry and any CVV.
              </span>
            </p>
          )}
          {unavailable && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-line-strong bg-raised p-3 text-sm leading-relaxed text-fg">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              Paid Spotlights are not open yet. Nothing can be bought right now and you will not be charged.
            </p>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-fg">Placement</legend>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(Object.keys(PLANS) as PlanId[]).map((id) => {
                const p = PLANS[id];
                const active = plan === id;
                return (
                  <label
                    key={id}
                    className={`relative flex min-h-24 cursor-pointer flex-col rounded-xl border p-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                      active ? "border-amber-400 bg-amber-400/10" : "border-line bg-surface hover:border-line-strong hover:bg-raised"
                    }`}
                  >
                    <input type="radio" name="plan" value={id} checked={active} onChange={() => setPlan(id)} className="sr-only" />
                    <span className="flex items-center justify-between text-sm font-bold text-fg">
                      {p.label}
                      {active && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-ink">
                          <Check className="h-2.5 w-2.5" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-black text-amber-400">{p.price}</span>
                      <span className="text-xs text-muted">{p.per}</span>
                    </span>
                    <span className="mt-1 text-xs text-muted">{p.blurb}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Brand name" name="brand" required value={form.brand} onChange={set("brand")} error={errors.brand} placeholder="Your brand" />
            <TextField label="Agency or creator" name="agencyName" optional value={form.agencyName} onChange={set("agencyName")} placeholder="Who made it" />
          </div>
          <TextField label="Campaign headline" name="title" required value={form.title} onChange={set("title")} error={errors.title} placeholder="Name of the campaign" />
          <TextField label="One-line hook" name="tagline" required value={form.tagline} onChange={set("tagline")} error={errors.tagline} placeholder="What makes it worth a look" />
          <TextField label="The hook in the ad" name="theHook" optional value={form.theHook} onChange={set("theHook")} placeholder="The opening line or idea" />
          <TextField
            label="Campaign or landing page link"
            name="websiteUrl"
            required
            inputMode="url"
            value={form.websiteUrl}
            onChange={set("websiteUrl")}
            error={errors.websiteUrl}
            hint="https only. Shorteners, invite links and IP addresses are not accepted."
            placeholder="https://yourbrand.com/campaign"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Format" name="format" options={CAMPAIGN_FORMATS} value={form.format} onChange={set("format")} />
            <SelectField label="Category" name="category" options={CAMPAIGN_CATEGORIES} value={form.category} onChange={set("category")} />
          </div>

          {notice && (
            <div
              role={notice.tone === "error" ? "alert" : "status"}
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm text-fg ${
                notice.tone === "error" ? "border-bad/40 bg-bad/10" : "border-line-strong bg-raised"
              }`}
            >
              <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${notice.tone === "error" ? "text-bad" : "text-muted"}`} aria-hidden="true" />
              <div>
                <p>{notice.text}</p>
                {notice.reference && (
                  <p className="mt-1 font-mono text-xs text-muted">
                    {notice.reference}. Quote this if you contact us.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-xs leading-relaxed text-muted">
              Payment is handled by Razorpay. We never see your card details. If we cannot deliver your placement, we refund it in full.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={busy || unavailable || cfg === null}
                aria-busy={busy}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Zap className="h-4 w-4" aria-hidden="true" />}
                <span>{busy ? "Opening payment..." : `Pay ${PLANS[plan].price}`}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
