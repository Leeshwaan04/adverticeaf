"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronUp,
  Crown,
  Flame,
  Globe,
  Plus,
  Share2,
  Sparkles,
  Trophy,
  TrendingUp,
  MousePointerClick,
  CheckCircle2,
} from "lucide-react";
import Avatar from "@/components/board/Avatar";
import CheckoutPanel from "@/components/board/CheckoutPanel";
import ListingFields from "@/components/board/ListingFields";
import ShareCard from "@/components/board/ShareCard";
import BadgeEmbed from "@/components/board/BadgeEmbed";
import AlertOptIn from "@/components/board/AlertOptIn";
import SuccessBurst from "@/components/board/SuccessBurst";
import OutbidNav, { type NavTabId } from "@/components/board/OutbidNav";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/board/api";
import {
  RULES,
  SEASONS,
  type BoardCategory,
  type SeasonId,
} from "@/lib/board/config";
import { formatUsd } from "@/lib/board/format";
import { checkListingUrl, type ListingErrors, type ListingFields as Fields } from "@/lib/board/listing";
import type {
  ActivityItem,
  BoardRow,
  BoardSnapshot,
  HallOfFame,
  Listing,
  ListingDetail,
  Quote,
} from "@/lib/board/types";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

function getSeasonResetLabel(season: SeasonId, now: number): string | null {
  if (season === "all") return null;
  const d = new Date(now);
  if (season === "daily") {
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
    const diff = Math.max(0, next - now);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `Resets in ${h}h ${m}m`;
  }
  if (season === "weekly") {
    const day = d.getUTCDay();
    const daysUntilMon = ((8 - (day === 0 ? 7 : day)) % 7) || 7;
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysUntilMon);
    const diff = Math.max(0, next - now);
    const days = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `Resets in ${days}d ${h}h` : `Resets in ${h}h`;
  }
  if (season === "monthly") {
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    const diff = Math.max(0, next - now);
    const days = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return `Resets in ${days}d ${h}h`;
  }
  return null;
}

