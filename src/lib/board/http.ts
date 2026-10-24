/**
 * Live adapter: an HTTP client for the Board API at BOARD_API_BASE (see docs/board-api-board.md).
 *
 * Everything that comes back from the server is untrusted. Each response goes through a parser that checks
 * shapes and ranges and drops anything malformed. Listing links are re-checked with checkListingUrl and a hosted
 * checkout URL must be https before it is ever returned to the UI.
 */
import { BOARD_API_BASE, BOARD_CATEGORIES, SEASONS, type BoardCategory, type SeasonId } from "./config";
import { boardStats } from "./rules";
import { checkListingUrl } from "./listing";
import type {
  ActivityItem, Bid, BidResult, BoardAdapter, BoardDigest, BoardRow, BoardSnapshot, HallOfFame, HallOfFameEntry, Listing,
  ListingDetail, OkOrError, Quote, RankPoint, VerificationCheck, VerificationInfo,
} from "./types";

/* ---------------------------------------------------------------- defensive parsing */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length > 0 ? v.slice(0, max) : null);
/** Non-negative safe integer (cents, counts, ranks, timestamps). */
const nat = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);
const SEASON_IDS = SEASONS.map((s) => s.id) as readonly string[];
export const isSeason = (v: unknown): v is SeasonId => typeof v === "string" && SEASON_IDS.includes(v);

export function parseListing(v: unknown): Listing | null {
  if (!isRec(v)) return null;
  const domain = text(v.domain, 200);
  const name = text(v.name, 80);
  const createdAt = nat(v.createdAt);
  const link = typeof v.url === "string" ? checkListingUrl(v.url) : null;
  if (!domain || !name || createdAt === null || !link || !link.ok) return null;
  const category = (BOARD_CATEGORIES as readonly string[]).includes(v.category as string) ? (v.category as BoardCategory) : "Other";
  return {
    domain,
    name,
    url: link.url,
    category,
    tagline: typeof v.tagline === "string" ? v.tagline.slice(0, 160) : "",
    createdAt,
    verified: v.verified === true,
    ...(v.sample === true ? { sample: true } : {}),
  };
}

export function parseBid(v: unknown): Bid | null {
  if (!isRec(v)) return null;
  const id = text(v.id, 100);
  const domain = text(v.domain, 200);
  const amountCents = nat(v.amountCents);
  const at = nat(v.at);
  if (!id || !domain || !amountCents || at === null) return null;
  return { id, domain, amountCents, at, ...(v.sample === true ? { sample: true } : {}) };
}

const list = <T>(v: unknown, parse: (x: unknown) => T | null, cap = 500): T[] =>
  Array.isArray(v) ? v.slice(0, cap).map(parse).filter((x): x is T => x !== null) : [];

function parseRow(v: unknown): BoardRow | null {
  if (!isRec(v)) return null;
  const listing = parseListing(v.listing);
  const rank = nat(v.rank);
  const totalCents = nat(v.totalCents);
  if (!listing || !rank || totalCents === null) return null;
  return {
    rank,
    prevRank: nat(v.prevRank) || null,
    listing,
    totalCents,
    clicks: nat(v.clicks) ?? 0,
    climbCostCents: nat(v.climbCostCents),
  };
}

export function parseSnapshot(v: unknown, season: SeasonId, category: BoardCategory | null): BoardSnapshot | null {
  if (!isRec(v) || !isRec(v.window)) return null;
  const start = nat(v.window.start);
  const rawEnd = v.window.end;
  const end = rawEnd === null ? null : nat(rawEnd);
  const leadCostCents = nat(v.leadCostCents);
  if (start === null || (rawEnd !== null && end === null) || leadCostCents === null) return null;
  const rows = list(v.rows, parseRow).sort((a, b) => a.rank - b.rank);
  return {
    season,
    window: { start, end },
    category,
    rows,
    // Stats are always recomputed from the rows we actually received.
    stats: boardStats(rows),
    leadCostCents,
    generatedAt: nat(v.generatedAt) ?? 0,
    mode: "live",
  };
}

