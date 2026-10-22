export const CAMPAIGN_CATEGORIES = [
  "Consumer Brands & FMCG",
  "Tech & AI",
  "Fintech & Crypto",
  "App & SaaS",
  "Food & Beverage",
  "Fashion & Apparel",
  "Entertainment & Gaming",
  "Health & Wellness",
  "Services & B2B",
] as const;

export const CAMPAIGN_FORMATS = [
  "Reel / TikTok",
  "TVC / Film",
  "Stunt / Guerrilla",
  "Static / OOH",
  "Social Campaign",
] as const;

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  brand: string;
  tagline: string;
  agency: { name: string; verified: boolean };
  description: string;
  hookBreakdown: {
    theHook: string;
    theAngle: string;
    theResult: string;
  };
  mediaType: "image" | "video";
  mediaUrl: string;
  websiteUrl: string;
  thumbnailUrl: string;
  format: string;
  category: string;
  metrics: Record<string, unknown>;
  initialUpvotes: number;
  launchedAt: string;
  creativeAngle: string;
  promoted?: boolean;
  badge?: string;
}

export const PROMOTION_PLANS = {
  "24h": { cents: 2900, durationMs: 24 * 60 * 60 * 1000, label: "24h Spotlight" },
  "7d": { cents: 7900, durationMs: 7 * 24 * 60 * 60 * 1000, label: "7-Day Spotlight" },
} as const;

export type PromotionPlan = keyof typeof PROMOTION_PLANS;

export function parsePromotion(input: unknown): { plan: PromotionPlan; campaign: Campaign } {
  if (!input || typeof input !== "object") throw new Error("Invalid promotion request.");
  const { plan, campaign } = input as Record<string, unknown>;
  if (plan !== "24h" && plan !== "7d") throw new Error("Choose a valid placement plan.");
  if (!campaign || typeof campaign !== "object") throw new Error("Campaign details are required.");
  const data = campaign as Record<string, unknown>;
  function text(key: string, max: number, required = false): string {
    const value = data[key];
    if (value !== undefined && typeof value !== "string") throw new Error(`Invalid ${key}.`);
    const result = typeof value === "string" ? value.trim() : "";
    if ((required && !result) || result.length > max) throw new Error(`Invalid ${key}.`);
    return result;
  }
  function url(key: string, required = false): string {
    const value = text(key, 2048, required);
    if (!value) return "";
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new Error(`Invalid ${key}.`); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error(`${key} must be a public HTTPS URL without credentials.`);
    }
    return parsed.href;
  }
  const title = text("title", 160, true);
  const brand = text("brand", 100, true);
  const tagline = text("tagline", 300, true);
  const format = CAMPAIGN_FORMATS.find((value) => value === data.format);
  const category = CAMPAIGN_CATEGORIES.find((value) => value === data.category);
  if (!format || !category) throw new Error("Choose a valid format and category.");
  const websiteUrl = url("websiteUrl", true);
  const id = `paid-${crypto.randomUUID()}`;
  return {
    plan,
    campaign: {
      id, slug: id, title, brand, tagline,
      agency: { name: text("agencyName", 100) || brand, verified: false },
      description: text("theAngle", 2000) || tagline,
      hookBreakdown: {
        theHook: text("theHook", 1000) || tagline,
        theAngle: text("theAngle", 2000) || tagline,
        theResult: text("theResult", 1000) || "Not provided by the advertiser.",
      },
      mediaType: format === "Static / OOH" ? "image" : "video",
      mediaUrl: websiteUrl,
      websiteUrl,
      thumbnailUrl: url("thumbnailUrl") || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      format, category, metrics: {}, initialUpvotes: 0,
      launchedAt: new Date().toISOString(),
      creativeAngle: text("creativeAngle", 100) || "Advertiser submission",
      promoted: true, badge: "Promoted",
    },
  };
}
