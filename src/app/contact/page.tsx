import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { ContactForm } from "@/components/ContactModal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send AdverticeAF a message about creative work, a listing correction or anything else.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell eyebrow="Contact" title="Tell us what you are working on" intro="Share a few details and we will reply by email.">
      <div className="panel p-6 sm:p-8">
        <ContactForm prefill={{}} />
      </div>
      {(SITE.contactEmail || SITE.location) && (
        <dl className="mt-8 space-y-3 text-sm">
          {SITE.contactEmail && (
            <div>
              <dt className="font-semibold text-fg">Email</dt>
              <dd>
                <a href={`mailto:${SITE.contactEmail}`} className="text-accent underline underline-offset-2">{SITE.contactEmail}</a>
              </dd>
            </div>
          )}
          {SITE.location && (
            <div>
              <dt className="font-semibold text-fg">Based in</dt>
              <dd className="text-muted">{SITE.location}</dd>
            </div>
          )}
        </dl>
      )}
    </PageShell>
  );
}