export function parseDetail(v: unknown): ListingDetail | null {
  if (!isRec(v) || !isRec(v.ranks) || !isRec(v.leadCostCents)) return null;
  const listing = parseListing(v.listing);
  if (!listing) return null;
  const ranks = {} as ListingDetail["ranks"];
  const leadCostCents = {} as ListingDetail["leadCostCents"];
  for (const s of SEASONS) {
    const r = v.ranks[s.id];
    if (!isRec(r)) return null;
    const total = nat(r.totalCents);
    const of = nat(r.of);
    const lead = nat(v.leadCostCents[s.id]);
    if (total === null || of === null || lead === null) return null;
    ranks[s.id] = { rank: nat(r.rank) || null, totalCents: total, of };
    leadCostCents[s.id] = lead;
  }
  const history = list<RankPoint>(
    v.history,
    (p) => (isRec(p) && nat(p.at) !== null ? { at: p.at as number, rank: nat(p.rank) || null } : null),
    1000,
  );
  return { listing, ranks, ledger: list(v.ledger, parseBid, 1000), history, clicks: nat(v.clicks) ?? 0, leadCostCents };
}

export function parseQuote(v: unknown): Quote | null {
  if (!isRec(v)) return null;
  if (v.ok === false) return { ok: false, error: text(v.error, 200) ?? "That bid cannot be placed." };
  if (v.ok !== true) return null;
  const domain = text(v.domain, 200);
  const n = {
    amountCents: nat(v.amountCents), currentTotalCents: nat(v.currentTotalCents), newTotalCents: nat(v.newTotalCents),
    newRank: nat(v.newRank), of: nat(v.of), costToLeadCents: nat(v.costToLeadCents),
  };
  if (!domain || Object.values(n).some((x) => x === null) || !n.newRank || !n.of) return null;
  return {
    ok: true,
    domain,
    isNewListing: v.isNewListing === true,
    amountCents: n.amountCents as number,
    currentTotalCents: n.currentTotalCents as number,
    newTotalCents: n.newTotalCents as number,
    currentRank: nat(v.currentRank) || null,
    newRank: n.newRank,
    of: n.of,
    costToLeadCents: n.costToLeadCents as number,
    costToClimbCents: nat(v.costToClimbCents),
  };
}

/** A checkout URL is only returned to the UI if it is a well-formed https URL. */
export function safeCheckoutUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 2048) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseBidResult(v: unknown): BidResult | null {
  if (!isRec(v)) return null;
  if (v.ok === false) return { ok: false, error: text(v.error, 200) ?? "The payment could not be completed." };
  if (v.checkoutUrl !== undefined) {
    const url = safeCheckoutUrl(v.checkoutUrl);
    return url ? { ok: true, checkoutUrl: url } : { ok: false, error: "The payment page link was not secure, so we did not open it. Nothing was charged." };
  }
  if (v.ok !== true) return null;
  const bid = parseBid(v.bid);
  const listing = parseListing(v.listing);
  return bid && listing ? { ok: true, bid, listing } : null;
}

export function parseHallOfFame(v: unknown): HallOfFame | null {
  if (!Array.isArray(v)) return null;
  const labels: Record<string, string> = { daily: "Yesterday", weekly: "Last week", monthly: "Last month" };
  const out: HallOfFameEntry[] = [];
  for (const e of v.slice(0, 3)) {
    if (!isRec(e) || !isRec(e.window) || (e.season !== "daily" && e.season !== "weekly" && e.season !== "monthly")) continue;
    const start = nat(e.window.start);
    const end = nat(e.window.end);
    if (start === null || end === null) continue;
    let winner: HallOfFameEntry["winner"] = null;
    if (isRec(e.winner)) {
      const listing = parseListing(e.winner.listing);
      const total = nat(e.winner.totalCents);
      if (listing && total) winner = { listing, totalCents: total };
    }
    out.push({ season: e.season, label: labels[e.season], window: { start, end }, winner, entrants: nat(e.entrants) ?? 0 });
  }
  return out;
}

