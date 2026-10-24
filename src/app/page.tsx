"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  ShieldCheck,
  Search,
} from "lucide-react";
import Avatar from "@/components/board/Avatar";
import CheckoutPanel from "@/components/board/CheckoutPanel";
import ListingFields from "@/components/board/ListingFields";
import ShareCard from "@/components/board/ShareCard";
import BadgeEmbed from "@/components/board/BadgeEmbed";
import AlertOptIn from "@/components/board/AlertOptIn";
import SuccessBurst from "@/components/board/SuccessBurst";
import OutbidNav, { type NavTabId } from "@/components/board/OutbidNav";
import VerifyModal from "@/components/board/VerifyModal";
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
import { checkListingUrl, deriveBrandName, type ListingErrors, type ListingFields as Fields } from "@/lib/board/listing";
import type {
  ActivityItem,
  BoardDigest,
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

  // Verification modal state
  const [verifyDomain, setVerifyDomain] = useState<string | null>(null);

  // Bid modal state
  const [bidOpen, setBidOpen] = useState(false);
  const [targetDomain, setTargetDomain] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [bidAmountCents, setBidAmountCents] = useState(RULES.minBidCents * 5);
  const [customAmountStr, setCustomAmountStr] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [listingForm, setListingForm] = useState<Fields>({
    url: "",
    name: "",
    tagline: "",
    category: "Marketing",
  });
  const [formErrors, setFormErrors] = useState<ListingErrors>({});
  const [serverQuote, setServerQuote] = useState<Quote | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Fast-Add Bar State
  const [fastUrl, setFastUrl] = useState("");
  const [fastError, setFastError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");

  // Deep-Link Highlighting State
  const [highlightedDomain] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("checkout");
      const domain = params.get("domain");
      const hl = params.get("highlight") || (checkout !== "success" ? domain : null);
      if (hl) {
        return hl.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Daily Digest Modal State
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestData, setDigestData] = useState<BoardDigest | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestCopied, setDigestCopied] = useState(false);
  const [aiCommentary, setAiCommentary] = useState<{ narrative: string; modelUsed: string } | null>(null);
  const [sectorReport, setSectorReport] = useState<{ report: string; topSector: string; modelUsed: string } | null>(null);

  const openDailyDigest = async () => {
    setDigestOpen(true);
    setDigestLoading(true);
    try {
      const [data, ai, sec] = await Promise.all([
        api.getDigest(season),
        api.getAiMarketDigest(season).catch(() => null),
        api.getAiSectorReport().catch(() => null),
      ]);
      setDigestData(data);
      if (ai && ai.ok) setAiCommentary(ai);
      if (sec && sec.ok) setSectorReport(sec);
    } catch (err) {
      console.error("Failed to load digest:", err);
    } finally {
      setDigestLoading(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleNavSelect = (tab: NavTabId) => {
    setActiveTab(tab);
    if (tab === "all") {
      setCategory(null);
    } else if (tab === "leaderboards") {
      setCategory(null);
      if (typeof window !== "undefined") {
        document.getElementById("leaderboard-section")?.scrollIntoView({ behavior: "smooth" });
      }
    } else if (tab === "explore") {
      setCategory(null);
      if (typeof window !== "undefined") {
        document.getElementById("explore-section")?.scrollIntoView({ behavior: "smooth" });
      }
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

  const handleFastClaim = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = fastUrl.trim();
    if (!raw) {
      setFastError("Please enter your website address.");
      return;
    }
    const check = checkListingUrl(raw);
    if (!check.ok) {
      setFastError(check.error || "Please enter a valid website URL.");
      return;
    }
    setFastError(null);
    const brand = deriveBrandName(raw);
    setIsNew(true);
    setTargetDomain(null);
    setListingForm({
      url: check.url,
      name: brand,
      tagline: "",
      category: category ?? "Marketing",
    });
    setFormErrors({});
    const minLead = snapshot ? snapshot.leadCostCents : RULES.minBidCents;
    setBidAmountCents(Math.max(minLead, 1000));
    setCustomAmountStr("");
    setBidOpen(true);
  }, [fastUrl, category, snapshot]);

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

  // Check for successful return from Dodo Payments checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const domain = params.get("domain");

    if (checkout === "success" && domain) {
      api.getListing(domain).then((detail) => {
        if (detail) {
          setSuccessItem({
            listing: detail.listing,
            rank: detail.ranks.all.rank ?? 1,
            amountCents: detail.ranks.all.totalCents,
          });
        }
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Smooth scroll to highlighted listing
  useEffect(() => {
    if (!highlightedDomain || !snapshot || snapshot.rows.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`listing-row-${highlightedDomain}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [highlightedDomain, snapshot]);

  // Share card modal state
  const [shareTarget, setShareTarget] = useState<{
    listing: Listing;
    rank: number;
  } | null>(null);

  // Load board data
  const [reloadCounter, setReloadCounter] = useState(0);

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
  }, [season, category, reloadCounter]);

  // Instant local projection so UI is immediately responsive
  const localQuote = useMemo<Quote | null>(() => {
    if (!bidOpen) return null;
    const rows = snapshot?.rows || [];
    let projectedRank = 1;
    for (const r of rows) {
      if (targetDomain && r.listing.domain === targetDomain) continue;
      if (r.totalCents >= bidAmountCents) projectedRank++;
    }
    return {
      ok: true,
      domain: targetDomain || "yourbrand.com",
      isNewListing: isNew,
      amountCents: bidAmountCents,
      currentTotalCents: 0,
      newTotalCents: bidAmountCents,
      currentRank: null,
      newRank: projectedRank,
      of: rows.length + (isNew ? 1 : 0),
      costToLeadCents: snapshot?.leadCostCents ?? RULES.minBidCents,
      costToClimbCents: null,
    };
  }, [bidOpen, snapshot, targetDomain, bidAmountCents, isNew]);

  const filteredRows = useMemo(() => {
    if (!snapshot) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return snapshot.rows;
    return snapshot.rows.filter(
      (r) =>
        r.listing.name.toLowerCase().includes(q) ||
        r.listing.domain.toLowerCase().includes(q) ||
        (r.listing.tagline && r.listing.tagline.toLowerCase().includes(q))
    );
  }, [snapshot, searchQuery]);

  const quote = serverQuote?.ok && serverQuote.amountCents === bidAmountCents ? serverQuote : localQuote;

  // Fetch refined quote from server asynchronously whenever bid modal inputs change
  useEffect(() => {
    if (!bidOpen) return;
    let unmounted = false;

    const input = {
      amountCents: bidAmountCents,
      season,
      ...(isNew ? { url: listingForm.url.trim() || undefined } : { domain: targetDomain ?? undefined }),
    };

    api
      .quote(input)
      .then((q) => {
        if (!unmounted && q && q.ok) setServerQuote(q);
      })
      .catch(() => {
        // Fallback to localQuote
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
    let finalUrl = listingForm.url;
    let finalName = listingForm.name.trim();
    const finalCategory = (listingForm.category || "Marketing") as BoardCategory;
    const finalTagline = listingForm.tagline.trim();

    if (isNew) {
      const check = checkListingUrl(listingForm.url);
      if (!check.ok) {
        setFormErrors({ url: check.error });
        return { ok: false as const, error: check.error };
      }
      finalUrl = check.url;
      if (!finalName) {
        finalName = deriveBrandName(listingForm.url);
      }
    }

    const idempotencyKey = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const res = await api.purchaseBid(
      {
        domain: isNew ? undefined : targetDomain ?? undefined,
        email: alertEmail.trim() || undefined,
        newListing:
          isNew
            ? {
                url: finalUrl,
                name: finalName,
                tagline: finalTagline,
                category: finalCategory,
              }
            : undefined,
        amountCents: bidAmountCents,
        acceptedTerms: true,
      },
      idempotencyKey
    );

    if (res.ok && res.listing && !res.checkoutUrl) {
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
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent border border-accent/20">
              <Sparkles className="h-3.5 w-3.5" />
              Live Attention Market
            </span>
            <span className="text-xs text-muted">Ranked transparently by total spend</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl lg:text-5xl font-display">
            Outbid & Rank #1
          </h1>
          <p className="mt-2 text-base text-muted">
            The live pay-to-rank public leaderboard. Claim rank #1 instantly with minimal clicks.
          </p>

          {/* 1-Click Hero Fast-Bid Bar */}
          <form
            onSubmit={handleFastClaim}
            className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl border border-accent/40 bg-surface/90 shadow-2xl shadow-accent/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5 flex-1 px-3 py-2">
              <Globe className="h-5 w-5 text-accent shrink-0" />
              <input
                type="text"
                inputMode="url"
                value={fastUrl}
                onChange={(e) => {
                  setFastUrl(e.target.value);
                  if (fastError) setFastError(null);
                }}
                placeholder="Enter your website (e.g. acme.com)"
                className="w-full bg-transparent text-sm sm:text-base font-medium text-fg placeholder:text-muted/70 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-ink hover:bg-accent-hover transition-all shadow-md shadow-accent/20 shrink-0 cursor-pointer"
            >
              <Crown className="h-4 w-4" />
              <span>Claim Rank #1 {snapshot ? `(${formatUsd(snapshot.leadCostCents)})` : ""}</span>
            </button>
          </form>
          {fastError && (
            <p className="mt-2 text-xs font-semibold text-danger">{fastError}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2">
          <Button
            variant="primary"
            onClick={openBidNew}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-accent-ink font-bold shadow-lg shadow-accent/25 border-none"
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

      {/* Sleek Compact Stats Ticker */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line/60 bg-surface/60 px-5 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Crown className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-muted">To Take #1:</span>
          <span className="font-extrabold text-accent font-display text-sm sm:text-base">
            {snapshot ? formatUsd(snapshot.leadCostCents) : "..."}
          </span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-line/80" />
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Globe className="h-4 w-4 text-accent shrink-0" />
          <span className="text-muted">Ranked Brands:</span>
          <span className="font-bold text-fg font-display text-sm sm:text-base">
            {snapshot ? snapshot.stats.listings : "..."}
          </span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-line/80" />
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <TrendingUp className="h-4 w-4 text-ok shrink-0" />
          <span className="text-muted">Total Volume:</span>
          <span className="font-bold text-fg font-display text-sm sm:text-base">
            {snapshot ? formatUsd(snapshot.stats.totalCents) : "..."}
          </span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-line/80" />
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <MousePointerClick className="h-4 w-4 text-accent shrink-0" />
          <span className="text-muted">Clicks Delivered:</span>
          <span className="font-bold text-fg font-display text-sm sm:text-base">
            {snapshot ? snapshot.stats.clicks.toLocaleString() : "..."}
          </span>
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
                      ? "bg-accent text-accent-ink shadow-sm font-bold"
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
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
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
              className="text-accent hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Leaderboard on Left, Activity & Hall of Fame on Right */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Leaderboard Table (8 cols on lg) */}
        <div id="leaderboard-section" className="lg:col-span-8">
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

          {/* Search Bar & Daily Digest Bar */}
          <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search brands or domains..."
                className="w-full rounded-xl border border-line bg-surface/80 pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-fg placeholder:text-muted focus:border-accent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted hover:text-fg"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openDailyDigest}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-muted hover:border-line-strong hover:text-fg transition-colors whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>Daily Digest</span>
              </button>
            </div>
          </div>

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
          ) : filteredRows.length === 0 && searchQuery.trim() !== "" ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-6 text-center">
              <p className="text-base font-bold text-fg">
                No brand listed for &quot;{searchQuery}&quot; yet
              </p>
              <p className="mt-1 text-xs text-muted max-w-md">
                Be the first to claim this placement and take the #1 rank today.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setFastUrl(searchQuery);
                  const brand = deriveBrandName(searchQuery);
                  setIsNew(true);
                  setTargetDomain(null);
                  setListingForm({
                    url: searchQuery.startsWith("http") ? searchQuery : `https://${searchQuery}`,
                    name: brand,
                    tagline: "",
                    category: category ?? "Marketing",
                  });
                  setFormErrors({});
                  const minLead = snapshot ? snapshot.leadCostCents : RULES.minBidCents;
                  setBidAmountCents(Math.max(minLead, 1000));
                  setCustomAmountStr("");
                  setBidOpen(true);
                }}
                className="mt-4 text-xs font-bold"
              >
                Claim Rank #1 with {searchQuery}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <div className="divide-y divide-line">
                {filteredRows.map((row) => {
                  const isTop1 = row.rank === 1;
                  const isHighlighted = highlightedDomain === row.listing.domain;
                  return (
                    <div
                      id={`listing-row-${row.listing.domain}`}
                      key={row.listing.domain}
                      className={`flex flex-col gap-4 p-4 transition-all sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                        isHighlighted
                          ? "ring-2 ring-accent shadow-lg shadow-accent/25 bg-accent/10"
                          : isTop1
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
                            {isHighlighted && (
                              <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-ink">
                                Linked Brand
                              </span>
                            )}
                            {row.listing.verified ? (
                              <span title="Verified domain owner" className="inline-flex items-center">
                                <CheckCircle2 className="h-4 w-4 text-ok" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setVerifyDomain(row.listing.domain)}
                                className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/20 transition-colors"
                                title="Click to verify ownership of this domain"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                Verify
                              </button>
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
        <div id="explore-section" className="space-y-6 lg:col-span-4">
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
                    className="flex items-center justify-between rounded-lg bg-raised/40 p-2.5 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="truncate font-medium text-fg">{m.listing.name}</span>
                      {m.listing.verified ? (
                        <span title="Verified domain owner">
                          <CheckCircle2 className="h-3.5 w-3.5 text-ok shrink-0" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVerifyDomain(m.listing.domain)}
                          className="text-[10px] text-accent hover:underline flex items-center gap-0.5 shrink-0"
                          title="Verify domain ownership"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Verify
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setShareTarget({
                          listing: m.listing,
                          rank: m.ranks.all.rank ?? 1,
                        })
                      }
                      className="text-accent hover:underline shrink-0 ml-2"
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

          {/* Outbid Alert Email (Optional) */}
          <div className="rounded-xl border border-line bg-raised/30 p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-fg">Outbid Alert Email (Optional)</label>
              <span className="text-[11px] text-muted">Get alerted if outbid</span>
            </div>
            <input
              type="email"
              placeholder="alerts@yourcompany.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
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
          {(() => {
            const isFormIncomplete = isNew
              ? !listingForm.url.trim()
              : !targetDomain;
            const isAmountInvalid = bidAmountCents < RULES.minBidCents;

            return (
              <CheckoutPanel
                lines={[
                  {
                    label: isNew
                      ? `New Board Placement (${listingForm.name.trim() || deriveBrandName(listingForm.url) || "Your Brand"})`
                      : `Rank Boost (${targetDomain})`,
                    amountCents: bidAmountCents,
                  },
                ]}
                onConfirm={handleConfirmPurchase}
                onDone={() => setBidOpen(false)}
                disabled={isFormIncomplete || isAmountInvalid}
                disabledReason={
                  isAmountInvalid
                    ? `Minimum bid is ${formatUsd(RULES.minBidCents)}`
                    : isFormIncomplete
                    ? "Enter your website URL above to continue"
                    : undefined
                }
              />
            );
          })()}
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
                  shareUrl={`https://adverticeaf.com/?highlight=${encodeURIComponent(successItem.listing.domain)}`}
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
                    href={`https://adverticeaf.com/?highlight=${encodeURIComponent(successItem.listing.domain)}`}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    <h4 className="text-sm font-bold text-fg">Verify Domain Ownership</h4>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setVerifyDomain(successItem.listing.domain)}
                    className="text-xs font-bold"
                  >
                    Verify Domain
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Earn the verified green checkmark badge next to your brand on the live leaderboard.
                </p>
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
              shareUrl={`https://adverticeaf.com/?highlight=${encodeURIComponent(shareTarget.listing.domain)}`}
              shareText={`Check out ${shareTarget.listing.name} ranked #${shareTarget.rank} on the AdverticeAF Board:`}
            />
            <div className="border-t border-line pt-4">
              <BadgeEmbed
                label={`Ranked #${shareTarget.rank} on AdverticeAF`}
                href={`https://adverticeaf.com/?highlight=${encodeURIComponent(shareTarget.listing.domain)}`}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Daily Digest Modal */}
      <Modal
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
        title="Live Leaderboard Digest"
        description="Shareable executive rollup of the live leaderboard for newsletters and social media."
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          {digestLoading ? (
            <div className="py-8 text-center text-sm text-muted">Generating live digest...</div>
          ) : digestData ? (
            <>
              <div className="rounded-xl border border-line bg-raised/60 p-3.5">
                <div className="flex items-center justify-between text-xs text-muted pb-2 border-b border-line/60">
                  <span className="font-bold uppercase tracking-wider text-accent">Summary Text</span>
                  <span>{new Date(digestData.generatedAt).toLocaleDateString()}</span>
                </div>
                <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-fg leading-relaxed bg-surface/80 p-3 rounded-lg border border-line overflow-x-auto max-h-48">
                  {digestData.plainText}
                </pre>
              </div>

              {aiCommentary && (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted pb-1.5 border-b border-accent/20">
                    <span className="font-bold text-accent">NVIDIA Nemotron Market Commentary</span>
                    <span className="text-[10px] text-muted">{aiCommentary.modelUsed}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-fg">
                    {aiCommentary.narrative}
                  </p>
                </div>
              )}

              {sectorReport && (
                <div className="rounded-xl border border-line bg-surface/70 p-3.5">
                  <div className="flex items-center justify-between text-xs text-muted pb-1.5 border-b border-line/60">
                    <span className="font-bold text-fg">Sector Mindshare Analysis</span>
                    <span className="text-[10px] text-accent font-semibold">Leading: {sectorReport.topSector}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {sectorReport.report}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted">
                  {digestCopied ? "Copied to clipboard!" : "Ready to paste into X or newsletter"}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    let textToCopy = digestData.plainText;
                    if (aiCommentary) {
                      textToCopy += `\n\nNVIDIA Nemotron Commentary:\n${aiCommentary.narrative}`;
                    }
                    if (sectorReport) {
                      textToCopy += `\n\nSector Mindshare Breakdown:\n${sectorReport.report}`;
                    }
                    await navigator.clipboard.writeText(textToCopy);
                    setDigestCopied(true);
                    setTimeout(() => setDigestCopied(false), 2500);
                  }}
                  className="text-xs font-bold"
                >
                  {digestCopied ? "Copied!" : "Copy Digest Text"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Domain Verification Modal */}
      <VerifyModal
        open={verifyDomain !== null}
        domain={verifyDomain || ""}
        onClose={() => setVerifyDomain(null)}
        onVerified={() => {
          setVerifyDomain(null);
          setReloadCounter((c) => c + 1);
        }}
      />
    </div>
  );
}
