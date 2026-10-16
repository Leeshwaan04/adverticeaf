import Section from "@/components/ui/Section";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

const FAQS: { q: string; a: React.ReactNode; text: string }[] = [
  {
    q: "Is the Hook Checker AI?",
    text: "No. It is a rule-based checklist with six criteria that you can see. It does not predict performance. Use it to catch common weaknesses, then test real ads.",
    a: "No. It is a rule-based checklist with six criteria that you can see. It does not predict performance. Use it to catch common weaknesses, then test real ads.",
  },
  {
    q: "Where does the agency directory data come from?",
    text: "Public sources only: the agency's own site, trade press and business databases. Each fact on a profile links to its source, and we note where sources disagree.",
    a: (
      <>
        Public sources only: the agency&apos;s own site, trade press and business databases. Each fact on a profile links to its
        source, and we note where sources disagree. Read the full approach on the{" "}
        <Link href="/methodology" className="text-accent underline underline-offset-2">methodology page</Link>.
      </>
    ),
  },
  {
    q: "Are there ratings or rankings?",
    text: "No. We have no way to collect or check genuine reviews, so we do not show ratings, review counts or rankings.",
    a: "No. We have no way to collect or check genuine reviews, so we do not show ratings, review counts or rankings.",
  },
  {
    q: "How do I correct or add an agency?",
    text: "Use the suggestion form on the directory page. Send public source links so we can check the details before anything changes.",
    a: (
      <>
        Use the suggestion form on the{" "}
        <Link href="/agencies" className="text-accent underline underline-offset-2">directory page</Link>. Send public source
        links so we can check the details before anything changes.
      </>
    ),
  },
  {
    q: "Is the Budget Planner a forecast?",
    text: "No. It is a simple model that shows how your own assumptions combine. It ignores returns, repeat purchases and changes in cost as you scale.",
    a: "No. It is a simple model that shows how your own assumptions combine. It ignores returns, repeat purchases and changes in cost as you scale.",
  },
  {
    q: "What happens to the details I send you?",
    text: "We use them to reply to you. The tools on this page run in your browser and send nothing. See the privacy policy for specifics.",
    a: (
      <>
        We use them to reply to you. The tools on this page run in your browser and send nothing. See the{" "}
        <Link href="/privacy" className="text-accent underline underline-offset-2">privacy policy</Link> for specifics.
      </>
    ),
  },
];

export default function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.text },
    })),
  };

  return (
    <Section id="faq" tinted eyebrow="Questions" title="Straight answers">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-3xl divide-y divide-line rounded-2xl border border-line bg-surface">
        {FAQS.map((f) => (
          <details key={f.q} className="group px-5 py-1 sm:px-6">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-fg [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
