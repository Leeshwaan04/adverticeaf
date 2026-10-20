export interface CampaignAgency {
  name: string;
  slug?: string;
  verified: boolean;
  avatarUrl?: string;
}

export type CampaignFormat =
  | "Reel / TikTok"
  | "TVC / Film"
  | "Stunt / Guerrilla"
  | "Meme / Social"
  | "Static / OOH";

export type CampaignCategory =
  | "DTC & Consumer"
  | "SaaS & Tech"
  | "B2B & Enterprise"
  | "Food & Beverage"
  | "Entertainment & Gaming"
  | "Fashion & Lifestyle";

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  brand: string;
  agency: CampaignAgency;
  tagline: string;
  description: string;
  hookBreakdown: {
    theHook: string;
    theAngle: string;
    theResult: string;
  };
  mediaType: "video" | "image";
  mediaUrl: string;
  thumbnailUrl: string;
  format: CampaignFormat;
  category: CampaignCategory;
  initialUpvotes: number;
  metrics: {
    views?: string;
    roas?: string;
    impressions?: string;
  };
  launchedAt: string; // ISO date
  featured?: boolean;
  promoted?: boolean;
  promotedUntil?: string;
  badge?: "Campaign of the Day" | "Campaign of the Week" | "Promoted" | null;
  creativeAngle: string;
  websiteUrl: string;
}

export const CAMPAIGN_FORMATS: CampaignFormat[] = [
  "Reel / TikTok",
  "TVC / Film",
  "Stunt / Guerrilla",
  "Meme / Social",
  "Static / OOH",
];

export const CAMPAIGN_CATEGORIES: CampaignCategory[] = [
  "DTC & Consumer",
  "SaaS & Tech",
  "B2B & Enterprise",
  "Food & Beverage",
  "Entertainment & Gaming",
  "Fashion & Lifestyle",
];

