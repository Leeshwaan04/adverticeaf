/**
 * Demo adapter for the Board. Everything runs in the browser against a localStorage-backed store.
 * ALL seeded data is SAMPLE data (reserved .example domains, "(sample)" names, sample:true).
 * Payment is SIMULATED: nothing is ever charged and no card details are ever requested.
 */
import { BOARD_CATEGORIES, type BoardCategory } from "./config";
import { delay, createStore, uid } from "./store";
import { validEmail } from "../validate";
import {
  DAY_MS, HOUR_MS, boardStats, costToLead, hallOfFame, listingDetail, quote, rankListings, recentActivity,
  seasonWindow, settlePurchase, type Ledger,
} from "./rules";
import type {
  BoardAdapter, Bid, ClickCounts, Listing, OkOrError, VerificationCheck, VerificationInfo,
} from "./types";

export interface DemoState extends Ledger {
  v: 1;
  /** When the sample data was last aligned to the clock. */
  anchor: number;
  clicks: ClickCounts;
  verification: Record<string, { token: string; verified: boolean }>;
  reports: { domain: string; reason: string; at: number }[];
  alerts: { domain: string; at: number }[];
}

/* ---------------------------------------------------------------- sample data */

interface SampleSpec {
  domain: string;
  name: string;
  tagline: string;
  category: BoardCategory;
  verified: boolean;
  bids: number;
  /** 1 (small spender) to 4 (big spender). */
  scale: 1 | 2 | 3 | 4;
  createdDaysAgo: number;
  /** Minutes ago for bids that must exist, so every season has recent activity. */
  recentMinutes?: number[];
}

const [MARKETING, SEO, PRODUCTIVITY, AGENTS, DEVELOPER, CRYPTO, GAMES, OTHER] = BOARD_CATEGORIES;

const SAMPLES: SampleSpec[] = [
  { domain: "cursor.com", name: "Cursor", tagline: "The AI code editor built to make engineers 10x faster", category: DEVELOPER, verified: true, bids: 12, scale: 4, createdDaysAgo: 35, recentMinutes: [8, 120] },
  { domain: "linear.app", name: "Linear", tagline: "The issue tracking tool built for high-performance software teams", category: PRODUCTIVITY, verified: true, bids: 10, scale: 4, createdDaysAgo: 34, recentMinutes: [22, 280] },
  { domain: "polymarket.com", name: "Polymarket", tagline: "The world's largest real-time prediction market", category: CRYPTO, verified: true, bids: 9, scale: 4, createdDaysAgo: 32, recentMinutes: [45, 500] },
  { domain: "adverticeaf.com", name: "AdverticeAF", tagline: "The live pay-to-rank advertising board & viral attention market", category: MARKETING, verified: true, bids: 8, scale: 3, createdDaysAgo: 30, recentMinutes: [65, 340] },
  { domain: "beehiiv.com", name: "beehiiv", tagline: "The newsletter platform built for hyper-growth & monetization", category: MARKETING, verified: true, bids: 8, scale: 3, createdDaysAgo: 31, recentMinutes: [90, 600] },
  { domain: "supabase.com", name: "Supabase", tagline: "The open source Firebase alternative with Postgres and Realtime", category: DEVELOPER, verified: true, bids: 8, scale: 3, createdDaysAgo: 29, recentMinutes: [110, 750] },
  { domain: "ahrefs.com", name: "Ahrefs", tagline: "SEO tools & backlink intelligence to scale organic traffic", category: SEO, verified: true, bids: 7, scale: 3, createdDaysAgo: 28, recentMinutes: [140] },
  { domain: "perplexity.ai", name: "Perplexity", tagline: "Where knowledge begins: Conversational AI search engine", category: SEO, verified: true, bids: 7, scale: 3, createdDaysAgo: 27, recentMinutes: [180] },
  { domain: "raycast.com", name: "Raycast", tagline: "Supercharged desktop productivity launcher and AI companion", category: PRODUCTIVITY, verified: true, bids: 6, scale: 2, createdDaysAgo: 26, recentMinutes: [240] },
  { domain: "anthropic.com", name: "Claude", tagline: "Next-generation frontier AI assistant and autonomous coding agent", category: AGENTS, verified: true, bids: 7, scale: 3, createdDaysAgo: 25, recentMinutes: [310] },
  { domain: "cognition.ai", name: "Devin", tagline: "The world's first autonomous AI software engineer", category: AGENTS, verified: true, bids: 6, scale: 2, createdDaysAgo: 24, recentMinutes: [420] },
  { domain: "resend.com", name: "Resend", tagline: "Modern email API and transactional platform designed for developers", category: DEVELOPER, verified: true, bids: 6, scale: 2, createdDaysAgo: 23, recentMinutes: [520] },
  { domain: "typefully.com", name: "Typefully", tagline: "AI-powered writing and scheduling for high-growth X and LinkedIn", category: MARKETING, verified: true, bids: 5, scale: 2, createdDaysAgo: 22, recentMinutes: [610] },
  { domain: "cal.com", name: "Cal.com", tagline: "The open source scheduling infrastructure for everyone", category: PRODUCTIVITY, verified: true, bids: 5, scale: 1, createdDaysAgo: 21 },
  { domain: "phantom.app", name: "Phantom", tagline: "The friendly crypto and multichain wallet built for Web3", category: CRYPTO, verified: true, bids: 6, scale: 2, createdDaysAgo: 20, recentMinutes: [720] },
  { domain: "chess.com", name: "Chess.com", tagline: "Play chess online with over 150 million grandmasters & enthusiasts", category: GAMES, verified: true, bids: 5, scale: 1, createdDaysAgo: 19 },
  { domain: "poki.com", name: "Poki", tagline: "Free instant web games playable on desktop and mobile browsers", category: GAMES, verified: true, bids: 4, scale: 1, createdDaysAgo: 18 },
  { domain: "producthunt.com", name: "Product Hunt", tagline: "The best new tech products and startup launches, curated daily", category: OTHER, verified: true, bids: 5, scale: 2, createdDaysAgo: 17 },
  { domain: "base.org", name: "Base", tagline: "Low-cost, builder-friendly Ethereum L2 network by Coinbase", category: CRYPTO, verified: true, bids: 4, scale: 1, createdDaysAgo: 16 },
  { domain: "posthog.com", name: "PostHog", tagline: "The single platform for product analytics, heatmaps & feature flags", category: DEVELOPER, verified: true, bids: 5, scale: 2, createdDaysAgo: 15 },
];

