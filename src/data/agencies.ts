/**
 * Agency directory data.
 *
 * Editorial rules (see /methodology):
 *  - Every fact carries a public source. If we cannot source it, it is not here.
 *  - Self-reported claims are labelled as such in the text ("says", "reports").
 *  - Where sources disagree, we say so in `notes` instead of picking silently.
 *  - No ratings, review counts, rankings or "verified" badges: we have no
 *    process that could back them.
 */

export type Category =
  | "Full-Service Creative"
  | "Social & Creator"
  | "Meme & Culture"
  | "Performance & Paid Social";

export interface Source {
  label: string;
  url: string;
}

export interface Fact {
  text: string;
  source: Source;
}

export interface ClientGroup {
  names: string[];
  source: Source;
}

export interface Agency {
  slug: string;
  name: string;
  /** Omitted when we could not confirm the official site. */
  website?: string;
  category: Category;
  country: string;
  countryCode: string;
  /** Offices or hubs, as reported by the sources below. */
  locations: string[];
  founded?: number;
  /** One neutral sentence in our own words. */
  summary: string;
  facts: Fact[];
  clients: ClientGroup[];
  /** Caveats: disagreements between sources, stale data, things to check. */
  notes: string[];
  lastVerified: string;
}

export const CATEGORIES: readonly Category[] = [
  "Full-Service Creative",
  "Social & Creator",
  "Meme & Culture",
  "Performance & Paid Social",
];

const VERIFIED = "2026-10-16";

