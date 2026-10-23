"use client";

import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import { BADGE_STYLE, buildBadgeSnippets, copyText } from "@/lib/board/share";

export interface BadgeEmbedProps {
  /** Text on the badge, e.g. "Ranked #3 on the AdverticeAF Board". */
  label: string;
  /** Absolute URL the badge links to. */
  href: string;
}

type Kind = "html" | "markdown" | "link" | "iframe";

const KINDS: { kind: Kind; title: string; hint: string }[] = [
  { kind: "html", title: "HTML", hint: "Paste into your site or email signature." },
  { kind: "markdown", title: "Markdown", hint: "Paste into a README or a post." },
  { kind: "link", title: "Plain link", hint: "Paste anywhere." },
  { kind: "iframe", title: "Live Widget", hint: "Embed live ranking widget directly on your site." },
];

interface Status {
  kind: Kind;
  ok: boolean;
}

export default function BadgeEmbed({ label, href }: BadgeEmbedProps) {
  const baseId = useId();
  const [status, setStatus] = useState<Status | null>(null);
  const snippets = buildBadgeSnippets(label, href);

  if (!snippets) {
    return (
      <section aria-label="Badge" className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        The badge needs a valid web address to link to. It will appear here once this page has one.
      </section>
    );
  }

  const copy = async (kind: Kind) => {
    const result = await copyText(snippets[kind]);
    setStatus({ kind, ok: result === "ok" });
  };

  const statusTitle = status ? KINDS.find((k) => k.kind === status.kind)?.title : null;

  return (
    <section aria-label="Badge" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="text-base font-bold text-fg">Show it off with a badge</h3>
      <p className="mt-1 text-sm text-muted">Add this to your own site. It links back to your placement.</p>

      <div className="mt-4 rounded-xl border border-line bg-ink p-4">
        <p className="mb-2 text-xs font-medium text-muted">Preview</p>
        <a href={snippets.link} target="_blank" rel="noopener" style={BADGE_STYLE}>
          {label.trim() || "Listed on the AdverticeAF Board"}
        </a>
      </div>

      <div className="mt-4 space-y-4">
        {KINDS.map(({ kind, title, hint }) => {
          const id = `${baseId}-${kind}`;
          return (
            <div key={kind}>
              <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-fg">
                <span>{title}</span>
                <span className="text-xs font-normal text-muted">{hint}</span>
              </label>
              <textarea
                id={id}
                readOnly
                rows={kind === "html" ? 4 : 2}
                value={snippets[kind]}
                onFocus={(e) => e.currentTarget.select()}
                spellCheck={false}
                className="w-full resize-y rounded-xl border border-line-strong bg-ink px-3 py-2 font-mono text-xs text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => copy(kind)} aria-label={`Copy ${title} snippet`}>
                {status?.kind === kind && status.ok ? "Copied" : `Copy ${title}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div role="status" aria-live="polite" className="mt-3 min-h-5 text-sm">
        {status && (
          <p className={`${status.ok ? "text-ok" : "text-bad"} font-medium`}>
            {status.ok
              ? `Done: ${statusTitle} snippet copied.`
              : `Problem: copy was blocked. Select the ${statusTitle} text above and copy it by hand.`}
          </p>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">An image badge will be available when the live service is on.</p>
    </section>
  );
}
