import type { ReactNode } from "react";
import { SITE } from "@/lib/site";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

interface Props {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  /** Show "Last reviewed" under the intro. */
  reviewed?: boolean;
  children: ReactNode;
  wide?: boolean;
  /** Rendered above the heading, e.g. breadcrumbs. */
  before?: ReactNode;
}

export default function PageShell({ eyebrow, title, intro, reviewed, children, wide, before }: Props) {
  return (
    <div className={`mx-auto px-4 py-14 sm:px-6 sm:py-20 lg:px-8 ${wide ? "max-w-7xl" : "max-w-3xl"}`}>
      {before}
      <header className={wide ? "mx-auto max-w-3xl text-center" : ""}>
        {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
        <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">{title}</h1>
        {intro && <div className="mt-5 text-lg leading-relaxed text-muted">{intro}</div>}
        {reviewed && <p className="mt-4 text-sm text-muted">Last reviewed {fmt(SITE.lastReviewed)}</p>}
      </header>
      <div className={wide ? "mt-12" : "mt-10"}>{children}</div>
    </div>
  );
}

/** Long-form text styling for policy and editorial pages. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5 text-base leading-relaxed text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-hover [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-fg [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-fg [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
      {children}
    </div>
  );
}