export function parseActivity(v: unknown): ActivityItem[] {
  return list<ActivityItem>(
    v,
    (x) => {
      if (!isRec(x)) return null;
      const id = text(x.id, 100);
      const domain = text(x.domain, 200);
      const name = text(x.name, 80);
      const amountCents = nat(x.amountCents);
      const at = nat(x.at);
      if (!id || !domain || !name || !amountCents || at === null) return null;
      return { id, domain, name, amountCents, at, tookLead: x.tookLead === true, ...(x.sample === true ? { sample: true } : {}) };
    },
    100,
  );
}

export function parseVerification(v: unknown): VerificationInfo | null {
  if (!isRec(v)) return null;
  const token = text(v.token, 200);
  if (!token) return null;
  const methods = list<VerificationInfo["methods"][number]>(
    v.methods,
    (m) => {
      if (!isRec(m)) return null;
      const instruction = text(m.instruction, 400);
      const value = text(m.value, 400);
      const type = m.type === "dns" || m.type === "meta" || m.type === "file" ? m.type : null;
      return type && instruction && value ? { type, instruction, value } : null;
    },
    5,
  );
  return { verified: v.verified === true, token, methods };
}

/* ---------------------------------------------------------------- transport */

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const NETWORK_MESSAGE = "We could not reach the Board. Check your connection and try again.";

/** Pull a human message out of an error body. The server text is untrusted: it is clipped and only ever rendered as text. */
function errorMessage(body: unknown, fallback: string): string {
  if (isRec(body)) {
    if (typeof body.error === "string" && body.error) return body.error.slice(0, 200);
    if (isRec(body.error) && typeof body.error.message === "string" && body.error.message) return body.error.message.slice(0, 200);
    if (typeof body.message === "string" && body.message) return body.message.slice(0, 200);
  }
  return fallback;
}

async function call(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<unknown> {
  const base = BOARD_API_BASE || (typeof window !== "undefined" ? "" : "https://adverticeaf.com");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15_000);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method ?? "GET",
      credentials: "omit",
      headers: { Accept: "application/json", ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...opts.headers },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(NETWORK_MESSAGE, 0);
  } finally {
    clearTimeout(timer);
  }
  let json: unknown = null;
  if (res.status !== 204) {
    try {
      json = await res.json();
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const fallback = res.status === 429 ? "Too many requests. Please wait a moment and try again." : res.status >= 500 ? "The Board had a problem. Please try again." : "That request could not be completed.";
    throw new ApiError(errorMessage(json, fallback), res.status);
  }
  return json;
}

const q = (params: Record<string, string>) => `?${new URLSearchParams(params).toString()}`;
const BAD_RESPONSE = "The Board sent a response we could not read. Please try again.";

/** For POSTs where the UI wants a message, not an exception. */
async function asResult<T extends { ok: boolean }>(run: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  try {
    return await run();
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : NETWORK_MESSAGE };
  }
}

/* ---------------------------------------------------------------- adapter */

const POLL_MS = 20_000;