const AMOUNTS_DOLLARS = [1, 2, 3, 5, 5, 8, 10, 10, 15, 20, 25, 30, 50, 75, 100];
const SCALE_RANGE: Record<1 | 2 | 3 | 4, [number, number]> = { 1: [0, 6], 2: [2, 9], 3: [5, 12], 4: [7, 14] };

/** Small deterministic PRNG so the sample board is the same every time it is built. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build the SAMPLE ledger relative to `now`. Pure and deterministic. */
export function buildSeed(now: number): DemoState {
  const rng = mulberry32(0xb0a8d);
  const listings: Listing[] = [];
  const bids: Bid[] = [];
  const clicks: ClickCounts = {};

  SAMPLES.forEach((spec, i) => {
    const maxAge = spec.createdDaysAgo * DAY_MS;
    const [lo, hi] = SCALE_RANGE[spec.scale];
    const times: number[] = [now - maxAge];
    for (const m of spec.recentMinutes ?? []) times.push(now - m * 60_000);
    while (times.length < spec.bids) {
      const r = rng();
      times.push(now - Math.max(20 * 60_000, Math.round(maxAge * r * r * 0.98)));
    }
    times.sort((a, b) => a - b);
    let cents = 0;
    times.forEach((at, k) => {
      const dollars = AMOUNTS_DOLLARS[lo + Math.floor(rng() * (hi - lo + 1))];
      cents += dollars * 100;
      bids.push({ id: `bid_${i}_${k}`, domain: spec.domain, amountCents: dollars * 100, at, sample: true });
    });
    listings.push({
      domain: spec.domain,
      name: spec.name,
      url: `https://${spec.domain}`,
      category: spec.category,
      tagline: spec.tagline,
      createdAt: times[0],
      verified: spec.verified,
      sample: true,
    });
    clicks[spec.domain] = Math.floor((cents / 100) * 2 + rng() * 40);
  });

  return { v: 1, anchor: now, listings, bids, receipts: {}, clicks, verification: {}, reports: [], alerts: [] };
}

/** Slide sample listings and bids forward so the sample board always has recent activity. User data is untouched. */
export function rebaseSamples(s: DemoState, now: number): DemoState {
  const delta = now - s.anchor;
  if (delta <= 0) return s;
  return {
    ...s,
    anchor: now,
    listings: s.listings.map((l) => (l.sample ? { ...l, createdAt: l.createdAt + delta } : l)),
    bids: s.bids.map((b) => (b.sample ? { ...b, at: b.at + delta } : b)),
  };
}

/** Stored data came from localStorage, so check its shape before trusting it. */
function isDemoState(x: unknown): x is DemoState {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Partial<DemoState>;
  return (
    s.v === 1 && typeof s.anchor === "number" && Array.isArray(s.listings) && Array.isArray(s.bids) &&
    Array.isArray(s.reports) && Array.isArray(s.alerts) && typeof s.receipts === "object" && s.receipts !== null &&
    typeof s.clicks === "object" && s.clicks !== null && typeof s.verification === "object" && s.verification !== null
  );
}

/* ---------------------------------------------------------------- store access */

const store = createStore<DemoState>("adv-board-demo-v1", () => buildSeed(Date.now()));
const REBASE_AFTER_MS = HOUR_MS;

function current(): DemoState {
  let s = store.get();
  if (!isDemoState(s)) {
    store.reset();
    s = store.get();
  }
  const now = Date.now();
  if (now - s.anchor > REBASE_AFTER_MS) {
    store.set(rebaseSamples(s, now));
    s = store.get();
  }
  return s;
}

