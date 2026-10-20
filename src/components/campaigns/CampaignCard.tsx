"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Trophy,
  Eye,
} from "lucide-react";
import type { Campaign } from "@/data/campaigns";
import { isCampaignUpvoted, toggleCampaignUpvote } from "@/lib/campaigns/store";

interface Props {
  campaign: Campaign;
  rank?: number;
  onUpvoteChange?: () => void;
}

export default function CampaignCard({ campaign, rank, onUpvoteChange }: Props) {
  const [upvoted, setUpvoted] = useState(() => isCampaignUpvoted(campaign.id));
  const [votes, setVotes] = useState(campaign.initialUpvotes);

  function handleUpvote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleCampaignUpvote(campaign.id);
    setUpvoted(res.upvoted);
    setVotes((prev) => (res.upvoted ? prev + 1 : prev - 1));
    if (onUpvoteChange) onUpvoteChange();
  }

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:border-line-strong hover:shadow-xl hover:shadow-black/40">
      {/* Top Media / Thumbnail */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-raised">
        <Image
          src={campaign.thumbnailUrl}
          alt={campaign.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Format Badge Overlay */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-fg backdrop-blur-md">
            {campaign.format}
          </span>
          {campaign.badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur-md">
              <Trophy className="h-3 w-3" />
              {campaign.badge}
            </span>
          )}
        </div>

        {/* Rank Overlay (optional) */}
        {rank && (
          <div className="absolute bottom-3 left-3 flex h-7 w-7 items-center justify-center rounded-lg bg-ink/80 text-xs font-black text-accent backdrop-blur-md">
            #{rank}
          </div>
        )}

        {/* Metric Chip */}
        {campaign.metrics.views && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur-md">
            <Eye className="h-3 w-3 text-accent" />
            {campaign.metrics.views}
          </div>
        )}
      </div>

      {/* Body Info */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Brand + Agency Credits */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="font-bold text-fg">{campaign.brand}</span>
            <span>by</span>
            {campaign.agency.slug ? (
              <Link
                href={`/agencies/${campaign.agency.slug}`}
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                {campaign.agency.name}
                {campaign.agency.verified && (
                  <CheckCircle2 className="h-3 w-3 text-ok" />
                )}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-fg">
                {campaign.agency.name}
                {campaign.agency.verified && (
                  <CheckCircle2 className="h-3 w-3 text-ok" />
                )}
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/campaigns/${campaign.slug}`} className="mt-2 block">
            <h3 className="line-clamp-2 text-base font-bold text-fg transition-colors group-hover:text-accent">
              {campaign.title}
            </h3>
          </Link>

          {/* Tagline */}
          <p className="mt-1.5 line-clamp-2 text-xs text-muted">
            {campaign.tagline}
          </p>

          {/* Creative Angle Tag */}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-raised px-2 py-0.5 text-[11px] font-medium text-muted">
              <Sparkles className="h-3 w-3 text-accent" />
              {campaign.creativeAngle}
            </span>
          </div>
        </div>

        {/* Footer Actions: Upvote Button & View link */}
        <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
          <button
            type="button"
            onClick={handleUpvote}
            aria-label={upvoted ? "Remove upvote" : "Upvote campaign"}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
              upvoted
                ? "border-accent bg-accent/15 text-accent shadow-sm"
                : "border-line bg-surface text-fg hover:border-line-strong hover:bg-raised"
            }`}
          >
            <ArrowUp className={`h-4 w-4 transition-transform ${upvoted ? "translate-y-[-1px] text-accent" : "text-muted"}`} />
            <span>{votes}</span>
          </button>

          <Link
            href={`/campaigns/${campaign.slug}`}
            className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-fg"
          >
            <span>Breakdown</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
