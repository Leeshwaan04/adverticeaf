import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { CAMPAIGNS_SEED } from "@/data/campaigns";
import CampaignDetailActions from "@/components/campaigns/CampaignDetailActions";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CAMPAIGNS_SEED.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = CAMPAIGNS_SEED.find((c) => c.slug === slug);
  if (!campaign) return { title: "Campaign Not Found" };

  return {
    title: `${campaign.title} - Creative Breakdown`,
    description: campaign.tagline,
    alternates: { canonical: `/campaigns/${campaign.slug}` },
  };
}

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const campaign = CAMPAIGNS_SEED.find((c) => c.slug === slug);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to all campaigns
      </Link>

      {/* Main Campaign Header */}
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              {campaign.format}
            </span>
            <span className="rounded-full bg-raised px-3 py-1 text-xs font-medium text-muted">
              {campaign.category}
            </span>
            {campaign.badge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
                <Trophy className="h-3.5 w-3.5" />
                {campaign.badge}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl lg:text-5xl">
            {campaign.title}
          </h1>
          <p className="mt-2 text-base text-muted sm:text-lg">{campaign.tagline}</p>
        </div>

        <div className="flex items-center">
          <CampaignDetailActions campaign={campaign} />
        </div>
      </div>

      {/* Hero Media Display */}
      <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-3xl border border-line bg-raised shadow-2xl">
        <Image
          src={campaign.thumbnailUrl}
          alt={campaign.title}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover"
        />
      </div>

      {/* Campaign Details Grid */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left 2 Cols: The Breakdown */}
        <div className="space-y-8 lg:col-span-2">
          {/* Creative Breakdown Teardown */}
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center gap-2 border-b border-line pb-4">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold text-fg">The Creative Teardown</h2>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  1. The Hook (Attention Grabber)
                </span>
                <p className="mt-1 text-sm font-medium text-fg sm:text-base">
                  {campaign.hookBreakdown.theHook}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  2. The Angle & Strategy
                </span>
                <p className="mt-1 text-sm font-medium text-fg sm:text-base">
                  {campaign.hookBreakdown.theAngle}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ok">
                  3. The Market Result
                </span>
                <p className="mt-1 text-sm font-medium text-fg sm:text-base">
                  {campaign.hookBreakdown.theResult}
                </p>
              </div>
            </div>
          </div>

          {/* Full Backstory */}
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h3 className="text-base font-bold text-fg">Campaign Overview</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              {campaign.description}
            </p>
          </div>
        </div>

        {/* Right Col: Agency Credits & Performance Metrics */}
        <div className="space-y-6">
          {/* Agency Credit Card */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Created By
            </span>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-lg font-bold text-fg">{campaign.agency.name}</h3>
              {campaign.agency.verified && (
                <CheckCircle2 className="h-4 w-4 text-ok" />
              )}
            </div>

            {campaign.agency.slug && (
              <Link
                href={`/agencies/${campaign.agency.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
              >
                <span>View Full Agency Profile & Roster</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Verified Performance Metrics */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Campaign Reach
            </span>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {campaign.metrics.views && (
                <div className="rounded-xl bg-raised/50 p-3">
                  <span className="text-[11px] text-muted">Views</span>
                  <p className="mt-0.5 text-lg font-black text-fg">
                    {campaign.metrics.views}
                  </p>
                </div>
              )}
              {campaign.metrics.impressions && (
                <div className="rounded-xl bg-raised/50 p-3">
                  <span className="text-[11px] text-muted">Impressions</span>
                  <p className="mt-0.5 text-lg font-black text-fg">
                    {campaign.metrics.impressions}
                  </p>
                </div>
              )}
              {campaign.metrics.roas && (
                <div className="rounded-xl bg-raised/50 p-3">
                  <span className="text-[11px] text-muted">Reported ROAS</span>
                  <p className="mt-0.5 text-lg font-black text-ok">
                    {campaign.metrics.roas}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
