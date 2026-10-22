import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AdverticeAF handles data, analytics, payments, and outbid notification alerts.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const operator = SITE.legalEntity || SITE.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-line pb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">Legal</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl font-display">
          Privacy Policy
        </h1>
        <p className="mt-2 text-base text-muted">
          A plain-language summary of how AdverticeAF protects and handles your information.
        </p>
      </div>

      <div className="prose prose-invert mt-8 max-w-none space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-lg font-bold text-fg">1. Summary</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>We do not sell your personal data or run invasive third-party ad trackers.</li>
            <li>We only collect essential details needed to process bids and manage your link listings.</li>
            <li>Outbid email alerts are strictly opt-in and can be cancelled at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">2. Information We Collect</h2>
          <p className="mt-2">
            When you interact with AdverticeAF, we may process:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>Listing Data:</strong> Website URL, brand name, tagline, and chosen category.</li>
            <li><strong>Payment Records:</strong> Transaction references, timestamp, and amount spent (processed securely via our merchant partner). We never store or handle raw credit card numbers.</li>
            <li><strong>Outbid Alerts:</strong> Email address provided if you voluntarily opt in to receive outbid alerts for your domain.</li>
            <li><strong>Aggregate Traffic Metrics:</strong> Outbound clicks delivered from the board to listed websites.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">3. Payment Processing</h2>
          <p className="mt-2">
            Financial transactions are handled through certified PCI-DSS compliant payment gateways (such as Dodo Payments).
            Payment tokenization and billing information are governed by their respective privacy standards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">4. Contact & Operator</h2>
          <p className="mt-2">
            This site is operated by {operator}. For inquiries regarding privacy, data removal, or domain verification,
            contact us at{" "}
            {SITE.contactEmail ? (
              <a href={`mailto:${SITE.contactEmail}`} className="text-accent underline">
                {SITE.contactEmail}
              </a>
            ) : (
              "support@adverticeaf.com"
            )}
            .
          </p>
        </section>

        <div className="border-t border-line pt-6">
          <Link href="/" className="text-sm font-semibold text-accent hover:underline">
            &larr; Return to Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
