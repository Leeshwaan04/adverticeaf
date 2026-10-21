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
  { domain: "northwind-ads.example", name: "Northwind Creative (sample)", tagline: "Viral performance marketing & creative lab", category: MARKETING, verified: true, bids: 9, scale: 4, createdDaysAgo: 33, recentMinutes: [12, 400] },
  { domain: "rankpulse-seo.example", name: "RankPulse SEO (sample)", tagline: "Real-time SERP tracking & backlink intelligence", category: SEO, verified: true, bids: 8, scale: 3, createdDaysAgo: 30, recentMinutes: [38, 900] },
  { domain: "flowcraft-app.example", name: "FlowCraft (sample)", tagline: "The all-in-one productivity suite for fast founders", category: PRODUCTIVITY, verified: false, bids: 6, scale: 2, createdDaysAgo: 27, recentMinutes: [1100] },
  { domain: "agentforce-ai.example", name: "AgentForce AI (sample)", tagline: "Autonomous AI agents that execute growth tasks", category: AGENTS, verified: true, bids: 8, scale: 4, createdDaysAgo: 34, recentMinutes: [55, 700] },
  { domain: "devlane-infra.example", name: "DevLane Tools (sample)", tagline: "Instant developer toolkits & edge microservices", category: DEVELOPER, verified: false, bids: 6, scale: 3, createdDaysAgo: 26, recentMinutes: [200] },
  { domain: "satoshivault.example", name: "SatoshiVault (sample)", tagline: "Next-gen crypto analytics & non-custodial treasury", category: CRYPTO, verified: true, bids: 7, scale: 2, createdDaysAgo: 29, recentMinutes: [1300] },
  { domain: "pixeldrop-game.example", name: "PixelDrop Interactive (sample)", tagline: "Multiplayer arcade games built directly on web", category: GAMES, verified: false, bids: 5, scale: 1, createdDaysAgo: 20 },
  { domain: "dailypitch.example", name: "The Daily Pitch (sample)", tagline: "The #1 newsletter for growth engineers & founders", category: MARKETING, verified: true, bids: 8, scale: 3, createdDaysAgo: 32, recentMinutes: [26, 500] },
  { domain: "serphive.example", name: "SERPHive (sample)", tagline: "Programmatic SEO workflows that scale to millions", category: SEO, verified: false, bids: 5, scale: 2, createdDaysAgo: 24, recentMinutes: [800] },
  { domain: "hyperfocus.example", name: "HyperFocus (sample)", tagline: "Deep work timers with automated calendar defense", category: PRODUCTIVITY, verified: false, bids: 6, scale: 1, createdDaysAgo: 31 },
  { domain: "cortexbot.example", name: "Cortex AI (sample)", tagline: "Self-improving AI agents for customer support", category: AGENTS, verified: true, bids: 7, scale: 3, createdDaysAgo: 28, recentMinutes: [70, 1000] },
  { domain: "terminalx.example", name: "TerminalX (sample)", tagline: "Blazing fast web terminal with zero setup", category: DEVELOPER, verified: false, bids: 6, scale: 2, createdDaysAgo: 25, recentMinutes: [350] },
  { domain: "tokenradar.example", name: "TokenRadar (sample)", tagline: "Real-time on-chain token scanner & risk alerts", category: CRYPTO, verified: false, bids: 5, scale: 1, createdDaysAgo: 22 },
  { domain: "openmic.example", name: "Open Mic Nights (sample)", tagline: "Global directory for indie comedy & tech stages", category: OTHER, verified: false, bids: 5, scale: 1, createdDaysAgo: 18, recentMinutes: [45] },
  { domain: "paperplane.example", name: "Paper Plane Co-op (sample)", tagline: "Curated community for remote creators", category: OTHER, verified: true, bids: 6, scale: 2, createdDaysAgo: 21, recentMinutes: [150] },
  { domain: "lanternlabs.example", name: "Lantern Labs (sample)", tagline: "Experimental sandbox for unconventional software", category: OTHER, verified: false, bids: 4, scale: 1, createdDaysAgo: 16 },
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
      bids.push({ id: `sample_bid_${i}_${k}`, domain: spec.domain, amountCents: dollars * 100, at, sample: true });
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
