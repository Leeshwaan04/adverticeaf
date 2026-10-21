import type { Campaign, CampaignCategory, CampaignFormat } from "@/data/campaigns";

/** A paid Spotlight served by /api/promoted. It has no detail page and no fabricated metrics. */
export type PaidCampaign = Campaign & { paid: true; endsAt: number };

const API = (process.env.NEXT_PUBLIC_PAYMENTS_API ?? "").replace(/\/$/, "");
/** Same neutral placeholder the Promote flow used before. Buyers cannot supply remote images. */
const PLACEHOLDER = "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80";

interface PromotedResponse {
  active: null | {
    orderId: string;
    endsAt: number;
    startsAt: number;
    campaign: {
      title: string; brand: string; agencyName: string; tagline: string; websiteUrl: string;
      category: string; format: string; theHook: string; theAngle: string; theResult: string;
    };
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** The paid Spotlight live right now, or null (nothing paid, payments not configured, or offline). */
export async function fetchPaidPromotion(): Promise<PaidCampaign | null> {
  try {
    const res = await fetch(`${API}/api/promoted`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as PromotedResponse;
    const a = data.active;
    if (!a || typeof a.orderId !== "string") return null;
    const c = a.campaign;
    // Server data is untrusted: only https links, bounded text.
    const url = str(c.websiteUrl, 300);
    if (!/^https:\/\//.test(url)) return null;
    const title = str(c.title, 80);
    return {
      id: `paid-${a.orderId}`,
      slug: `paid-${a.orderId}`,
      title,
      brand: str(c.brand, 60),
      agency: { name: str(c.agencyName, 60) || str(c.brand, 60), verified: false },
      tagline: str(c.tagline, 120),
      description: str(c.theAngle, 200) || str(c.tagline, 120),
      hookBreakdown: { theHook: str(c.theHook, 200) || str(c.tagline, 120), theAngle: str(c.theAngle, 200), theResult: str(c.theResult, 200) },
      mediaType: "image",
      mediaUrl: url,
      thumbnailUrl: PLACEHOLDER,
      format: str(c.format, 40) as CampaignFormat,
      category: str(c.category, 40) as CampaignCategory,
      initialUpvotes: 0,
      metrics: {},
      launchedAt: new Date(a.startsAt).toISOString(),
      promoted: true,
      badge: "Promoted",
      creativeAngle: "Paid placement",
      websiteUrl: url,
      paid: true,
      endsAt: a.endsAt,
    };
  } catch {
    return null;
  }
}
