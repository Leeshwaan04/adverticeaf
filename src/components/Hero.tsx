import Link from "next/link";
import { ArrowRight, Calculator, Search, SearchCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { AGENCIES } from "@/data/agencies";

const TOOLS = [
  {
    href: "/#hook-checker",
    icon: SearchCheck,
    title: "Hook Checker",
    body: "Score an ad headline against six clear criteria and get template rewrites to start from.",
  },
  {
    href: "/agencies",
    icon: Search,
    title: "Agency Directory",
    body: `${AGENCIES.length} creative and social-first agencies. Every fact links to its public source.`,
  },
  {
    href: "/#planner",
    icon: Calculator,
    title: "Budget Planner",
    body: "Turn spend, CPM, CTR and conversion rate into orders and ROAS. Edit every assumption.",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[880px] max-w-full -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-xs font-medium text-muted">
            Creative lab and agency directory
          </p>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-fg sm:text-6xl">
            Make ads people actually <span className="text-accent">stop for</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            AdverticeAF helps brands sharpen their ad creative and find the right agency. Check a hook, plan a media
            budget, and browse agencies where every fact is linked to a source.
          </p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button href="/#hook-checker" size="lg">
              Check your ad hook
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button href="/agencies" size="lg" variant="secondary">
              Browse the directory
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted">Free tools. No sign-up. What you type stays in your browser.</p>
        </div>

        <ul className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.title}>
              <Link href={t.href} className="panel panel-hover group block h-full p-6">
                <t.icon className="h-6 w-6 text-accent" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold text-fg">{t.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.body}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  Open
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
