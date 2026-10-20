"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Code, Zap, ArrowUpRight } from "lucide-react";
import type { Campaign } from "@/data/campaigns";
import EmbedBadgeModal from "@/components/campaigns/EmbedBadgeModal";
import PromoteModal from "@/components/campaigns/PromoteModal";
import ShareButtons from "@/components/campaigns/ShareButtons";

interface Props {
  campaign: Campaign;
}

export default function CampaignDetailActions({ campaign }: Props) {
  const router = useRouter();
  const [embedOpen, setEmbedOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={campaign.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-fg hover:border-line-strong hover:bg-raised"
        >
          <span>Visit Brand</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
        </a>

        <button
          type="button"
          onClick={() => setEmbedOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-bold text-fg transition-colors hover:border-line-strong hover:bg-raised"
        >
          <Code className="h-3.5 w-3.5 text-accent" />
          <span>Embed Badge</span>
        </button>

        <button
          type="button"
          onClick={() => setPromoteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20"
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span>Promote to #1 ($29)</span>
        </button>

        <ShareButtons campaign={campaign} />
      </div>

      <EmbedBadgeModal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        campaign={campaign}
      />

      <PromoteModal
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onSuccess={() => {
          router.push("/campaigns");
        }}
      />
    </>
  );
}
