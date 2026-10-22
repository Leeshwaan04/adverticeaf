import Link from "next/link";
import Logo from "@/components/Logo";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Leaderboard",
    links: [
      { href: "/", label: "Live Rankings" },
      { href: "/board/rules", label: "Bidding Rules & FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_repeat(2,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The public pay-to-rank leaderboard and digital attention market. Outbid rivals, claim rank #1, and reach founders & advertisers.
            </p>
            {SITE.contactEmail && (
              <a
                href={`mailto:${SITE.contactEmail}`}
                className="mt-4 inline-block text-sm text-[#e2573f] underline underline-offset-2 hover:text-[#cf4b34]"
              >
                {SITE.contactEmail}
              </a>
            )}
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold text-fg">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted transition-colors hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {SITE.legalEntity || SITE.name}. Powered by transparent public bid rankings.
          </p>
          <p>All bids and ranking positions update in real-time.</p>
        </div>
      </div>
    </footer>
  );
}
