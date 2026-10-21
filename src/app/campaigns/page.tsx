"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Plus,
  Sparkles,
  Trophy,
  Calendar,
  CheckCircle2,
  Video,
  Search,
  Zap,
} from "lucide-react";
import CampaignCard from "@/components/campaigns/CampaignCard";
import PromotedSpotlight from "@/components/campaigns/PromotedSpotlight";
import PromoteModal from "@/components/campaigns/PromoteModal";
import { fetchPaidPromotion } from "@/lib/campaigns/paid";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_FORMATS,
  type Campaign,
  type CampaignCategory,
  type CampaignFormat,
} from "@/data/campaigns";
import {
  getAllCampaigns,
  getPromotedCampaign,
  saveUserCampaign,
} from "@/lib/campaigns/store";

type TimePeriod = "today" | "week" | "all";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => getAllCampaigns());
  const [promotedItem, setPromotedItem] = useState<Campaign>(() => getPromotedCampaign());
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<CampaignFormat | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CampaignCategory | null>(null);

  // Modals
  const [submitOpen, setSubmitOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  // Quick Submit Form State
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
  const [formSuccess, setFormSuccess] = useState(false);

  function refresh() {
    setCampaigns(getAllCampaigns());
    // A paid Spotlight (from the server) stays put; otherwise fall back to the local featured campaign.
    setPromotedItem((prev) => ("paid" in prev ? prev : getPromotedCampaign()));
    void fetchPaidPromotion().then((paid) => {
      if (paid) setPromotedItem(paid);
    });
  }

  // Show the paid Spotlight that is live right now, if any. Nothing paid, or no payment backend: unchanged.
  useEffect(() => {
    let cancelled = false;
    fetchPaidPromotion().then((paid) => {
      if (!cancelled && paid) setPromotedItem(paid);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter and sort campaigns
  const filtered = campaigns
    .filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchBrand = c.brand.toLowerCase().includes(q);
        const matchAgency = c.agency.name.toLowerCase().includes(q);
        const matchTagline = c.tagline.toLowerCase().includes(q);
        if (!matchTitle && !matchBrand && !matchAgency && !matchTagline) return false;
      }
      if (selectedFormat && c.format !== selectedFormat) return false;
      if (selectedCategory && c.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => b.initialUpvotes - a.initialUpvotes);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.brand.trim() || !form.tagline.trim()) return;

    saveUserCampaign({
      title: form.title,
      brand: form.brand,
      agency: {
        name: form.agencyName || form.brand,
        verified: false,
      },
      tagline: form.tagline,
      description: form.theAngle || form.tagline,
      hookBreakdown: {
        theHook: form.theHook || "High-impact opening visual hook.",
        theAngle: form.theAngle || form.tagline,
        theResult: form.theResult || "Viral social traction.",
      },
      mediaType: form.format === "Static / OOH" ? "image" : "video",
      mediaUrl: form.websiteUrl || "https://adverticeaf.com",
      thumbnailUrl:
        form.thumbnailUrl ||
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      format: form.format,
      category: form.category,
      metrics: {
        views: "100k+",
      },
      creativeAngle: form.creativeAngle || "Viral Creativity",
      websiteUrl: form.websiteUrl || "https://adverticeaf.com",
    });

    setFormSuccess(true);
    refresh();
    setTimeout(() => {
      setSubmitOpen(false);
      setFormSuccess(false);
      setForm({
        title: "",
        brand: "",
        agencyName: "",
        tagline: "",
        theHook: "",
        theAngle: "",
        theResult: "",
        format: "Reel / TikTok",
        category: "DTC & Consumer",
        thumbnailUrl: "",
        websiteUrl: "",
        creativeAngle: "",
      });
    }, 1200);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Creative Leaderboard
            </span>
            <span className="text-xs text-muted">Product Hunt for Creative Campaigns</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            Campaign Showcase
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted">
            The front page of viral advertising. Discover, upvote, and study the hooks, angles,
            and creative breakdowns of top global ads.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setPromoteOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/15 px-4 py-2.5 text-sm font-bold text-amber-300 shadow-sm transition-all hover:bg-amber-400/25"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Promote to #1 ($29)</span>
          </button>

          <Button
            variant="primary"
            onClick={() => setSubmitOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-accent/20"
          >
            <Plus className="h-4 w-4" />
            <span>Launch Free</span>
          </Button>

          <Link
            href="/agencies"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted hover:border-line-strong hover:text-fg"
          >
            Agencies
          </Link>
        </div>
      </div>

      {/* Promoted Spotlight Hero Section */}
      <div className="mt-8">
        <PromotedSpotlight
          campaign={promotedItem}
          onPromoteClick={() => setPromoteOpen(true)}
          onUpvoteChange={refresh}
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="mt-10 flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns, brands, or hooks..."
            className="w-full rounded-xl border border-line bg-surface pl-10 pr-4 py-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Time Period Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-surface p-1">
          <button
            type="button"
            onClick={() => setPeriod("today")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              period === "today"
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-muted hover:text-fg"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Today
          </button>
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              period === "week"
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-muted hover:text-fg"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            This Week
          </button>
          <button
            type="button"
            onClick={() => setPeriod("all")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              period === "all"
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-muted hover:text-fg"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            All-Time Best
          </button>
        </div>
      </div>

      {/* Format Selector Pills */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedFormat(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selectedFormat === null
              ? "bg-fg text-ink font-bold"
              : "border border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
          }`}
        >
          All Formats
        </button>
        {CAMPAIGN_FORMATS.map((f) => {
          const active = selectedFormat === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFormat(active ? null : f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-fg text-ink font-bold"
                  : "border border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Category Sub-filter */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-muted">Industry:</span>
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
            selectedCategory === null
              ? "bg-raised text-accent font-bold"
              : "text-muted hover:text-fg"
          }`}
        >
          All
        </button>
        {CAMPAIGN_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(active ? null : cat)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                active ? "bg-raised text-accent font-bold" : "text-muted hover:text-fg"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Campaigns Grid */}
      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/30 p-8 text-center">
            <Video className="h-10 w-10 text-muted/50" />
            <h3 className="mt-3 text-lg font-bold text-fg">No campaigns found</h3>
            <p className="mt-1 text-sm text-muted">
              Try adjusting your search query or category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((campaign, idx) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                rank={idx + 1}
                onUpvoteChange={refresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Launch Campaign Modal */}
      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Launch a Creative Campaign"
        description="Share your brand's latest ad, viral reel, or guerrilla stunt with 50,000+ marketers."
        maxWidth="max-w-xl"
      >
        {formSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-ok" />
            <h3 className="mt-4 text-xl font-bold text-fg">Campaign Launched!</h3>
            <p className="mt-1 text-sm text-muted">
              Your campaign is now live on the AdverticeAF leaderboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Campaign Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Liquid Death: Better Than Grandma's Tea"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Brand / Client *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liquid Death"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Credited Agency (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mischief @ No Fixed Address"
                  value={form.agencyName}
                  onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Format *
                </label>
                <select
                  value={form.format}
                  onChange={(e) =>
                    setForm({ ...form, format: e.target.value as CampaignFormat })
                  }
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  {CAMPAIGN_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Industry *
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as CampaignCategory })
                  }
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  {CAMPAIGN_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Tagline / Pitch *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Turning sweet tea tropes into aggressive, heavy-metal thirst murder."
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                The Hook (First 3 Seconds)
              </label>
              <textarea
                rows={2}
                placeholder="What grabs the viewer's attention instantly?"
                value={form.theHook}
                onChange={(e) => setForm({ ...form, theHook: e.target.value })}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Campaign / Video URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.websiteUrl}
                  onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setSubmitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Publish Free Campaign
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Paid Promote Modal */}
      <PromoteModal
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