export const AGENCIES: Agency[] = [
  {
    slug: "mischief-no-fixed-address",
    name: "Mischief @ No Fixed Address",
    category: "Full-Service Creative",
    country: "United States",
    countryCode: "US",
    locations: ["New York"],
    founded: 2020,
    summary: "A US creative agency launched in 2020 as part of the No Fixed Address platform, known for entertainment, food and consumer brand campaigns.",
    facts: [
      {
        text: "Adweek named it U.S. Agency of the Year for 2025, the second time it has won.",
        source: { label: "Adweek, US Agency of the Year 2025", url: "https://www.adweek.com/agencies/mischief-no-fixed-address-adweek-2025-us-agency-of-the-year/" },
      },
      {
        text: "Founded in New York in 2020 by Greg Hahn, formerly chief creative officer at BBDO New York, in partnership with Toronto agency No Fixed Address.",
        source: { label: "The Stable on the launch", url: "https://www.thestable.com.au/greg-hahns-new-gig-co-founder-cco-of-mischief-no-fixed-address-ny/" },
      },
      {
        text: "Created the 'Coors Almighty Light' campaign around the film Studio 666 for Coors, entered at Cannes Lions 2022 under Mischief @ No Fixed Address, Brooklyn.",
        source: { label: "Cannes Lions entry", url: "https://lovethework.com/work-awards/campaigns/almighty-light-755410" },
      },
    ],
    clients: [
      {
        names: ["Hotels.com", "Verizon", "JCPenney", "Capri-Sun", "Lunchables", "e.l.f. Beauty", "NPR", "Tinder", "Coors Light", "Slate"],
        source: { label: "Adweek, US Agency of the Year 2025", url: "https://www.adweek.com/agencies/mischief-no-fixed-address-adweek-2025-us-agency-of-the-year/" },
      },
    ],
    notes: ["Trade sources differ on whether Hahn is sole founder or co-founder with No Fixed Address leaders; Adweek calls him co-founder."],
    lastVerified: VERIFIED,
  },
  {
    slug: "fp7-mccann",
    name: "FP7 McCann",
    website: "https://fp7mccann.com",
    category: "Full-Service Creative",
    country: "United Arab Emirates",
    countryCode: "AE",
    locations: ["Dubai"],
    founded: 1968,
    summary: "A Dubai-headquartered creative network operating across the Middle East, North Africa and Turkey.",
    facts: [
      {
        text: "Named the #1 agency in the UAE and the highest-ranked network agency in MENA in the Cannes Lions 2025 Global Creativity Report.",
        source: { label: "Communicate, Cannes Lions 2025 ranking", url: "https://communicateonline.me/news/fp7mccann-named-1-agency-in-uae-and-highest-ranked-network-agency-in-mena-in-cannes-lions-2025-global-report/" },
      },
      {
        text: "Won 15 awards at the 2025 MENA Effie Awards, including Most Effective Agency Network of the Year.",
        source: { label: "LBB, FP7 McCann at the 2025 MENA Effies", url: "https://lbbonline.com/news/FP7-McCann-2025-MENA-Effie-Awards" },
      },
      {
        text: "Campaign Middle East's agency profile lists Dubai as head office and 1968 as the founding year.",
        source: { label: "Campaign Middle East agency profile", url: "https://campaignme.com/agency/fp7/" },
      },
    ],
    clients: [
      {
        names: ["Mastercard", "McDonald's", "L'Oréal", "Arla", "Heinz", "General Motors", "Nestlé", "Unilever", "PepsiCo"],
        source: { label: "Campaign Middle East agency profile", url: "https://campaignme.com/agency/fp7/" },
      },
    ],
    notes: [
      "Ownership is described as 51% IPG and 49% MCN, and the same profile says it is part of Omnicom. Ownership has been changing with industry consolidation, so confirm with the agency.",
      "The profile mentions a possible leadership change linked to a merger, so check current leadership directly.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "dentsu-creative-india",
    name: "Dentsu Creative (Webchutney)",
    website: "https://www.dentsucreative.com",
    category: "Full-Service Creative",
    country: "India",
    countryCode: "IN",
    locations: ["Bengaluru", "New Delhi", "Mumbai"],
    founded: 1999,
    summary: "Dentsu's creative agency in India, built on Webchutney, a digital agency founded in New Delhi in 1999.",
    facts: [
      {
        text: "Named Agency of the Year at Cannes Lions 2022, reported as the first Indian agency to win the title, on the strength of Vice Media's 'The Unfiltered History Tour'.",
        source: { label: "Exchange4media, Cannes Lions 2022", url: "https://www.exchange4media.com/cannes-lions-news/cannes-lions-dentsu-creative-is-agency-of-the-year-first-indian-agency-to-win-the-title-121023.html" },
      },
      {
        text: "Webchutney was founded in 1999 by Sidharth Rao and Sudesh Samaria. Dentsu India acquired an 80% stake in May 2013.",
        source: { label: "afaqs, Dentsu acquires Webchutney", url: "https://www.afaqs.com/news/marketing/37580_Dentsu-India-acquires-majority-stake-in-Webchutney" },
      },
    ],
    clients: [
      {
        names: ["Vice Media (The Unfiltered History Tour)"],
        source: { label: "Exchange4media, Cannes Lions 2022", url: "https://www.exchange4media.com/cannes-lions-news/cannes-lions-dentsu-creative-is-agency-of-the-year-first-indian-agency-to-win-the-title-121023.html" },
      },
    ],
    notes: [
      "Some outlets credit 'Dentsu Creative Bengaluru' and others 'Dentsu Creative India' for the 2022 Cannes title.",
      "Webchutney co-founder Sidharth Rao died in April 2023.",
      "We could not load the agency's own website to confirm its current office list or client roster.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "schbang",
    name: "Schbang",
    website: "https://schbang.com",
    category: "Full-Service Creative",
    country: "India",
    countryCode: "IN",
    locations: ["Mumbai", "Bengaluru", "New Delhi", "Hong Kong", "London", "Amsterdam"],
    founded: 2015,
    summary: "An Indian creative, media and technology agency offering social, content, production and media services under one roof.",
    facts: [
      {
        text: "Says it has 1000+ specialists and works with 350+ brands worldwide.",
        source: { label: "Schbang website (self-reported)", url: "https://schbang.com" },
      },
      {
        text: "Lists 'Independent agency of the year, 2023' and Gold awards at the Sammies and Digies among its recent wins.",
        source: { label: "Schbang website (self-reported)", url: "https://schbang.com" },
      },
    ],
    clients: [
      {
        names: ["Domino's India", "Kotak 811", "Fevicol", "Mumbai Police", "Johnson & Johnson", "Britannia", "H&M", "Tata Communications", "Tata Capital", "Tata Neu", "Swiggy", "Jio", "Myntra", "Amazon Prime Video", "Sony Music"],
        source: { label: "Schbang website (self-reported)", url: "https://schbang.com" },
      },
    ],
    notes: [
      "Founding year (2015) comes from trade press; the website says '11 years and counting' without a date.",
      "Founder names vary between trade profiles, so we do not list them.",
      "Office list is from the agency's own site. London and Amsterdam appear in its contact section without addresses.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "socheers",
    name: "SoCheers",
    website: "https://socheers.com",
    category: "Social & Creator",
    country: "India",
    countryCode: "IN",
    locations: ["Mumbai", "Bengaluru", "New Delhi", "Ahmedabad"],
    founded: 2013,
    summary: "A digital-first Indian agency covering social media, content, influencer and performance marketing.",
    facts: [
      {
        text: "Founded in 2013 by Mehul Gupta (co-founder and CEO) and Siddharth Devnani (co-founder and director), with offices in Mumbai, Bengaluru, Delhi and Ahmedabad.",
        source: { label: "Agency Reporter profile", url: "https://www.agencyreporter.com/?p=74443" },
      },
      {
        text: "Reports a 225+ member team, with headcount growing 20% year over year.",
        source: { label: "Agency Reporter profile", url: "https://www.agencyreporter.com/?p=74443" },
      },
    ],
    clients: [
      {
        names: ["Amazon miniTV", "Croma", "boAt", "BGMI", "The Belgian Waffle Co", "Havmor Ice-creams", "Yes Bank", "Reliance General Insurance"],
        source: { label: "Agency Reporter profile", url: "https://www.agencyreporter.com/?p=74443" },
      },
    ],
    notes: [
      "The company's roots go back to a social network launched around 2011; the agency business is dated 2013 in the profile above.",
      "Client names are examples given in a single profile ('to name a few'), not a complete roster.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "youngun",
    name: "Youngun",
    category: "Meme & Culture",
    country: "India",
    countryCode: "IN",
    locations: [],
    founded: 2020,
    summary: "An Indian agency specialising in memes, content and internet culture for consumer brands.",
    facts: [
      {
        text: "Founded and led by Saksham Jadon. A March 2024 profile says the agency was founded nearly four years earlier and had close to 40 people.",
        source: { label: "Social Samosa agency feature, 18 Mar 2024", url: "https://www.socialsamosa.com/indian-agency-feature/agency-feature-youngun-4363277" },
      },
      {
        text: "Credited with CRED's newspaper-classifieds ad and Myntra's 'Vanshika' campaign.",
        source: { label: "afaqs on Youngun", url: "https://www.afaqs.com/news/mktg/memes-content-and-culture-younguns-ingredients-for-a-meme-orable-campaign" },
      },
    ],
    clients: [
      {
        names: ["Netflix", "MakeMyTrip", "AJIO", "Subway", "Swiggy", "Spotify", "Tinder"],
        source: { label: "Social Samosa agency feature, 18 Mar 2024", url: "https://www.socialsamosa.com/indian-agency-feature/agency-feature-youngun-4363277" },
      },
    ],
    notes: [
      "Founding year is given as 2019 in one trade article and about 2020 in others.",
      "We could not confirm the agency's office location or official website, so neither is shown.",
      "Headcount is from March 2024 and may be out of date.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "social-chain",
    name: "Social Chain",
    website: "https://socialchain.com",
    category: "Social & Creator",
    country: "United Kingdom",
    countryCode: "GB",
    locations: ["Manchester", "London", "New York", "Singapore", "Egypt", "Bulgaria", "Amsterdam", "Dubai"],
    founded: 2014,
    summary: "A social-first and creator marketing agency that started in Manchester and now operates from hubs on several continents.",
    facts: [
      {
        text: "Founded in November 2014 by Steven Bartlett and Dominic McGregor.",
        source: { label: "Startups.co.uk, Young Guns", url: "https://startups.co.uk/young-guns/steve-bartlett-and-dominic-mcgregor-social-chain/" },
      },
      {
        text: "Acquired by Brave Bison in February 2023 for an initial £7.7 million, with up to a further £9.5 million contingent over three years.",
        source: { label: "ITV News on the sale", url: "https://www.itv.com/news/granada/2023-02-03/firm-founded-by-dragons-den-star-agrees-77m-sale-to-rival" },
      },
      {
        text: "Its website lists eight hubs: Manchester, London, New York, Singapore, Egypt, Bulgaria, Amsterdam and Dubai.",
        source: { label: "Social Chain website (self-reported)", url: "https://socialchain.com" },
      },
    ],
    clients: [
      {
        names: ["SharkNinja", "Holland & Barrett", "KFC", "TikTok US"],
        source: { label: "Social Chain website, case studies", url: "https://socialchain.com" },
      },
    ],
    notes: [
      "The company changed ownership and strategy after the 2023 sale. Older articles about its clients and size describe a different business.",
      "Steven Bartlett stepped down from the company before the sale; sources differ on the exact year.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "uncommon-creative-studio",
    name: "Uncommon Creative Studio",
    website: "https://www.uncommon.studio/",
    category: "Full-Service Creative",
    country: "United Kingdom",
    countryCode: "GB",
    locations: ["London"],
    founded: 2017,
    summary: "A London creative studio launched in 2017 by three former Grey London leaders.",
    facts: [
      {
        text: "Launched in 2017 by Nils Leonard, Natalie Graeme and Lucy Jameson, all formerly senior leaders at Grey London.",
        source: { label: "LBB, launch coverage", url: "https://lbbonline.com/news/former-grey-london-trio-launches-uncommon-creative-studio/" },
      },
      {
        text: "At launch it described itself as a values-first agency built as a bespoke studio for each client.",
        source: { label: "The Drum, 2017", url: "https://www.thedrum.com/news/2017/09/11/grexit-trio-leonard-jameson-and-graeme-reveal-values-first-agency-vowing-build" },
      },
    ],
    clients: [
      {
        names: ["ITV", "WWF", "Ecover", "H&M", "Habito", "B&Q"],
        source: { label: "The Drum, 2017 (launch-era clients)", url: "https://www.thedrum.com/news/2017/09/11/grexit-trio-leonard-jameson-and-graeme-reveal-values-first-agency-vowing-build" },
      },
    ],
    notes: [
      "A trade database reports that Havas acquired a majority stake in January 2024, with the announcement date marked uncertain. We have not confirmed this with a primary source, so do not assume the agency is still independent.",
      "The client list is from launch-era coverage and is likely out of date. Check the agency's current work.",
      "The older domain uncommon.london now redirects to uncommon.studio.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "doing-things-media",
    name: "Doing Things Media",
    website: "https://www.doingthings.com/",
    category: "Meme & Culture",
    country: "United States",
    countryCode: "US",
    locations: [],
    founded: 2017,
    summary: "A US media company that owns and operates a portfolio of creator and meme-account brands and sells branded integrations across them.",
    facts: [
      {
        text: "Founded in 2017 in Atlanta by Reid Hailey and Derek Lucas, who had each built large Instagram meme followings. It later moved to permanent remote work.",
        source: { label: "Wikipedia, Doing Things Media", url: "https://en.wikipedia.org/wiki/Doing_Things_Media" },
      },
      {
        text: "Raised a $21.5 million Series A in February 2022 and acquired the Overheard brand in January 2023.",
        source: { label: "Wikipedia, Doing Things Media", url: "https://en.wikipedia.org/wiki/Doing_Things_Media" },
      },
      {
        text: "Says it runs 40+ multi-platform creator brands with 95M+ followers.",
        source: { label: "Doing Things website (self-reported)", url: "https://www.doingthings.com/" },
      },
    ],
    clients: [
      {
        names: ["Kérastase", "Cheez-It", "McDonald's"],
        source: { label: "Doing Things website, campaigns", url: "https://www.doingthings.com/" },
      },
    ],
    notes: [
      "Operates as a remote company, so no headquarters city is shown.",
      "As a media owner it sells integrations in its own brands rather than acting as a conventional agency.",
      "Follower and brand counts are self-reported and change often. A 2023 account put it at 35+ accounts and 75M+ followers.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "chamber-media",
    name: "Chamber Media",
    website: "https://chamber.media",
    category: "Performance & Paid Social",
    country: "United States",
    countryCode: "US",
    locations: ["American Fork, Utah"],
    founded: 2013,
    summary: "A Utah performance marketing agency focused on video and social ads for growth-stage brands.",
    facts: [
      {
        text: "Describes itself as a performance marketing agency for high-growth brands, offering performance creative, paid media, data and insights, and growth strategy.",
        source: { label: "Chamber Media website (self-reported)", url: "https://chamber.media" },
      },
      {
        text: "Claims more than $1B in tracked client revenue and 300,000+ ads produced. These are the company's own figures and are not independently verified.",
        source: { label: "Chamber Media website (self-reported)", url: "https://chamber.media" },
      },
    ],
    clients: [
      {
        names: ["Fabletics", "Tuft & Needle", "MRCOOL", "PuraGain Water"],
        source: { label: "Chamber Media website, case studies", url: "https://chamber.media" },
      },
    ],
    notes: [
      "Founding year is 2013 per CB Insights and 2014 per another business database. The agency's site gives no date.",
    ],
    lastVerified: VERIFIED,
  },
  {
    slug: "flight-story",
    name: "Flight Story",
    website: "https://flightstory.com",
    category: "Social & Creator",
    country: "United Kingdom",
    countryCode: "GB",
    locations: ["London", "Manchester", "New York", "Los Angeles"],
    founded: 2021,
    summary: "A company founded by Steven Bartlett that began as a marketing and communications firm and now describes itself as a creator media company.",
    facts: [
      {
        text: "Launched in 2021 by Steven Bartlett and Oliver Yonchev as a marketing and communication firm offering strategy, creative, communication and performance media services.",
        source: { label: "BusinessCloud, August 2024", url: "https://businesscloud.co.uk/news/yonchev-to-exit-steven-bartlett-startup-flight-story/" },
      },
      {
        text: "Its website now calls it 'a Creator Media Company' and lists shows (including The Diary of a CEO), books, speakers, products, investments and a studio.",
        source: { label: "Flight Story website (self-reported)", url: "https://flightstory.com" },
      },
    ],
    clients: [],
    notes: [
      "Oliver Yonchev left in August 2024.",
      "Companies shown on its site under Fund and Ventures (such as Huel and Whoop) are investments, not agency clients, so we do not list them as clients.",
      "It is no longer a conventional agency. It is included because it began as one and still offers a creative studio.",
    ],
    lastVerified: VERIFIED,
  },
];

export const COUNTRIES = Array.from(
  new Map(AGENCIES.map((a) => [a.countryCode, a.country])).entries(),
)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getAgency(slug: string): Agency | undefined {
  return AGENCIES.find((a) => a.slug === slug);
}

export function allSources(agency: Agency): Source[] {
  const map = new Map<string, Source>();
  for (const f of agency.facts) map.set(f.source.url, f.source);
  for (const c of agency.clients) map.set(c.source.url, c.source);
  return Array.from(map.values());
}
