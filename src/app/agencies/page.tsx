import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import DirectoryExplorer from "@/components/DirectoryExplorer";
import { ListingButton } from "@/components/ContactButton";
import { AGENCIES } from "@/data/agencies";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agency Directory",
  description: `${AGENCIES.length} creative and social-first ad agencies, with every fact linked to a public source and disagreements between sources noted.`,
  alternates: { canonical: "/agencies" },
};

export default function AgenciesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AdverticeAF agency directory",
    itemListElement: AGENCIES.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.name,
      url: `${SITE.url}/agencies/${a.slug}`,
    })),
  };

  return (
    <PageShell
      wide
      eyebrow="Agency directory"
      title="Creative and social-first agencies"
      reviewed
      intro={
        <>
          {AGENCIES.length} agencies, each profiled from public sources. Facts link to where they came from, and we say
          so where sources disagree. This is not a ranking and listing is not an endorsement. Read{" "}
          <Link href="/methodology" className="text-accent underline underline-offset-2">how it works</Link>.
        </>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Suspense fallback={<p className="text-sm text-muted">Loading directory...</p>}>
        <DirectoryExplorer />
      </Suspense>
      <div className="panel mt-12 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-fg">Run an agency, or spotted a mistake?</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Suggest a listing or correct one. Send public source links and we will check them before anything changes.
          </p>
        </div>
        <ListingButton variant="secondary">Suggest or correct a listing</ListingButton>
      </div>
    </PageShell>
  );
}
