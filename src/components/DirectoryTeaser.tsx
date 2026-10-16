import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import AgencyCard from "@/components/AgencyCard";
import { AGENCIES, getAgency } from "@/data/agencies";

const PICKS = ["mischief-no-fixed-address", "schbang", "fp7-mccann"];

export default function DirectoryTeaser() {
  const picks = PICKS.map(getAgency).filter((a): a is NonNullable<typeof a> => Boolean(a));
  return (
    <Section
      eyebrow="Agency directory"
      title="Agencies, with the receipts"
      description={`${AGENCIES.length} creative and social-first agencies. Each profile shows where every fact came from, who says so, and where sources disagree.`}
    >
      <ul className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
        {picks.map((a) => (
          <li key={a.slug}>
            <AgencyCard agency={a} />
          </li>
        ))}
      </ul>
      <div className="mt-8 flex justify-center">
        <Button href="/agencies" variant="secondary">
          See all {AGENCIES.length} agencies
        </Button>
      </div>
    </Section>
  );
}