export default function BoardPage() {
  const [season, setSeason] = useState<SeasonId>("all");
  const [category, setCategory] = useState<BoardCategory | null>(null);
  const [activeTab, setActiveTab] = useState<NavTabId>("all");
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);
  const [hof, setHof] = useState<HallOfFame>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [myListings, setMyListings] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Bid modal state
  const [bidOpen, setBidOpen] = useState(false);
  const [targetDomain, setTargetDomain] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [bidAmountCents, setBidAmountCents] = useState(RULES.minBidCents * 5);
  const [customAmountStr, setCustomAmountStr] = useState("");
  const [listingForm, setListingForm] = useState<Fields>({
    url: "",
    name: "",
    tagline: "",
    category: "Marketing",
  });
  const [formErrors, setFormErrors] = useState<ListingErrors>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleNavSelect = (tab: NavTabId) => {
    setActiveTab(tab);
    if (tab === "all" || tab === "leaderboards" || tab === "explore") {
      setCategory(null);
    } else {
      setCategory(tab as BoardCategory);
    }
  };

  const openBidNew = useCallback(() => {
    setIsNew(true);
    setTargetDomain(null);
    setListingForm({
      url: "",
      name: "",
      tagline: "",
      category: category ?? "Marketing",
    });
    setFormErrors({});
    const minLead = snapshot ? snapshot.leadCostCents : RULES.minBidCents;
    setBidAmountCents(Math.max(minLead, 1000));
    setCustomAmountStr("");
    setBidOpen(true);
  }, [category, snapshot]);

  useEffect(() => {
    const handleOpen = () => openBidNew();
    window.addEventListener("adv:open-bid", handleOpen);
    return () => window.removeEventListener("adv:open-bid", handleOpen);
  }, [openBidNew]);

  // Success celebration state
  const [successItem, setSuccessItem] = useState<{
    listing: Listing;
    rank: number;
    amountCents: number;
  } | null>(null);

  // Share card modal state
  const [shareTarget, setShareTarget] = useState<{
    listing: Listing;
    rank: number;
  } | null>(null);

  // Load board data
  useEffect(() => {
    let unmounted = false;

    async function loadData() {
      try {
        const [snap, fHof, fAct, mine] = await Promise.all([
          api.getBoard(season, category),
          api.getHallOfFame(),
          api.getActivity(12),
          api.getMyListings(),
        ]);
        if (!unmounted) {
          setSnapshot(snap);
          setHof(fHof);
          setActivity(fAct);
          setMyListings(mine);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load board data:", err);
        if (!unmounted) setLoading(false);
      }
    }

    loadData();
    const unsub = api.subscribe(() => {
      loadData();
    });

    return () => {
      unmounted = true;
      unsub();
    };
  }, [season, category]);

  // Recalculate quote whenever bid modal inputs change
  useEffect(() => {
    if (!bidOpen) return;
    let unmounted = false;

    const input = {
      amountCents: bidAmountCents,
      season,
      ...(isNew ? { url: listingForm.url } : { domain: targetDomain ?? undefined }),
    };

    api
      .quote(input)
      .then((q) => {
        if (!unmounted) setQuote(q);
      })
      .catch(() => {
        if (!unmounted) setQuote(null);
      });

    return () => {
      unmounted = true;
    };
  }, [bidOpen, bidAmountCents, targetDomain, isNew, listingForm.url, season]);


  function openBidExisting(row: BoardRow) {
    setIsNew(false);
    setTargetDomain(row.listing.domain);
    const suggested = row.climbCostCents ?? RULES.minBidCents;
    setBidAmountCents(Math.max(suggested, RULES.minBidCents));
    setCustomAmountStr("");
    setBidOpen(true);
  }

  function handleFormChange(field: keyof Fields, val: string) {
    setListingForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === "url" && !prev.name.trim() && val.trim()) {
        try {
          const str = val.startsWith("http") ? val : `https://${val}`;
          const u = new URL(str);
          const host = u.hostname.replace(/^www\./, "");
          const base = host.split(".")[0];
          if (base) {
            next.name = base.charAt(0).toUpperCase() + base.slice(1);
          }
        } catch {
          // ignore until valid
        }
      }
      return next;
    });
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleConfirmPurchase() {
    if (isNew) {
      const check = checkListingUrl(listingForm.url);
      if (!check.ok) {
        setFormErrors({ url: check.error });
        return { ok: false as const, error: check.error };
      }
      if (!listingForm.name.trim()) {
        setFormErrors({ name: "Enter a name for your listing." });
        return { ok: false as const, error: "Enter a name for your listing." };
      }
      if (!listingForm.category) {
        setFormErrors({ category: "Select a category." });
        return { ok: false as const, error: "Select a category." };
      }
    }

    const idempotencyKey = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const res = await api.purchaseBid(
      {
        domain: isNew ? undefined : targetDomain ?? undefined,
        newListing:
          isNew && listingForm.category
            ? {
                url: listingForm.url,
                name: listingForm.name,
                tagline: listingForm.tagline,
                category: listingForm.category as BoardCategory,
              }
            : undefined,
        amountCents: bidAmountCents,
        acceptedTerms: true,
      },
      idempotencyKey
    );

    if (res.ok && res.listing) {
      const snap = await api.getBoard(season, category);
      setSnapshot(snap);
      const row = snap.rows.find((r) => r.listing.domain === res.listing!.domain);
      setSuccessItem({
        listing: res.listing,
        rank: row ? row.rank : 1,
        amountCents: bidAmountCents,
      });
    }

    return res;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      {/* Mega Menu / Outbid Category Navbar from screenshot */}
      <div className="sticky top-16 z-30 -mx-4 mb-8 bg-ink/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-line/40">
        <OutbidNav activeTab={activeTab} onSelect={handleNavSelect} />
      </div>

      {/* Top Banner & Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e2573f]/15 px-3 py-1 text-xs font-semibold text-[#e2573f]">
              <Sparkles className="h-3.5 w-3.5" />
              Live Attention Market
            </span>
            <span className="text-xs text-muted">Ranked transparently by total spend</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl lg:text-5xl font-display">
            Outbid & Rank #1
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted">
            The live pay-to-rank public leaderboard. Top bidders hold the crown and get direct eyeballs from creators, founders, and advertisers worldwide.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={openBidNew}
            className="flex items-center gap-2 bg-[#e2573f] hover:bg-[#cf4b34] text-white shadow-lg shadow-[#e2573f]/25 border-none"
          >
            <Plus className="h-4 w-4" />
            Add Your Link
          </Button>
          <Link
            href="/board/rules"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-muted hover:border-line-strong hover:text-fg"
          >
            Rules & FAQ
          </Link>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface/50 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Globe className="h-3.5 w-3.5 text-[#e2573f]" />
            Listings Ranked
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-fg font-display">
            {snapshot ? snapshot.stats.listings : "..."}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface/50 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <TrendingUp className="h-3.5 w-3.5 text-ok" />
            Total Volume
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-fg font-display">
            {snapshot ? formatUsd(snapshot.stats.totalCents) : "..."}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface/50 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <MousePointerClick className="h-3.5 w-3.5 text-[#e2573f]" />
            Clicks Delivered
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-fg font-display">
            {snapshot ? snapshot.stats.clicks.toLocaleString() : "..."}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface/50 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            Cost to Take #1
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#e2573f] font-display">
            {snapshot ? formatUsd(snapshot.leadCostCents) : "..."}
          </p>
        </div>
      </div>

      {/* Season Tabs & Active Category Indicator */}
      <div className="mt-8 flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Season selector with countdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-surface p-1 border border-line/60">
            {SEASONS.map((s) => {
              const active = season === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeason(s.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                    active
                      ? "bg-[#e2573f] text-white shadow-sm font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {getSeasonResetLabel(season, now) && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-line/50 bg-surface/60 px-2.5 py-1 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {getSeasonResetLabel(season, now)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Viewing:</span>
          <span className="rounded-md border border-line bg-raised px-2.5 py-1 font-semibold text-fg">
            {category ?? "All Categories"}
          </span>
          {category && (
            <button
              type="button"
              onClick={() => handleNavSelect("all")}
              className="text-[#e2573f] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Leaderboard on Left, Activity & Hall of Fame on Right */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Leaderboard Table (8 cols on lg) */}
        <div className="lg:col-span-8">
          {/* King of the Hill #1 Spotlight Card */}
          {snapshot && snapshot.rows.length > 0 && !category && (
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#1a1714] to-[#12100e] p-5 sm:p-6 shadow-xl shadow-amber-500/5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <Avatar
                      name={snapshot.rows[0].listing.name}
                      domain={snapshot.rows[0].listing.domain}
                      size={54}
                      className="ring-2 ring-amber-400/40"
                    />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black shadow-md">
                      <Crown className="h-3.5 w-3.5 fill-current" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                        King of the Hill #1
                      </span>
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-muted">
                        {snapshot.rows[0].listing.category}
                      </span>
                    </div>
                    <a
                      href={snapshot.rows[0].listing.url}
                      target="_blank"
                      rel="sponsored nofollow"
                      onClick={() => api.recordClick(snapshot.rows[0].listing.domain)}
                      className="group mt-1 flex items-center gap-1.5 text-lg font-black text-fg hover:text-amber-300"
                    >
                      <span className="truncate">{snapshot.rows[0].listing.name}</span>
                      <ArrowUpRight className="h-4 w-4 text-muted group-hover:text-amber-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                    <p className="text-xs text-muted truncate max-w-md">
                      {snapshot.rows[0].listing.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">Total Spent</div>
                    <div className="text-xl font-black text-amber-300 font-display">
                      {formatUsd(snapshot.rows[0].totalCents)}
                    </div>
                    <div className="text-[11px] text-muted">
                      {snapshot.rows[0].clicks} clicks
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsNew(false);
                      setTargetDomain(snapshot.rows[0].listing.domain);
                      setBidAmountCents(Math.max(snapshot.leadCostCents, 1000));
                      setCustomAmountStr("");
                      setBidOpen(true);
                    }}
                    className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold shadow-lg shadow-amber-400/20 border-none whitespace-nowrap text-xs"
                  >
                    <Crown className="h-3.5 w-3.5 mr-1" />
                    Outbid for {formatUsd(snapshot.leadCostCents)}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-line bg-surface/30">
              <p className="text-sm text-muted">Loading live leaderboard...</p>
            </div>
          ) : !snapshot || snapshot.rows.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/20 p-8 text-center">
              <Crown className="h-12 w-12 text-muted/50" />
              <h3 className="mt-4 text-lg font-bold text-fg">No listings yet in this window</h3>
              <p className="mt-1 text-sm text-muted">
                Be the first to claim the #1 spot on this board.
              </p>
              <Button variant="primary" onClick={openBidNew} className="mt-5">
                Claim #1 Now ({formatUsd(RULES.minBidCents)})
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <div className="divide-y divide-line">
                {snapshot.rows.map((row) => {
                  const isTop1 = row.rank === 1;
                  return (
                    <div
                      key={row.listing.domain}
                      className={`flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                        isTop1
                          ? "bg-gradient-to-r from-accent/5 via-transparent to-transparent"
                          : "hover:bg-raised/40"
                      }`}
                    >
                      {/* Left: Rank + Avatar + Details */}
                      <div className="flex items-start gap-3.5 sm:items-center">
                        {/* Rank indicator */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center font-display font-extrabold">
                          {row.rank === 1 ? (
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                              <Crown className="h-5 w-5" />
                            </span>
                          ) : row.rank === 2 ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-300/20 text-slate-200">
                              #2
                            </span>
                          ) : row.rank === 3 ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-700/20 text-amber-400">
                              #3
                            </span>
                          ) : (
                            <span className="text-base text-muted">#{row.rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar name={row.listing.name} domain={row.listing.domain} size={42} />

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={row.listing.url}
                              target="_blank"
                              rel="sponsored nofollow"
                              onClick={() => api.recordClick(row.listing.domain)}
                              className="group flex items-center gap-1 font-bold text-fg hover:text-accent"
                            >
                              <span className="truncate">{row.listing.name}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
                            </a>
                            {row.listing.verified && (
                              <span title="Verified domain owner">
                                <CheckCircle2 className="h-4 w-4 text-ok" />
                              </span>
                            )}
                            <span className="rounded-md bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
                              {row.listing.category}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-muted">
                            {row.listing.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Right: Spend, Clicks, Actions */}
                      <div className="flex items-center justify-between gap-4 border-t border-line/60 pt-3 sm:border-0 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <div className="text-base font-bold text-fg">
                            {formatUsd(row.totalCents)}
                          </div>
                          <div className="text-xs text-muted">
                            {row.clicks} click{row.clicks === 1 ? "" : "s"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setShareTarget({ listing: row.listing, rank: row.rank })
                            }
                            aria-label={`Share ${row.listing.name}`}
                            className="rounded-xl border border-line p-2 text-muted hover:border-line-strong hover:text-fg"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>

                          <Button
                            variant={isTop1 ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => openBidExisting(row)}
                            className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                            {row.climbCostCents
                              ? `Pass for ${formatUsd(row.climbCostCents)}`
                              : "Boost Total"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Hall of Fame & Live Activity (4 cols on lg) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Hall of Fame Box */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-fg">
                Hall of Fame
              </h2>
            </div>
            <p className="mt-2 text-xs text-muted">
              Winners of the most recently closed seasons.
            </p>
            <div className="mt-4 space-y-3">
              {hof.map((entry) => (
                <div
                  key={entry.season}
                  className="flex items-center justify-between rounded-xl bg-raised/50 p-3"
                >
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                      {entry.label}
                    </span>
                    <p className="text-sm font-bold text-fg">
                      {entry.winner ? entry.winner.listing.name : "No winner"}
                    </p>
                  </div>
                  {entry.winner && (
                    <span className="rounded-md bg-surface px-2 py-1 text-xs font-bold text-muted">
                      {formatUsd(entry.winner.totalCents)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Recent Activity */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Flame className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-fg">
                Recent Bids
              </h2>
            </div>
            <div className="mt-3 divide-y divide-line/60">
              {activity.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted">No recent bids yet</p>
              ) : (
                activity.slice(0, 8).map((act) => (
                  <div key={act.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-semibold text-fg">{act.name}</span>
                        {act.tookLead && (
                          <span className="inline-flex items-center rounded bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                            Took #1
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted">
                        {Math.max(1, Math.round((now - act.at) / 60000))}m ago
                      </span>
                    </div>
                    <span className="font-bold text-accent">+{formatUsd(act.amountCents)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick link to your listings */}
          {myListings.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Your Listings on this Device
              </h3>
              <div className="mt-2 space-y-2">
                {myListings.map((m) => (
                  <div
                    key={m.listing.domain}
                    className="flex items-center justify-between rounded-lg bg-raised/40 p-2 text-xs"
                  >
                    <span className="truncate font-medium text-fg">{m.listing.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setShareTarget({
                          listing: m.listing,
                          rank: m.ranks.all.rank ?? 1,
                        })
                      }
                      className="text-accent hover:underline"
                    >
                      Share Card
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bid Modal */}
      <Modal
        open={bidOpen}
        onClose={() => setBidOpen(false)}
        title={isNew ? "Add Your Link to The Board" : "Boost Placement"}
        description={
          isNew
            ? "Submit your brand link and pay to claim your spot on the live leaderboard."
            : `Increase your total spend to climb ranks or take the #1 spot.`
        }
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          {/* If new listing, render input fields */}
          {isNew && (
            <ListingFields
              values={listingForm}
              errors={formErrors}
              onChange={handleFormChange}
            />
          )}

          {/* Amount Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Select Bid Amount
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {QUICK_AMOUNTS.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => {
                    setBidAmountCents(cents);
                    setCustomAmountStr("");
                  }}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                    bidAmountCents === cents && !customAmountStr
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line bg-surface hover:border-line-strong hover:text-fg"
                  }`}
                >
                  {formatUsd(cents)}
                </button>
              ))}
            </div>

            {/* Custom Amount input */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">Or enter amount ($ USD):</span>
              <input
                type="number"
                min={RULES.minBidCents / 100}
                step={RULES.stepCents / 100}
                placeholder="Custom USD"
                value={customAmountStr}
                onChange={(e) => {
                  setCustomAmountStr(e.target.value);
                  const parsed = parseInt(e.target.value, 10);
                  if (parsed && parsed > 0) {
                    setBidAmountCents(parsed * 100);
                  }
                }}
                className="w-32 rounded-lg border border-line bg-raised px-3 py-1.5 text-sm font-medium text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Live Quote Preview */}
          <div className="rounded-xl border border-line bg-raised/50 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Projected Result</span>
              {!quote && <span>Calculating...</span>}
            </div>
            {quote && quote.ok ? (
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Projected Rank</p>
                  <p className="text-xl font-extrabold text-accent">
                    #{quote.newRank}
                    <span className="ml-1 text-xs font-normal text-muted">of {quote.of}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">New Total Spend</p>
                  <p className="text-xl font-bold text-fg">
                    {formatUsd(quote.newTotalCents ?? bidAmountCents)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted">
                {quote?.error ?? "Enter a valid bid amount to see live projected rank."}
              </p>
            )}
          </div>

          {/* Checkout Panel */}
          <CheckoutPanel
            lines={[
              {
                label: isNew
                  ? `New Board Placement (${listingForm.name || "Brand"})`
                  : `Rank Boost (${targetDomain})`,
                amountCents: bidAmountCents,
              },
            ]}
            onConfirm={handleConfirmPurchase}
            onDone={() => setBidOpen(false)}
            disabled={!quote || !quote.ok}
            disabledReason={quote && !quote.ok ? quote.error : undefined}
          />
        </div>
      </Modal>

      {/* Success Celebration Modal */}
      <Modal
        open={successItem !== null}
        onClose={() => setSuccessItem(null)}
        title="Placement Confirmed!"
        description="Your placement is live on the AdverticeAF Board."
        maxWidth="max-w-2xl"
      >
        {successItem && (
          <div className="space-y-6 text-center">
            <div className="py-2">
              <SuccessBurst>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-accent/25">
                  <Crown className="h-8 w-8" />
                </div>
              </SuccessBurst>
              <h3 className="mt-4 text-2xl font-black text-fg">
                Ranked #{successItem.rank}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {successItem.listing.name} is now visible to all advertisers on the Board.
              </p>
            </div>

            {/* Share Card & Badges */}
            <div className="border-t border-line pt-6 text-left">
              <h4 className="text-sm font-bold text-fg">Share your rank</h4>
              <p className="text-xs text-muted">
                Download your official card or post directly to X.
              </p>
              <div className="mt-4">
                <ShareCard
                  kicker="AdverticeAF Board"
                  big={`#${successItem.rank}`}
                  title={successItem.listing.name}
                  subtitle={successItem.listing.tagline}
                  shareUrl={`https://adverticeaf.com/board`}
                  shareText={`We just claimed #${successItem.rank} on the @adverticeaf Board! Check out our placement:`}
                />
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold text-fg">Embed your badge</h4>
                <p className="text-xs text-muted">
                  Add a live trust badge to your website or README.
                </p>
                <div className="mt-3">
                  <BadgeEmbed
                    label={`Ranked #${successItem.rank} on AdverticeAF`}
                    href="https://adverticeaf.com/board"
                  />
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-bold text-fg">Get outbid alerts</h4>
                <div className="mt-3">
                  <AlertOptIn
                    reason="when someone outbids you"
                    onSubmit={async (email) => {
                      return api.subscribeAlerts(successItem.listing.domain, email);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Standalone Share Modal for any listing */}
      <Modal
        open={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        title="Share Board Placement"
        description="Share your live placement card or embed a badge on your site."
        maxWidth="max-w-xl"
      >
        {shareTarget && (
          <div className="space-y-6">
            <ShareCard
              kicker="AdverticeAF Board"
              big={`#${shareTarget.rank}`}
              title={shareTarget.listing.name}
              subtitle={shareTarget.listing.tagline}
              shareUrl="https://adverticeaf.com/board"
              shareText={`Check out ${shareTarget.listing.name} ranked #${shareTarget.rank} on the AdverticeAF Board:`}
            />
            <div className="border-t border-line pt-4">
              <BadgeEmbed
                label={`Ranked #${shareTarget.rank} on AdverticeAF`}
                href="https://adverticeaf.com/board"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