export const httpAdapter: BoardAdapter = {
  async getBoard(season, category) {
    const json = await call(`/v1/board${q({ season, ...(category ? { category } : {}) })}`);
    const snap = parseSnapshot(json, season, category);
    if (!snap) throw new Error(BAD_RESPONSE);
    return snap;
  },

  async getListing(domain) {
    try {
      const json = await call(`/v1/listing${q({ domain })}`);
      const detail = parseDetail(json);
      if (!detail) throw new Error(BAD_RESPONSE);
      return detail;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  async quote(input) {
    return asResult(async () => {
      const parsed = parseQuote(await call("/v1/quote", { method: "POST", body: input }));
      return parsed ?? { ok: false as const, error: BAD_RESPONSE };
    }) as Promise<Quote>;
  },

  async purchaseBid(req, idempotencyKey) {
    // One key per purchase attempt. The UI passes the same key when the buyer retries, so a retry can never double charge.
    const key = idempotencyKey || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const json = await call("/v1/bids", { method: "POST", body: req, headers: { "Idempotency-Key": key }, timeoutMs: 30_000 });
      return parseBidResult(json) ?? { ok: false, error: "We could not confirm your payment. Check the listing page before trying again. Retrying is safe: it will not charge you twice." };
    } catch (e) {
      if (e instanceof ApiError && e.status > 0 && e.status < 500) return { ok: false, error: e.message };
      return { ok: false, error: "We could not confirm your payment. Check the listing page before trying again. Retrying is safe: it will not charge you twice." };
    }
  },

  async recordClick(domain) {
    try {
      await call("/v1/clicks", { method: "POST", body: { domain }, timeoutMs: 5_000 });
    } catch {
      /* A lost click count must never get in the way of visiting the link. */
    }
  },

  async getHallOfFame() {
    const parsed = parseHallOfFame(await call("/v1/hall-of-fame"));
    if (!parsed) throw new Error(BAD_RESPONSE);
    return parsed;
  },

  async getActivity(limit) {
    return parseActivity(await call(`/v1/activity${q({ limit: String(Math.max(1, Math.min(50, Math.floor(limit)))) })}`));
  },

  async getDigest(season = "all"): Promise<BoardDigest> {
    const raw = await call(`/v1/digest${q({ season })}`);
    return raw as BoardDigest;
  },

  async generateAiTagline(urlOrDomain: string) {
    const raw = await call("/v1/ai/tagline", { method: "POST", body: { url: urlOrDomain } });
    return raw as { ok: boolean; name: string; tagline: string; category: BoardCategory; modelUsed: string };
  },

  async getAiMarketDigest(season = "all") {
    const raw = await call(`/v1/ai/digest${q({ season })}`);
    return raw as { ok: boolean; narrative: string; modelUsed: string; generatedAt: number };
  },

  async getVerification(domain) {
    const parsed = parseVerification(await call(`/v1/verification${q({ domain })}`));
    if (!parsed) throw new Error(BAD_RESPONSE);
    return parsed;
  },

  async checkVerification(domain): Promise<VerificationCheck> {
    const json = await call("/v1/verification/check", { method: "POST", body: { domain }, timeoutMs: 30_000 });
    if (!isRec(json) || typeof json.verified !== "boolean") throw new Error(BAD_RESPONSE);
    return {
      verified: json.verified,
      message: text(json.message, 300) ?? (json.verified ? "Ownership verified." : "We could not find the token yet. DNS changes can take a while to spread."),
    };
  },

  async reportListing(domain, reason): Promise<OkOrError> {
    return asResult(async () => {
      await call("/v1/reports", { method: "POST", body: { domain, reason } });
      return { ok: true as const };
    });
  },

  async subscribeAlerts(domain, email): Promise<OkOrError> {
    return asResult(async () => {
      await call("/v1/alerts", { method: "POST", body: { domain, email } });
      return { ok: true as const };
    });
  },

  /** Connects to live SSE /v1/events for instant sub-second board updates, with polling fallback. */
  subscribe(cb) {
    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    if (typeof window !== "undefined" && typeof window.EventSource !== "undefined") {
      try {
        es = new window.EventSource(`${BOARD_API_BASE}/v1/events`);
        const trigger = () => {
          if (typeof document === "undefined" || document.visibilityState === "visible") cb();
        };
        es.onmessage = trigger;
        es.addEventListener("board_updated", trigger);
        es.addEventListener("bid_placed", trigger);
        es.addEventListener("click_recorded", trigger);
      } catch {
        // Fall back to polling
      }
    }

    fallbackTimer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") cb();
    }, POLL_MS);

    return () => {
      if (es) {
        es.close();
      }
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
      }
    };
  },
};
