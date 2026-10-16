import type { Metadata } from "next";
import Link from "next/link";
import PageShell, { Prose } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "How the directory works",
  description: "How AdverticeAF compiles, sources, checks and corrects agency profiles, and what we deliberately leave out.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <PageShell
      eyebrow="Methodology"
      title="How the directory works"
      intro="What goes into a profile, how we check it, and what we leave out on purpose."
      reviewed
    >
      <Prose>
        <h2>Which agencies are included</h2>
        <p>
          The directory covers creative, social-first and performance-creative agencies. It is a small, hand-built
          selection, not a complete census of the industry, and an agency being absent says nothing about its quality.
          Inclusion is not an endorsement and placement is not for sale.
        </p>

        <h2>What a profile contains</h2>
        <ul>
          <li><strong>Basic facts:</strong> where it is based, when it started, its category and website.</li>
          <li><strong>Recognition and milestones:</strong> awards, ownership changes and similar events, each with a source.</li>
          <li><strong>Named clients:</strong> clients mentioned in public sources, labelled as examples and never as a complete list.</li>
          <li><strong>Caveats:</strong> where sources disagree, where information may be out of date, and what we could not confirm.</li>
        </ul>

        <h2>Where facts come from</h2>
        <p>We use public sources only, in this rough order of preference:</p>
        <ul>
          <li>The agency&apos;s own website, labelled as self-reported.</li>
          <li>Reputable trade and business press.</li>
          <li>Award bodies and event pages.</li>
          <li>Business databases, used with care and labelled when they are the only source.</li>
        </ul>
        <p>
          Every fact on a profile links to the page it came from. If we cannot source a claim, we leave it out. We do not
          use private information, scraped personal data or anonymous tips.
        </p>

        <h2>How we word claims</h2>
        <p>
          Claims an agency makes about itself, such as team size or revenue figures, are written as &ldquo;says&rdquo; or
          &ldquo;reports&rdquo; and are not presented as established fact. Awards and ownership changes are stated as the source
          states them.
        </p>

        <h2>What we leave out, and why</h2>
        <ul>
          <li><strong>Ratings and review counts.</strong> We cannot collect or verify genuine reviews, so we show none.</li>
          <li><strong>Rankings.</strong> Agencies serve different needs. Any single ranking would be arbitrary.</li>
          <li><strong>&ldquo;Verified&rdquo; badges.</strong> We have no verification process that would justify the word.</li>
          <li><strong>Pricing and minimum budgets,</strong> unless an agency publishes them and we can cite it.</li>
        </ul>

        <h2>Keeping it current</h2>
        <p>
          Each profile shows the date it was last checked. Agencies change ownership, leadership and clients, so treat any
          profile as a starting point and confirm details with the agency before you decide.
        </p>

        <h2>Corrections and removals</h2>
        <p>
          If you represent an agency, or you spot an error, use the suggestion form on the{" "}
          <Link href="/agencies">directory page</Link> and include public source links. We review each request, correct
          factual errors, and remove information we cannot source. We may email you to confirm you represent the agency.
        </p>

        <h2>Independence</h2>
        <p>
          AdverticeAF also sells creative services (see <Link href="/#services">Services</Link>), so we are not a neutral
          party in every sense. We do not list ourselves in the directory, and we do not change profiles in return for
          payment or favours.
        </p>
      </Prose>
    </PageShell>
  );
}
