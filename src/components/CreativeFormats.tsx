import { Box, Layers, Smartphone, Zap } from "lucide-react";
import Section from "@/components/ui/Section";

const FORMATS = [
  {
    icon: Smartphone,
    title: "Creator-style (UGC) video",
    body: "A real person talking to camera on a phone: unboxings, honest comparisons, 'I tried it' stories. Low-fi on purpose, because it reads as a recommendation rather than an ad.",
    suits: "Consumer products on TikTok, Reels and Shorts",
  },
  {
    icon: Box,
    title: "3D and CGI product reveals",
    body: "Product shots that real cameras cannot make: objects suspended in impossible spaces, materials transforming, exaggerated physics. Built to earn a second look in a fast feed.",
    suits: "Products with a visual story to tell",
  },
  {
    icon: Zap,
    title: "Culture and meme formats",
    body: "Ads that borrow a familiar format, such as a corporate onboarding video or a fake podcast clip, and use it to deliver a real message. Needs a light touch and a fast turnaround.",
    suits: "Brands with a clear voice and a young audience",
  },
  {
    icon: Layers,
    title: "Landing pages for the ad",
    body: "A page that continues the ad's promise instead of dropping people on a generic homepage. Same message, same tone, one clear next step.",
    suits: "Anyone whose clicks are not converting",
  },
];

export default function CreativeFormats() {
  return (
    <Section
      id="formats"
      tinted
      eyebrow="What we make"
      title="Creative formats"
      description="The kinds of creative we produce. These are descriptions of formats to help you brief us, not examples of past client work."
    >
      <ul className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
        {FORMATS.map((f) => (
          <li key={f.title} className="panel p-6">
            <f.icon className="h-6 w-6 text-accent" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-fg">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            <p className="mt-4 text-xs text-muted">
              <span className="font-semibold text-fg">Often a fit for: </span>
              {f.suits}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
