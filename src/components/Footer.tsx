import Link from "next/link";
import Logo from "@/components/Logo";
import { SITE } from "@/lib/site";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/#hook-checker", label: "Hook Checker" },
      { href: "/agencies", label: "Agency Directory" },
      { href: "/#planner", label: "Budget Planner" },
      { href: "/#services", label: "Services" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/methodology", label: "How the directory works" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A creative lab and a source-linked directory of creative and social-first ad agencies.
            </p>
            {SITE.contactEmail && (
              <a
                href={`mailto:${SITE.contactEmail}`}
                className="mt-4 inline-block text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
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
            &copy; {new Date().getFullYear()} {SITE.legalEntity || SITE.name}. Directory information is compiled from public
            sources and is not an endorsement.
          </p>
          <p>Directory last reviewed {new Date(SITE.lastReviewed).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
    </footer>
  );
}
