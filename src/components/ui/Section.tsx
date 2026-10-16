import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Adds a subtle band so adjacent sections read as separate blocks. */
  tinted?: boolean;
  headingLevel?: "h1" | "h2";
}

export default function Section({ id, eyebrow, title, description, children, tinted, headingLevel = "h2" }: SectionProps) {
  const Heading = headingLevel;
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={`py-20 sm:py-24 ${tinted ? "border-y border-line bg-surface/50" : ""}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
          <Heading id={id ? `${id}-title` : undefined} className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {title}
          </Heading>
          {description && <div className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{description}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
