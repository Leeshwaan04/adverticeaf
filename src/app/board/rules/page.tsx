import type { Metadata } from "next";
import Link from "next/link";
import { RULES, SEASONS } from "@/lib/board/config";
import { formatUsd } from "@/lib/board/format";
import { Crown, Flame, Zap, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules & FAQ — Live Bidding Leaderboard",
  description: "How AdverticeAF's pay-to-rank advertising auction works, bidding mechanics, seasons, and verification.",
  alternates: { canonical: "/board/rules" },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is rank calculated on AdverticeAF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rank is sorted in descending order of total USD spent within the active season. The listing with the highest approved spend is #1. Ties are broken by chronological order (who achieved the total amount first).",
      },
    },
    {
      "@type": "Question",
      name: "What is the minimum bid?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `The minimum bid is ${formatUsd(RULES.minBidCents)} USD. All bids move in whole dollar increments. To take the #1 spot, your total spend must exceed the current leader by at least ${formatUsd(RULES.leadMarginCents)}.`,
      },
    },
    {
      "@type": "Question",
      name: "Do I lose my spend if someone outbids me?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No, spend accumulates permanently on your listing across all-time boards. When another bidder overtakes you, your position drops to #2, but your total spend stays credited to your domain. You can boost again at any time to regain #1.",
      },
    },
    {
      "@type": "Question",
      name: "How does domain verification work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Domain owners can verify ownership by adding a simple DNS TXT record or HTML meta tag. Verified listings receive an authentic green badge, protecting their brand identity and building trust with visitors.",
      },
    },
  ],
};

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leaderboard
        </Link>
      </div>

      <div className="border-b border-line pb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent border border-accent/20">
          <Crown className="h-3.5 w-3.5" />
          Game Rules
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl font-display">
          Rules & Frequently Asked Questions
        </h1>
        <p className="mt-2 text-base text-muted">
          AdverticeAF is a transparent, real-time pay-to-rank attention leaderboard. Here is exactly how it works.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
            <Crown className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-bold text-fg">King of the Hill</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            The top bidder holds spot #1 with premium spotlight exposure, verified styling, and prime traffic.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Flame className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-bold text-fg">Instant Outbids</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Anyone can outbid the current leader at any time. Enter a bid that beats their total spend to overtake them instantly.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface/50 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-base font-bold text-fg">Cumulative Spend</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Your bids accumulate! Each new bid adds to your total spend, pushing your rank higher step by step.
          </p>
        </div>
      </div>

      {/* Rules Breakdown */}
      <div className="mt-12 space-y-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-fg font-display">
            The Core Mechanics
          </h2>
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
            <div className="p-5">
              <h3 className="text-sm font-bold text-fg">1. How is rank calculated?</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                Rank is sorted in descending order of total USD spent within the active season. The listing with the highest
                approved spend is #1. Ties are broken by chronological order (who achieved the total amount first).
              </p>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-bold text-fg">2. What is the minimum bid?</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                The minimum bid is {formatUsd(RULES.minBidCents)} USD. All bids must be in whole dollar amounts.
                To take the #1 spot, your total spend must exceed the current leader by at least {formatUsd(RULES.leadMarginCents)}.
              </p>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-bold text-fg">3. What are the seasons?</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SEASONS.map((s) => (
                  <div key={s.id} className="rounded-xl bg-raised/50 p-3 text-xs">
                    <span className="font-bold text-fg">{s.label}</span>
                    <p className="text-muted mt-0.5">{s.blurb}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-bold text-fg">4. Do I lose my money if someone outbids me?</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                No money is lost — your listing remains permanently on the leaderboard and all-time boards at your new cumulative
                spend. When another bidder overtakes you, your position drops to #2, but your total spend stays credited to your domain.
                You can boost again at any time to regain your rank.
              </p>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-bold text-fg">5. How does domain verification work?</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">
                Domain owners can optionally verify their website by adding a simple DNS TXT record or HTML meta tag.
                Verified listings receive an authentic green badge, protecting their brand identity and building trust with visitors.
              </p>
            </div>
          </div>
        </div>

        {/* Prohibited Content */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-fg font-display">
            Content Guidelines
          </h2>
          <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-muted leading-relaxed">
              We maintain a safe, high-quality directory. The following are strictly forbidden and will be removed without refund:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm text-muted">
              <li>Malware, spyware, phishing, or deceptive redirection chains</li>
              <li>Illegal narcotics, counterfeit goods, or unauthorized financial schemes</li>
              <li>Hate speech, defamation, or content encouraging harassment</li>
              <li>Shortened URLs (bit.ly, tinyurl, etc.) intended to mask the final destination</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-line pt-6">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          &larr; Back to Leaderboard
        </Link>
        <Link href="/terms" className="text-xs text-muted hover:text-fg">
          View Full Legal Terms
        </Link>
      </div>
    </div>
  );
}
