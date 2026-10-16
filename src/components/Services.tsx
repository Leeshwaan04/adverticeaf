import { Check } from "lucide-react";
import Section from "@/components/ui/Section";
import ContactButton from "@/components/ContactButton";

const PLANS = [
  {
    name: "Creative Sprint",
    price: "From $3,450",
    period: "one-time",
    blurb: "A focused batch of new creative for a brand that needs fresh angles quickly.",
    features: [
      "10 scripted hooks",
      "4 finished UGC or motion ad variations",
      "Competitor creative review",
      "Formatted for TikTok, Reels and Shorts",
      "1 round of revisions",
    ],
    cta: "Ask about a Sprint",
    topic: "Creative production (UGC, video, 3D)",
    featured: false,
  },
  {
    name: "Scale",
    price: "From $6,850",
    period: "per month",
    blurb: "An ongoing creative partnership with regular testing of new angles.",
    features: [
      "20+ ad variations per month",
      "Weekly new angles to test",
      "3D and CGI product visuals where they fit",
      "Creator sourcing and matching",
      "Weekly performance review with your team",
      "Shared channel with your creative lead",
    ],
    cta: "Ask about Scale",
    topic: "Creative production (UGC, video, 3D)",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "From $12,500",
    period: "custom scope",
    blurb: "Larger programmes across several channels, scoped around your goals.",
    features: [
      "Higher creative volume across channels",
      "High-end 3D and CGI production",
      "Landing pages built for the campaign",
      "Creator and talent partnerships",
      "Media buying support if needed",
      "Dedicated team for your account",
    ],
    cta: "Request a scoping call",
    topic: "Creative production (UGC, video, 3D)",
    featured: false,
  },
];

export default function Services() {
  return (
    <Section
      id="services"
      eyebrow="Work with us"
      title="Services and starting prices"
      description="Starting prices for the three ways we work. Final scope, timing and price are agreed with you before any work begins."
    >
      <ul className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
        {PLANS.map((p) => (
          <li
            key={p.name}
            className={`panel flex flex-col p-7 ${p.featured ? "border-accent/60 ring-1 ring-accent/30" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-fg">{p.name}</h3>
              {p.featured && (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent">Most requested</span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{p.blurb}</p>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-fg">{p.price}</span>
              <span className="text-sm text-muted">{p.period}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-fg">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <ContactButton
              variant={p.featured ? "primary" : "secondary"}
              className="mt-8 w-full"
              prefill={{ topic: p.topic, message: `I am interested in: ${p.name}` }}
            >
              {p.cta}
            </ContactButton>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted">
        We do not promise specific performance results. Ad results depend on your product, offer, audience and budget,
        and we will tell you plainly if we think a project is not a fit.
      </p>
    </Section>
  );
}