export const CAMPAIGNS_SEED: Campaign[] = [
  {
    id: "liquid-death-iced-tea",
    slug: "liquid-death-iced-tea",
    title: "Liquid Death: Better Than Your Grandma's Tea",
    brand: "Liquid Death",
    agency: {
      name: "Liquid Death In-House",
      verified: true,
    },
    tagline: "Heavy-metal flavored iced tea in infinitely recyclable tallboy cans.",
    description:
      "A tongue-in-cheek campaign turning traditional wholesome southern sweet tea tropes into aggressive, heavy-metal thirst murder.",
    hookBreakdown: {
      theHook: "A grandmother headbanging to death metal while crushing an iced tea can on her forehead.",
      theAngle: "Absurdist subversion of nostalgic iced tea marketing.",
      theResult: "42M+ organic views across TikTok and Reels, sellout in 18,000 retail stores.",
    },
    mediaType: "video",
    mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80",
    format: "Reel / TikTok",
    category: "Food & Beverage",
    initialUpvotes: 842,
    metrics: {
      views: "42M+",
      impressions: "110M",
      roas: "4.8x",
    },
    launchedAt: "2026-10-20T10:00:00Z",
    featured: true,
    badge: "Campaign of the Day",
    creativeAngle: "Absurdist Comedy & Subversion",
    websiteUrl: "https://liquiddeath.com",
  },
  {
    id: "mischief-tubby-todd",
    slug: "mischief-tubby-todd",
    title: "Mischief: The Parenting Lie Detector",
    brand: "Tubby Todd",
    agency: {
      name: "Mischief @ No Fixed Address",
      slug: "mischief-no-fixed-address",
      verified: true,
    },
    tagline: "Unapologetically honest confessions about bedtime parenting chaos.",
    description:
      "Mischief hooked exhausted parents by putting real moms and dads on polygraph machines, asking the taboo questions every parent secretly feels.",
    hookBreakdown: {
      theHook: "'Do you actually enjoy singing the bedtime song?' followed by an immediate polygraph spike.",
      theAngle: "Radical parenting empathy disguised as an FBI interrogation.",
      theResult: "310% surge in DTC subscriptions and Adweek Campaign of the Year nod.",
    },
    mediaType: "video",
    mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1200&q=80",
    format: "TVC / Film",
    category: "DTC & Consumer",
    initialUpvotes: 624,
    metrics: {
      views: "18M+",
      impressions: "45M",
      roas: "3.9x",
    },
    launchedAt: "2026-10-19T14:30:00Z",
    badge: "Campaign of the Week",
    creativeAngle: "Radical Relatability",
    websiteUrl: "https://tubbytodd.com",
  },
  {
    id: "surreal-cereal-celebrity-stunt",
    slug: "surreal-cereal-celebrity-stunt",
    title: "Surreal Cereal: Legally Free Celebrity Endorsements",
    brand: "Surreal",
    agency: {
      name: "Surreal Creative Studio",
      verified: true,
    },
    tagline: "Hiring random normal people named Dwayne Johnson and Serena Williams.",
    description:
      "Unable to afford A-list athletes, Surreal hired ordinary UK citizens with identical legal names to endorse their high-protein cereal on London billboards.",
    hookBreakdown: {
      theHook: "'Dwayne Johnson loves our cereal' on a massive London billboard, alongside a regular balding British accountant.",
      theAngle: "High-legal-IQ humor weaponizing trademark loopholes.",
      theResult: "Went viral on LinkedIn and Twitter with zero media spend, covered by BBC and Campaign.",
    },
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
    format: "Static / OOH",
    category: "Food & Beverage",
    initialUpvotes: 789,
    metrics: {
      views: "35M+",
      impressions: "92M",
      roas: "6.2x",
    },
    launchedAt: "2026-10-18T08:00:00Z",
    creativeAngle: "Guerilla Loophole Stunt",
    websiteUrl: "https://eatsurreal.co.uk",
  },
  {
    id: "duolingo-unhinged-tiktok",
    slug: "duolingo-unhinged-tiktok",
    title: "Duolingo: The Green Owl Hostage Negotiations",
    brand: "Duolingo",
    agency: {
      name: "Duolingo Social Lab",
      verified: true,
    },
    tagline: "Threatening users in the comment section until they finish Spanish lessons.",
    description:
      "Duolingo revolutionized brand social media by turning their mascot Duo into a chaotic, mildly unhinged menace in TikTok comments.",
    hookBreakdown: {
      theHook: "A 6-foot green owl stalking Google HQ demanding French practice.",
      theAngle: "Meme native creator behavior instead of corporate PR tone.",
      theResult: "12M+ TikTok followers, highest retention streak in edtech history.",
    },
    mediaType: "video",
    mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    format: "Meme / Social",
    category: "SaaS & Tech",
    initialUpvotes: 955,
    metrics: {
      views: "88M+",
      impressions: "250M",
      roas: "N/A (Organic)",
    },
    launchedAt: "2026-10-17T11:00:00Z",
    creativeAngle: "Unhinged Brand Mascot",
    websiteUrl: "https://duolingo.com",
  },
  {
    id: "fp7-mccann-ketchup-fraud",
    slug: "fp7-mccann-ketchup-fraud",
    title: "Heinz: It Has to Be Heinz (Diner Refill Caught on Tape)",
    brand: "Heinz Ketchup",
    agency: {
      name: "FP7 McCann",
      slug: "fp7-mccann",
      verified: true,
    },
    tagline: "Catching restaurants refilling Heinz bottles with generic ketchup.",
    description:
      "Real photography documenting diner servers caught red-handed refilling glass Heinz bottles with cheap bulk ketchup, turning bad behavior into the ultimate brand loyalty proof.",
    hookBreakdown: {
      theHook: "Candid surveillance-style photos of diner staff pouring off-brand ketchup into Heinz bottles.",
      theAngle: "Even when restaurants cheat, they admit customers only accept Heinz.",
      theResult: "Grand Prix winner at Cannes Lions, massive global PR pickup.",
    },
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=1200&q=80",
    format: "Static / OOH",
    category: "Food & Beverage",
    initialUpvotes: 512,
    metrics: {
      views: "22M+",
      impressions: "68M",
      roas: "N/A (Brand)",
    },
    launchedAt: "2026-10-16T16:00:00Z",
    creativeAngle: "Reverse Consumer Proof",
    websiteUrl: "https://heinz.com",
  },
  {
    id: "dentsu-creative-unfiltered-history",
    slug: "dentsu-creative-unfiltered-history",
    title: "Dentsu Creative: The Unfiltered History Tour",
    brand: "Vice World News",
    agency: {
      name: "Dentsu Creative India",
      slug: "dentsu-creative-india",
      verified: true,
    },
    tagline: "Augmented Reality uncovering the looted artifacts in the British Museum.",
    description:
      "A rogue AR filter that scans stolen artifacts inside the British Museum and displays their true indigenous history narrated by experts from their home countries.",
    hookBreakdown: {
      theHook: "Hold your phone up to the Rosetta Stone to hear its actual Egyptian curator speak.",
      theAngle: "Guerilla museum hack through mobile camera lenses.",
      theResult: "Triple Grand Prix at Cannes Lions, #1 downloaded AR educational filter.",
    },
    mediaType: "video",
    mediaUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://images.unsplash.com/photo-1544928147-79a2dbc1f389?auto=format&fit=crop&w=1200&q=80",
    format: "Stunt / Guerrilla",
    category: "Entertainment & Gaming",
    initialUpvotes: 489,
    metrics: {
      views: "14M+",
      impressions: "38M",
    },
    launchedAt: "2026-10-15T09:00:00Z",
    creativeAngle: "Guerilla AR Education",
    websiteUrl: "https://viceworldnews.com",
  },
];
