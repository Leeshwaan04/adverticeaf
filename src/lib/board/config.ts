/**
 * Board configuration.
 *
 * NEXT_PUBLIC_BOARD_MODE controls everything:
 *  - "off"  (default): the Board is hidden and its routes show a "not open" page.
 *  - "demo": runs entirely in the browser with clearly-labelled SAMPLE data and a
 *            simulated payment step. No money moves. For design review and previews.
 *  - "live": talks to a real backend at NEXT_PUBLIC_BOARD_API (see docs/board-api.md).
 */
export type BoardMode = "off" | "demo" | "live";

const raw = process.env.NEXT_PUBLIC_BOARD_MODE;
export const BOARD_MODE: BoardMode = raw === "off" || raw === "demo" ? raw : "live";
export const BOARD_API_BASE = (process.env.NEXT_PUBLIC_BOARD_API ?? "").replace(/\/$/, "");

/** Product rules. Change here, not in components. All money is integer US cents. */
export const RULES = {
  currency: "USD",
  /** Smallest amount a bid can be. */
  minBidCents: 100,
  /** Bids move in whole-dollar steps. */
  stepCents: 100,
  /** To take #1 a listing's new total must beat the leader by at least this much. */
  leadMarginCents: 100,
  maxBidCents: 99_999_900,
  nameMax: 40,
  taglineMax: 80,
} as const;

export const BOARD_CATEGORIES = [
  "Marketing",
  "SEO",
  "Productivity",
  "Agents",
  "Developer",
  "Crypto",
  "Games",
  "Other",
] as const;
export type BoardCategory = (typeof BOARD_CATEGORIES)[number];

export const SEASONS = [
  { id: "daily", label: "Today", blurb: "Resets every day at 00:00 UTC" },
  { id: "weekly", label: "This week", blurb: "Resets every Monday at 00:00 UTC" },
  { id: "monthly", label: "This month", blurb: "Resets on the 1st at 00:00 UTC" },
  { id: "all", label: "All time", blurb: "Everything ever paid, never resets" },
] as const;
export type SeasonId = (typeof SEASONS)[number]["id"];

/** Hosts where many different products share one domain, so the first path segment identifies the listing. */
export const PATH_KEYED_HOSTS = [
  "github.com", "gitlab.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "instagram.com",
  "tiktok.com", "producthunt.com", "medium.com", "substack.com", "facebook.com", "threads.net",
] as const;
/** App-store hosts where the full path (app id) identifies the listing. */
export const FULL_PATH_HOSTS = ["apps.apple.com", "play.google.com", "chromewebstore.google.com"] as const;

export const SHORTENER_HOSTS = [
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly",
  "shorturl.at", "tiny.cc", "lnkd.in", "s.id", "rb.gy", "t.ly",
] as const;

export const TRACKING_PARAMS = [
  "fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "igshid", "ref", "ref_src", "ref_url",
  "source", "src", "si", "yclid", "twclid", "ttclid", "_hsenc", "_hsmi", "mkt_tok",
] as const;

/** Throne: one seat. Taking it costs the current price. The price jumps after each take, then decays. */
export const THRONE = {
  floorCents: 100,
  /** First ever price when nobody has taken it. */
  openingCents: 500,
  /** After a take at price P, the next starting price is P raised by this percent (rounded up to whole dollars). */
  raisePercent: 25,
  /** Hours for the price to decay linearly from its starting price to the floor. */
  decayHours: 24,
} as const;

/** Spotlight: hourly homepage slots, booked ahead. */
export const SPOTLIGHT = {
  horizonDays: 7,
  baseCents: 1000,
  primeCents: 2000,
  /** UTC hours (inclusive start, exclusive end) priced at the prime rate. */
  primeStartHourUtc: 12,
  primeEndHourUtc: 20,
} as const;

/** Pixel Wall: fixed grid of tiles. Each sale makes the next tile more expensive. */
export const WALL = {
  cols: 25,
  rows: 16,
  basePriceCents: 500,
  /** Price increase per tile already sold. */
  stepCents: 25,
  labelMax: 12,
} as const;

/** Sponsor: one "Presented by" slot per day on the free tools. */
export const SPONSOR = {
  horizonDays: 14,
  dayCents: 2500,
  nameMax: 30,
  taglineMax: 60,
} as const;

/** Shown at checkout. A policy decision for the business: edit before going live. */
export const POLICY = {
  refund:
    "All sales are final once a placement is live, unless we fail to deliver it. If we cannot deliver what you paid for, we refund it in full.",
  paidPlacementNote: "Paid placement. Ranking and visibility are bought, not earned, and are not an endorsement.",
} as const;
