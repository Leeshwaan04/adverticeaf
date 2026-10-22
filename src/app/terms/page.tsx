import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The ground rules and auction terms for AdverticeAF pay-to-rank leaderboard.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const operator = SITE.legalEntity || SITE.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-line pb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-[#e2573f]">Legal</span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl font-display">
          Terms of Use
        </h1>
        <p className="mt-2 text-base text-muted">
          The ground rules for participating in the AdverticeAF live pay-to-rank advertising market.
        </p>
      </div>

      <div className="prose prose-invert mt-8 max-w-none space-y-8 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="text-lg font-bold text-fg">1. Nature of the Service</h2>
          <p className="mt-2">
            AdverticeAF (operated by {operator}) operates a transparent, real-time public leaderboard where
            websites and products compete for rank and placement based on cumulative spend. By placing a bid
            or adding a URL to the board, you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">2. Bidding and Leaderboard Rankings</h2>
          <p className="mt-2">
            Placement on the board is determined strictly by total approved bid volume within the selected timeframe
            (Daily, Weekly, Monthly, or All-Time). Ties are resolved chronologically, favoring the earlier bidder.
            All bids must meet the minimum bid amount ($1.00 USD) and move in whole dollar increments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">3. Link Guidelines and Acceptance</h2>
          <p className="mt-2">
            All submitted URLs must point to legitimate, active websites. We strictly prohibit URLs that link to:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Malware, phishing, or deceptive software</li>
            <li>Illegal goods, unauthorized financial scams, or illicit services</li>
            <li>Hate speech, harassment, or defamatory content</li>
            <li>URL shorteners or redirect hops designed to obscure destination identity</li>
          </ul>
          <p className="mt-2">
            We reserve the right to review, reject, or remove any listing violating these guidelines without prior notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">4. Payments and Non-Refundability</h2>
          <p className="mt-2">
            Because placement positions and attention impressions take effect immediately upon payment confirmation,
            all completed bids and purchases are final and non-refundable, except where required by applicable consumer law
            or in proven cases of unauthorized fraudulent billing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">5. Third-Party Trademarks</h2>
          <p className="mt-2">
            All third-party brand names, logos, and trademarks appearing on the board belong to their respective owners
            and are displayed solely to identify participating websites and destinations. Their presence does not imply
            sponsorship, endorsement, or formal affiliation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-fg">6. Limitation of Liability</h2>
          <p className="mt-2">
            AdverticeAF is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not guarantee specific
            traffic volume, conversion rates, click-through rates, or financial returns resulting from leaderboard placement.
          </p>
        </section>

        <div className="border-t border-line pt-6">
          <Link href="/" className="text-sm font-semibold text-[#e2573f] hover:underline">
            &larr; Return to Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
