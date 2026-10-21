"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  ArrowUpRight,
  Eye,
  Sparkles,
  Zap,
  ArrowUp,
  CheckCircle2,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { Campaign } from "@/data/campaigns";
import { isCampaignUpvoted, toggleCampaignUpvote } from "@/lib/campaigns/store";

interface Props {
  campaign: Campaign;
  onPromoteClick: () => void;
  onUpvoteChange?: () => void;
}

export default function PromotedSpotlight({
  campaign,
  onPromoteClick,
  onUpvoteChange,
}: Props) {
  const [upvoted, setUpvoted] = useState(() => isCampaignUpvoted(campaign.id));
  const [votes, setVotes] = useState(campaign.initialUpvotes);

  function handleUpvote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleCampaignUpvote(campaign.id);
    setUpvoted(res.upvoted);
    setVotes((prev) => (res.upvoted ? prev + 1 : prev - 1));
    if (res.upvoted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    if (onUpvoteChange) onUpvoteChange();
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.07] to-surface p-4 shadow-2xl shadow-amber-400/5 sm:p-6 lg:p-8">
      {/* Top Banner Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wider text-ink shadow-sm">
            <Trophy className="h-3.5 w-3.5 fill-ink" />
            <span>{campaign.promoted ? "#1 Promoted Spotlight" : "Editorial Spotlight"}</span>
          </span>
          <span className="text-xs font-medium text-muted">
            {campaign.promotedUntil ? `Until ${new Date(campaign.promotedUntil).toLocaleString()}` : "Featured campaign"}
          </span>
        </div>

        <button
          type="button"
          onClick={onPromoteClick}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20"
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Claim #1 Spotlight ($29/day)</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        {/* Media / Video Preview */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-line bg-raised shadow-lg lg:col-span-6">
          <Image
            src={campaign.thumbnailUrl}
            alt={campaign.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          <div className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-fg backdrop-blur-md">
            {campaign.format}
          </div>
          {campaign.metrics.views && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-muted backdrop-blur-md">
              <Eye className="h-3.5 w-3.5 text-accent" />
              <span>{campaign.metrics.views}</span>
            </div>
          )}
        </div>

        {/* Narrative & Metrics */}
        <div className="flex flex-col justify-between lg:col-span-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-bold text-fg">{campaign.brand}</span>
              <span>by</span>
              <span className="inline-flex items-center gap-1 font-semibold text-accent">
                {campaign.agency.name}
                {campaign.agency.verified && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                )}
              </span>
            </div>

            <Link href={campaign.id.startsWith("paid-") ? campaign.websiteUrl : `/campaigns/${campaign.slug}`}>
              <h2 className="mt-2 text-xl font-black tracking-tight text-fg transition-colors hover:text-amber-400 sm:text-2xl lg:text-3xl">
                {campaign.title}
              </h2>
            </Link>

            <p className="mt-2 text-sm text-muted sm:text-base">
              {campaign.tagline}
            </p>

            {/* Quick Hook Breakdown Box */}
            <div className="mt-4 rounded-xl border border-line/80 bg-raised/50 p-3.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                The Hook:
              </div>
              <p className="mt-1 text-xs font-medium text-fg sm:text-sm">
                &ldquo;{campaign.hookBreakdown.theHook}&rdquo;
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2.5 py-1 text-xs font-medium text-muted">
                <Sparkles className="h-3 w-3 text-amber-400" />
                {campaign.creativeAngle}
              </span>
              <span className="inline-flex items-center rounded-md bg-raised px-2.5 py-1 text-xs font-medium text-muted">
                {campaign.category}
              </span>
            </div>
          </div>

          {/* Footer CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={handleUpvote}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                upvoted
                  ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-sm"
                  : "border-line bg-surface text-fg hover:border-line-strong hover:bg-raised"
              }`}
            >
              <ArrowUp className={`h-4 w-4 ${upvoted ? "text-amber-400" : "text-muted"}`} />
              <span>{votes} Upvotes</span>
            </button>

            <Link
              href={campaign.id.startsWith("paid-") ? campaign.websiteUrl : `/campaigns/${campaign.slug}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-ink shadow-md transition-all hover:bg-accent-hover"
            >
              <span>{campaign.id.startsWith("paid-") ? "View Campaign" : "View Breakdown"}</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <a
              href={campaign.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted hover:border-line-strong hover:text-fg"
            >
              <span>Visit Brand</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
