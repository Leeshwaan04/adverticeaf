import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Agency } from "@/data/agencies";

export default function AgencyCard({ agency, headingLevel: Heading = "h3" }: { agency: Agency; headingLevel?: "h2" | "h3" }) {
  const clients = agency.clients.flatMap((c) => c.names).slice(0, 4);
  const place = agency.locations[0] ? `${agency.locations[0]}, ${agency.country}` : agency.country;

  return (
    <article className="panel panel-hover relative flex h-full flex-col p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">{agency.category}</p>
      <Heading className="mt-2 text-xl font-bold leading-snug text-fg">
        <Link href={`/agencies/${agency.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-2xl">
          {agency.name}
        </Link>
      </Heading>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {place}
        {agency.founded ? <span aria-hidden="true">&middot;</span> : null}
        {agency.founded ? <span>Est. {agency.founded}</span> : null}
      </p>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{agency.summary}</p>
      {clients.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-fg">Named clients: </span>
          {clients.join(", ")}
        </p>
      )}
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        View sources and details
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </article>
  );
}
