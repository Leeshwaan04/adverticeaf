"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Campaign } from "@/data/campaigns";

interface Props {
  campaign: Campaign;
}

export default function ShareButtons({ campaign }: Props) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/campaigns/${campaign.slug}`
    : `https://adverticeaf.com/campaigns/${campaign.slug}`;

  const xText = `Check out the creative breakdown for "${campaign.title}" on @AdverticeAF! The Hook: "${campaign.hookBreakdown.theHook}"`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(url)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  function handleCopy() {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Share on X */}
      <a
        href={xShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-fg transition-colors hover:border-line-strong hover:bg-raised"
      >
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span>Share on X</span>
      </a>

      {/* Share on LinkedIn */}
      <a
        href={linkedInShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-fg transition-colors hover:border-line-strong hover:bg-raised"
      >
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
        <span>LinkedIn</span>
      </a>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold text-fg transition-colors hover:border-line-strong hover:bg-raised"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-ok" />
            <span className="text-ok">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-muted" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}
