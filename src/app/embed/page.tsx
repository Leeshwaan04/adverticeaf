"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Crown, ExternalLink, Sparkles } from "lucide-react";
import Avatar from "@/components/board/Avatar";
import { api } from "@/lib/board/api";
import { formatUsd } from "@/lib/board/format";
import type { BoardSnapshot } from "@/lib/board/types";

export default function EmbedPage() {
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unmounted = false;
    async function load() {
      try {
        const snap = await api.getBoard("all", null);
        if (!unmounted) {
          setSnapshot(snap);
          setLoading(false);
        }
      } catch {
        if (!unmounted) setLoading(false);
      }
    }
    load();
    const unsub = api.subscribe(() => {
      load();
    });
    return () => {
      unmounted = true;
      unsub();
    };
  }, []);

  const topKing = snapshot?.rows[0];
  const runnersUp = snapshot?.rows.slice(1, 4) || [];

  return (
    <div
      data-embed-view="true"
      className="w-full max-w-md mx-auto p-3.5 rounded-2xl border border-line bg-surface/95 text-fg shadow-xl backdrop-blur-md font-sans text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[11px] text-fg">
            AdverticeAF Board
          </span>
        </div>
        <a
          href="https://adverticeaf.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
        >
          <span>Live Rankings</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted">Loading live leaderboard...</div>
      ) : !topKing ? (
        <div className="py-6 text-center">
          <p className="font-bold text-fg">No brands ranked yet</p>
          <a
            href="https://adverticeaf.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink hover:bg-accent-hover transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            Claim Rank #1 ($1.00)
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {/* #1 King */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                <Crown className="h-3 w-3" />
                King of the Hill #1
              </span>
              <span className="font-bold text-amber-300 font-display">
                {formatUsd(topKing.totalCents)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <Avatar name={topKing.listing.name} domain={topKing.listing.domain} size={32} />
              <div className="min-w-0 flex-1">
                <a
                  href={topKing.listing.url}
                  target="_blank"
                  rel="sponsored nofollow"
                  className="flex items-center gap-1 font-bold text-fg hover:text-amber-300"
                >
                  <span className="truncate">{topKing.listing.name}</span>
                  <ArrowUpRight className="h-3 w-3 text-muted" />
                </a>
                <p className="text-[10px] text-muted truncate">{topKing.listing.tagline}</p>
              </div>
            </div>
          </div>

          {/* Top 2 - 4 Runners Up */}
          {runnersUp.length > 0 && (
            <div className="divide-y divide-line/60 rounded-xl border border-line bg-raised/40 px-2.5 py-1">
              {runnersUp.map((row) => (
                <div key={row.listing.domain} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-5 text-center font-bold text-muted text-[11px]">
                      #{row.rank}
                    </span>
                    <span className="truncate font-medium text-fg">{row.listing.name}</span>
                  </div>
                  <span className="font-semibold text-muted text-[11px]">
                    {formatUsd(row.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div className="pt-2 flex items-center justify-between border-t border-line/60">
            <div className="text-[10px] text-muted">
              To Take #1: <span className="font-bold text-accent">{formatUsd(snapshot?.leadCostCents ?? 100)}</span>
            </div>
            <a
              href="https://adverticeaf.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-ink hover:bg-accent-hover transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              Claim Crown
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
