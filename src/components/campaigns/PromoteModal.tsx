"use client";

import { useRef, useState } from "react";
import { Check, Zap } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_FORMATS,
  type CampaignCategory,
  type CampaignFormat,
} from "@/data/campaigns";
import { PROMOTION_PLANS } from "@/lib/campaigns/promotion";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PromoteModal({ open, onClose }: Props) {
  const [plan, setPlan] = useState<"24h" | "7d">("24h");
  const [form, setForm] = useState({
    title: "",
    brand: "",
    agencyName: "",
    tagline: "",
    theHook: "",
    theAngle: "",
    theResult: "",
    format: "Reel / TikTok" as CampaignFormat,
    category: "DTC & Consumer" as CampaignCategory,
    thumbnailUrl: "",
    websiteUrl: "",
    creativeAngle: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, campaign: form }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Checkout is not available on this server. No payment was taken.");
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout is temporarily unavailable.");
      const checkout = new URL(result.checkout_url);
      if (checkout.protocol !== "https:" || checkout.username || checkout.password ||
          !["checkout.dodopayments.com", "test.checkout.dodopayments.com"].includes(checkout.hostname)) {
        throw new Error("Invalid checkout response. Please try again later.");
      }
      window.location.assign(checkout.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout. Please try again.");
      busy.current = false;
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy.current) onClose(); }}
      title="Book a Spotlight Placement"
      description="Pay securely with Dodo Payments. Verified purchases receive the full placement duration, queued after existing bookings."
    >
        <form onSubmit={handlePromote} className="space-y-4">
          <fieldset disabled={submitting} className="space-y-4">
          {/* Plan Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Choose Placement Plan
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlan("24h")}
                className={`relative flex flex-col rounded-xl border p-3.5 text-left transition-all ${
                  plan === "24h"
                    ? "border-amber-400 bg-amber-400/10 shadow-sm"
                    : "border-line bg-surface hover:border-line-strong hover:bg-raised"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">24h Spotlight</span>
                  {plan === "24h" && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-ink">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-amber-400">${PROMOTION_PLANS["24h"].cents / 100}</span>
                  <span className="text-xs text-muted">/ day</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                   One 24-hour placement in the booking queue.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPlan("7d")}
                className={`relative flex flex-col rounded-xl border p-3.5 text-left transition-all ${
                  plan === "7d"
                    ? "border-amber-400 bg-amber-400/10 shadow-sm"
                    : "border-line bg-surface hover:border-line-strong hover:bg-raised"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">7-Day Hero Pin</span>
                  {plan === "7d" && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-ink">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-black text-amber-400">${PROMOTION_PLANS["7d"].cents / 100}</span>
                  <span className="text-xs text-muted">/ week</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                   One full 7-day placement in the booking queue.
                </p>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-fg">Brand Name *</label>
              <input
                type="text"
                required
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. Duolingo"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-fg">Agency / Creator</label>
              <input
                type="text"
                value={form.agencyName}
                onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                placeholder="e.g. In-House / Mischief"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-fg">Campaign Headline *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. The Unhinged Mascot TikTok Blitz"
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-fg">One-line Hook / Punchline *</label>
            <input
              type="text"
              required
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="e.g. Turning a green owl into Gen-Z's favorite chaos mascot."
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-fg">Campaign / Landing Page URL *</label>
              <input
                type="url"
                required
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://yourbrand.com/campaign"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-fg">Thumbnail Image URL</label>
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                placeholder="https://... image link"
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-fg">Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as CampaignFormat })}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              >
                {CAMPAIGN_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-fg">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as CampaignCategory })}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              >
                {CAMPAIGN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
            <div className="text-xs text-muted">
              USD, tax included. Activation requires verified payment.
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-ink shadow-lg shadow-amber-400/20 transition-all hover:bg-amber-300 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                <span>{submitting ? "Opening checkout..." : `Pay $${PROMOTION_PLANS[plan].cents / 100} with Dodo`}</span>
              </button>
            </div>
          </div>
          </fieldset>
        </form>
    </Modal>
  );
}