function randomToken(): string {
  try {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    return `adv-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return `adv-${uid("t").slice(2)}`;
  }
}

const hostOf = (domain: string) => domain.split("/")[0];

/* ---------------------------------------------------------------- adapter */

export const demoAdapter: BoardAdapter = {
  async getBoard(season, category) {
    await delay(120);
    const s = current();
    const now = Date.now();
    const window = seasonWindow(season, now);
    const rows = rankListings(s.listings, s.bids, s.clicks, window, category, now - HOUR_MS);
    const everyone = category ? rankListings(s.listings, s.bids, s.clicks, window, null, now - HOUR_MS) : rows;
    return { season, window, category, rows, stats: boardStats(rows), leadCostCents: costToLead(everyone), generatedAt: now, mode: "demo" };
  },

  async getListing(domain) {
    await delay(120);
    const s = current();
    return listingDetail(domain, s.listings, s.bids, s.clicks, Date.now());
  },

  async quote(input) {
    await delay(60);
    return quote(input, current(), Date.now());
  },

  async purchaseBid(req, idempotencyKey) {
    // Simulated payment step. Nothing is charged.
    await delay(900);
    const key = idempotencyKey || uid("idem");
    // The check and the write below run in one synchronous block, so two concurrent calls with the same key
    // can only ever record one bid: the second sees the receipt of the first.
    const s = current();
    const { ledger, result, replayed } = settlePurchase(s, req, key, Date.now(), uid("bid"));
    if (result.ok && !replayed) store.set({ ...s, ...ledger });
    return result;
  },

  async recordClick(domain) {
    const s = current();
    if (!s.listings.some((l) => l.domain === domain)) return;
    store.set({ ...s, clicks: { ...s.clicks, [domain]: (s.clicks[domain] ?? 0) + 1 } });
  },

  async getHallOfFame() {
    await delay(120);
    const s = current();
    return hallOfFame(s.listings, s.bids, Date.now());
  },

  async getActivity(limit) {
    await delay(100);
    const s = current();
    return recentActivity(s.listings, s.bids, limit);
  },

  async getVerification(domain): Promise<VerificationInfo> {
    await delay(100);
    const s = current();
    const listing = s.listings.find((l) => l.domain === domain);
    if (!listing) throw new Error("That listing is not on the Board.");
    let entry = s.verification[domain];
    if (!entry) {
      entry = { token: randomToken(), verified: listing.verified };
      store.set({ ...s, verification: { ...s.verification, [domain]: entry } });
    }
    const host = hostOf(domain);
    const value = `adverticeaf-verify=${entry.token}`;
    const methods: VerificationInfo["methods"] = domain.includes("/")
      ? [{ type: "meta", instruction: "Put this text anywhere on the public page you listed, for example in your bio. Then run the check.", value }]
      : [
          { type: "dns", instruction: `Add a DNS TXT record named _adverticeaf-verify.${host} with this value.`, value },
          { type: "meta", instruction: `Add this tag inside the <head> of https://${host}/ and publish it.`, value: `<meta name="adverticeaf-verify" content="${entry.token}">` },
        ];
    return { verified: listing.verified, token: entry.token, methods };
  },

  async checkVerification(domain): Promise<VerificationCheck> {
    await delay(700);
    const s = current();
    if (!s.listings.some((l) => l.domain === domain)) throw new Error("That listing is not on the Board.");
    const entry = s.verification[domain] ?? { token: randomToken(), verified: false };
    store.set({
      ...s,
      listings: s.listings.map((l) => (l.domain === domain ? { ...l, verified: true } : l)),
      verification: { ...s.verification, [domain]: { ...entry, verified: true } },
    });
    return {
      verified: true,
      simulated: true,
      message: "Demo only: this marked the listing as verified without checking anything. The live Board checks your DNS record or page for the token.",
    };
  },

  async reportListing(domain, reason): Promise<OkOrError> {
    await delay(300);
    const r = reason.trim();
    if (r.length < 10) return { ok: false, error: "Please tell us a little more (at least 10 characters)." };
    if (r.length > 500) return { ok: false, error: "Please keep the reason under 500 characters." };
    const s = current();
    if (!s.listings.some((l) => l.domain === domain)) return { ok: false, error: "That listing is not on the Board." };
    store.set({ ...s, reports: [...s.reports, { domain, reason: r, at: Date.now() }] });
    return { ok: true };
  },

  async subscribeAlerts(domain, email): Promise<OkOrError> {
    await delay(300);
    const problem = validEmail(email);
    if (problem) return { ok: false, error: problem };
    const s = current();
    if (!s.listings.some((l) => l.domain === domain)) return { ok: false, error: "That listing is not on the Board." };
    // The address itself is not stored: the demo never sends email.
    store.set({ ...s, alerts: [...s.alerts, { domain, at: Date.now() }] });
    return { ok: true };
  },

  subscribe: (cb) => store.subscribe(cb),
};
