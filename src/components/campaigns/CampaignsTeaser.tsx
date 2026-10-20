import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CampaignCard from "@/components/campaigns/CampaignCard";
import Section from "@/components/ui/Section";
import { CAMPAIGNS_SEED } from "@/data/campaigns";

export default function CampaignsTeaser() {
  const featured = CAMPAIGNS_SEED.slice(0, 3);

  return (
    <Section
      id="campaigns-showcase"
      eyebrow="Creative Leaderboard"
      title="The Front Page of Viral Advertising"
      description="Discover, upvote, and critique the world's most creative ad campaigns, guerrilla stunts, and viral reels."
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((campaign, idx) => (
          <CampaignCard key={campaign.id} campaign={campaign} rank={idx + 1} />
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-accent/30"
        >
          <span>Explore Live Campaign Leaderboard</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-bold text-fg transition-all hover:border-line-strong hover:bg-raised"
        >
          <span>Submit a Campaign</span>
        </Link>
      </div>
    </Section>
  );
}
