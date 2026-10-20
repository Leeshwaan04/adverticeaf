"use client";

import { useState } from "react";
import { Check, Copy, Code, Trophy, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Campaign } from "@/data/campaigns";

interface Props {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
}

type BadgeStyle = "featured" | "top3" | "score";

export default function EmbedBadgeModal({ open, onClose, campaign }: Props) {
  const [style, setStyle] = useState<BadgeStyle>("top3");
  const [copiedType, setCopiedType] = useState<"html" | "md" | null>(null);

  const campaignUrl = `https://adverticeaf.com/campaigns/${campaign.slug}`;

  // SVG badge definitions
  const badgeSvgs: Record<BadgeStyle, string> = {
    top3: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="52" viewBox="0 0 220 52" fill="none">
  <rect width="220" height="52" rx="12" fill="#0C0D0E" stroke="#F59E0B" stroke-width="1.5"/>
  <circle cx="26" cy="26" r="14" fill="#F59E0B" fill-opacity="0.15"/>
  <path d="M26 19L28 23H32L29 26L30 30L26 28L22 30L23 26L20 23H24L26 19Z" fill="#F59E0B"/>
  <text x="48" y="22" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" letter-spacing="0.05em">ADVERTICEAF</text>
  <text x="48" y="38" fill="#F9FAFB" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Top Campaign of the Day</text>
</svg>`,
    featured: `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="52" viewBox="0 0 210 52" fill="none">
  <rect width="210" height="52" rx="12" fill="#0C0D0E" stroke="#2563EB" stroke-width="1.5"/>
  <circle cx="26" cy="26" r="14" fill="#2563EB" fill-opacity="0.2"/>
  <path d="M26 18L32 30H20L26 18Z" fill="#38BDF8"/>
  <text x="48" y="22" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" letter-spacing="0.05em">FEATURED ON</text>
  <text x="48" y="38" fill="#F9FAFB" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">AdverticeAF</text>
</svg>`,
    score: `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="52" viewBox="0 0 220 52" fill="none">
  <rect width="220" height="52" rx="12" fill="#0C0D0E" stroke="#10B981" stroke-width="1.5"/>
  <circle cx="26" cy="26" r="14" fill="#10B981" fill-opacity="0.2"/>
  <text x="26" y="30" text-anchor="middle" fill="#10B981" font-family="-apple-system, sans-serif" font-size="11" font-weight="800">9.8</text>
  <text x="48" y="22" fill="#9CA3AF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" letter-spacing="0.05em">VIRAL HOOK SCORE</text>
  <text x="48" y="38" fill="#F9FAFB" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Top 1% Creative</text>
</svg>`,
  };

  const htmlSnippet = `<a href="${campaignUrl}" target="_blank" rel="noopener noreferrer">
  <img src="https://adverticeaf.com/badges/${style}.svg" alt="${campaign.title} on AdverticeAF" width="220" height="52" />
</a>`;

  const mdSnippet = `[![Featured on AdverticeAF](https://adverticeaf.com/badges/${style}.svg)](${campaignUrl})`;

  function handleCopy(type: "html" | "md", text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Embed Campaign Badge"
      description="Display your AdverticeAF recognition badge on your website, landing page, or case study."
    >
      <div className="space-y-5">
        {/* Style Selection */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Select Badge Style
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStyle("top3")}
              className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                style === "top3"
                  ? "border-amber-400 bg-amber-400/10 text-amber-300"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              <Trophy className="mx-auto mb-1 h-4 w-4" />
              <span>Top Campaign</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle("featured")}
              className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                style === "featured"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              <Sparkles className="mx-auto mb-1 h-4 w-4" />
              <span>Featured</span>
            </button>
            <button
              type="button"
              onClick={() => setStyle("score")}
              className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                style === "score"
                  ? "border-ok bg-ok/15 text-ok"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              <Code className="mx-auto mb-1 h-4 w-4" />
              <span>Hook Score</span>
            </button>
          </div>
        </div>

        {/* Live SVG Badge Preview */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted">
            Preview
          </label>
          <div className="mt-2 flex items-center justify-center rounded-2xl border border-line bg-raised/70 p-6">
            <div
              className="transition-transform hover:scale-105"
              dangerouslySetInnerHTML={{ __html: badgeSvgs[style] }}
            />
          </div>
        </div>

        {/* HTML Code Snippet */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-fg">HTML Embed Code</label>
            <button
              type="button"
              onClick={() => handleCopy("html", htmlSnippet)}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
            >
              {copiedType === "html" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-ok" />
                  <span className="text-ok">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy HTML</span>
                </>
              )}
            </button>
          </div>
          <pre className="mt-1.5 overflow-x-auto rounded-xl border border-line bg-ink p-3 text-[11px] font-mono text-muted">
            {htmlSnippet}
          </pre>
        </div>

        {/* Markdown Snippet */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-fg">Markdown Code</label>
            <button
              type="button"
              onClick={() => handleCopy("md", mdSnippet)}
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
            >
              {copiedType === "md" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-ok" />
                  <span className="text-ok">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>
          <pre className="mt-1.5 overflow-x-auto rounded-xl border border-line bg-ink p-3 text-[11px] font-mono text-muted">
            {mdSnippet}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
