"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, Check, Zap } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_FORMATS,
  type CampaignCategory,
  type CampaignFormat,
} from "@/data/campaigns";
import { saveAndPromoteCampaign } from "@/lib/campaigns/store";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PromoteModal({ open, onClose, onSuccess }: Props) {
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
  const [completed, setCompleted] = useState(false);

  function triggerConfetti() {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.brand.trim() || !form.tagline.trim()) return;

    setSubmitting(true);

    try {
      saveAndPromoteCampaign(
        {
          title: form.title,
          brand: form.brand,
          agency: {
            name: form.agencyName || form.brand,
            verified: false,
          },
          tagline: form.tagline,
          description: form.theAngle || form.tagline,
          hookBreakdown: {
            theHook: form.theHook || "High impact hook.",
            theAngle: form.theAngle || form.tagline,
            theResult: form.theResult || "Viral reach and conversions.",
          },
          mediaType: form.format === "Static / OOH" ? "image" : "video",
          mediaUrl: form.websiteUrl || "https://adverticeaf.com",
          thumbnailUrl:
            form.thumbnailUrl ||
            "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
          format: form.format,
          category: form.category,
          metrics: {
            views: "250k+",
          },
          creativeAngle: form.creativeAngle || "High-Impact Hook",
          websiteUrl: form.websiteUrl || "https://adverticeaf.com",
        },
        plan
      );

      triggerConfetti();
      setCompleted(true);
      setTimeout(() => {
        setCompleted(false);
        setSubmitting(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Promote to #1 Spotlight (24h Pin)"
      description="Pin your ad at the top of AdverticeAF with verified visibility to thousands of marketers, agency founders, and CMOs."
    >
      {completed ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
            <Trophy className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-fg">Spotlight Activated!</h3>
          <p className="mt-2 text-sm text-muted">
            Your campaign is now pinned to the #1 Spotlight on the Leaderboard.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePromote} className="space-y-4">
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
                  <span className="text-xl font-black text-amber-400">$29</span>
                  <span className="text-xs text-muted">/ day</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Guaranteed #1 Hero Card pin for 24 hours.
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
                  <span className="text-xl font-black text-amber-400">$79</span>
                  <span className="text-xs text-muted">/ week</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Full 7 days atop leaderboard + newsletter inclusion.
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

          <div className="flex items-center justify-between border-t border-line/60 pt-4">
            <div className="text-xs text-muted">
              Secure checkout: Instant activation on submission.
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
                <span>Lock In {plan === "24h" ? "$29" : "$79"} Placement</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
