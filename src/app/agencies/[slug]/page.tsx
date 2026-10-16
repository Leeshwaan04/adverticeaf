import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight, Info } from "lucide-react";
import PageShell from "@/components/PageShell";
import Button from "@/components/ui/Button";
import ContactButton, { ListingButton } from "@/components/ContactButton";
import { AGENCIES, allSources, getAgency } from "@/data/agencies";
import { SITE } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return AGENCIES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agency = getAgency(slug);
  if (!agency) return {};
  return {
    title: `${agency.name}: profile, clients and sources`,
    description: `${agency.summary} Every fact is linked to a public source.`,
    alternates: { canonical: `/agencies/${agency.slug}` },
  };
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = getAgency(slug);
  if (!agency) notFound();

  const sources = allSources(agency);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "Agency directory", item: `${SITE.url}/agencies` },
        { "@type": "ListItem", position: 3, name: agency.name, item: `${SITE.url}/agencies/${agency.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: agency.name,
      ...(agency.website ? { url: agency.website } : {}),
      ...(agency.founded ? { foundingDate: String(agency.founded) } : {}),
      description: agency.summary,
      sameAs: sources.map((s) => s.url),
    },
  ];

  const place = agency.locations.length ? agency.locations.join(", ") : agency.country;

  return (
    <PageShell
      eyebrow={agency.category}
      title={agency.name}
      intro={agency.summary}
      before={
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-fg">Home</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li><Link href="/agencies" className="hover:text-fg">Agency directory</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
            <li aria-current="page" className="text-fg">{agency.name}</li>
          </ol>
        </nav>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />


      <dl className="panel grid gap-px overflow-hidden bg-line sm:grid-cols-3 [&>div]:bg-surface [&>div]:p-5">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Based in</dt>
          <dd className="mt-1 text-sm font-medium text-fg">{place}{agency.locations.length ? `, ${agency.country}` : ""}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Established</dt>
          <dd className="mt-1 text-sm font-medium text-fg">{agency.founded ?? "Not confirmed"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Website</dt>
          <dd className="mt-1 text-sm font-medium text-fg">
            {agency.website ? (
              <a href={agency.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline underline-offset-2 hover:text-accent-hover">
                {new URL(agency.website).hostname.replace(/^www\./, "")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              "Not confirmed"
            )}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="facts" className="mt-12">
        <h2 id="facts" className="text-2xl font-bold tracking-tight text-fg">What we found, and where it comes from</h2>
        <ul className="mt-5 space-y-4">
          {agency.facts.map((f) => (
            <li key={f.text} className="panel p-5">
              <p className="text-sm leading-relaxed text-fg">{f.text}</p>
              <p className="mt-2 text-xs text-muted">
                Source:{" "}
                <a href={f.source.url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
                  {f.source.label}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {agency.clients.length > 0 && (
        <section aria-labelledby="clients" className="mt-12">
          <h2 id="clients" className="text-2xl font-bold tracking-tight text-fg">Clients named in public sources</h2>
          <p className="mt-2 text-sm text-muted">
            Examples only, not a full client list. Being named does not mean the relationship is current.
          </p>
          <div className="mt-5 space-y-4">
            {agency.clients.map((g) => (
              <div key={g.source.url} className="panel p-5">
                <p className="text-sm leading-relaxed text-fg">{g.names.join(", ")}</p>
                <p className="mt-2 text-xs text-muted">
                  Source:{" "}
                  <a href={g.source.url} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-hover">
                    {g.source.label}
                  </a>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {agency.notes.length > 0 && (
        <section aria-labelledby="notes" className="mt-12">
          <h2 id="notes" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-fg">
            <Info className="h-5 w-5 text-warn" aria-hidden="true" />
            Caveats and things to check
          </h2>
          <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-relaxed text-muted marker:text-warn">
            {agency.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="sources" className="mt-12">
        <h2 id="sources" className="text-2xl font-bold tracking-tight text-fg">All sources</h2>
        <ol className="mt-5 list-decimal space-y-1.5 pl-6 text-sm text-muted">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words text-accent underline underline-offset-2 hover:text-accent-hover">
                {s.label}
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">Last checked {fmt(agency.lastVerified)}. Details change, so confirm with the agency before you decide.</p>
      </section>

      <div className="panel mt-12 flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-fg">Is this you, or is something wrong?</h2>
          <p className="mt-1 text-sm text-muted">Send a correction with public source links and we will review it.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ListingButton variant="secondary">Suggest a correction</ListingButton>
          <ContactButton
            variant="ghost"
            prefill={{ topic: "Help shortlisting agencies", message: `I was looking at ${agency.name} and would like help comparing options.` }}
          >
            Ask us to help shortlist agencies
          </ContactButton>
          <Button href="/agencies" variant="ghost">Back to directory</Button>
        </div>
      </div>
    </PageShell>
  );
}
