import type { Metadata } from "next";
import Link from "next/link";
import PageShell, { Prose } from "@/components/PageShell";
import ContactButton from "@/components/ContactButton";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "What AdverticeAF is, what it does and does not do, and how to reach us.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="What AdverticeAF is"
      intro="A creative lab and a source-linked directory of creative and social-first ad agencies, built to help brands make better ads and make better agency choices."
      reviewed
    >
      <Prose>
        <h2>What you can do here</h2>
        <ul>
          <li><strong>Check an ad hook</strong> with a transparent six-point checklist (<Link href="/#hook-checker">Hook Checker</Link>).</li>
          <li><strong>Model a media budget</strong> with assumptions you control (<Link href="/#planner">Budget Planner</Link>).</li>
          <li><strong>Research agencies</strong> with every fact linked to a public source (<Link href="/agencies">Agency Directory</Link>).</li>
          <li><strong>Commission creative</strong> from us if you need it (<Link href="/#services">Services</Link>).</li>
        </ul>

        <h2>What we do not do</h2>
        <ul>
          <li>We do not show ratings, review counts or rankings. We have no way to collect or verify genuine reviews.</li>
          <li>We do not sell placement in the directory.</li>
          <li>We do not promise specific advertising results.</li>
          <li>We do not present self-reported claims as fact. They are labelled as self-reported.</li>
        </ul>

        <h2>How we handle accuracy</h2>
        <p>
          Directory entries are compiled from public sources, linked fact by fact, and reviewed on a stated date. We note where
          sources disagree. If something is wrong, tell us and we will check it and fix it. The full approach is on the{" "}
          <Link href="/methodology">methodology page</Link>.
        </p>
      </Prose>

      {SITE.team.length > 0 && (
        <section aria-labelledby="team" className="mt-14">
          <h2 id="team" className="text-2xl font-bold tracking-tight text-fg">The people behind it</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {SITE.team.map((p) => (
              <li key={p.name} className="panel p-6">
                <p className="text-lg font-semibold text-fg">{p.name}</p>
                <p className="text-sm text-accent">{p.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.bio}</p>
                {p.linkedin && (
                  <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-accent underline underline-offset-2">
                    LinkedIn
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="panel mt-14 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-fg">Get in touch</h2>
          <p className="mt-1 text-sm text-muted">Questions, corrections or a project in mind.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ContactButton>Send a message</ContactButton>
        </div>
      </div>
    </PageShell>
  );
}
