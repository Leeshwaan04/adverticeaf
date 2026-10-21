/**
 * Defensive parsers for server JSON. Everything that comes over the wire is untrusted: each parser checks the
 * type and range of every field it uses and returns null (or drops the row) rather than passing junk to the UI.
 * Parsed strings are plain text. The UI renders them as text and validates links with checkListingUrl before use.
 */
import { BOARD_CATEGORIES, RULES, THRONE, type BoardCategory } from "@/lib/board/config";
import type { Listing } from "@/lib/board/types";
import type { Reign, ThroneView, TimeLeaderRow, TimeLeaderboard, TimeWindow } from "./types";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max ? v : null;
/** Epoch ms between 2000 and 2100. */
const epoch = (v: unknown) => int(v, 946_684_800_000, 4_102_444_800_000);
/** null stays null (an allowed "none"), a valid value passes, anything else becomes undefined (invalid). */
const orNull = <T>(v: unknown, parse: (x: unknown) => T | null): T | null | undefined => (v === null ? null : (parse(v) ?? undefined));

export function parseListing(v: unknown): Listing | null {
  if (!isRec(v)) return null;
  const domain = text(v.domain, 200);
  const name = text(v.name, RULES.nameMax * 2);
  const url = text(v.url, 2048);
  if (!domain || !name || url === null) return null;
  const category = (BOARD_CATEGORIES as readonly string[]).includes(v.category as string) ? (v.category as BoardCategory) : "Other";
  return {
    domain,
    name,
    url,
    category,
    tagline: text(v.tagline, RULES.taglineMax * 2) ?? "",
    createdAt: epoch(v.createdAt) ?? 0,
    verified: v.verified === true,
    ...(v.sample === true ? { sample: true } : {}),
  };
}

export function parseReign(v: unknown): Reign | null {
  if (!isRec(v)) return null;
  const id = text(v.id, 100);
  const listing = parseListing(v.listing);
  const startedAt = epoch(v.startedAt);
  const endedAt = orNull(v.endedAt, epoch);
  const pricePaidCents = int(v.pricePaidCents, THRONE.floorCents, RULES.maxBidCents);
  if (!id || !listing || startedAt === null || endedAt === undefined || pricePaidCents === null) return null;
  if (endedAt !== null && endedAt < startedAt) return null;
  return { id, listing, startedAt, endedAt, pricePaidCents, ...(v.sample === true ? { sample: true } : {}) };
}

export function parseReigns(json: unknown): Reign[] | null {
  if (!isRec(json) || !Array.isArray(json.reigns)) return null;
  return json.reigns.map(parseReign).filter((r): r is Reign => r !== null);
}

/**
 * `sentAt` and `receivedAt` are browser clock readings around the request. The skew assumes the server stamped
 * serverNow halfway through the round trip.
 */
export function parseThroneView(json: unknown, sentAt: number, receivedAt: number): ThroneView | null {
  if (!isRec(json)) return null;
  const serverNow = epoch(json.serverNow);
  const startPriceCents = int(json.startPriceCents, THRONE.floorCents, RULES.maxBidCents);
  const lastTakeAt = orNull(json.lastTakeAt, epoch);
  const reignCount = int(json.reignCount, 0, 1_000_000_000);
  const holder = orNull(json.holder, parseListing);
  if (serverNow === null || startPriceCents === null || lastTakeAt === undefined || reignCount === null || holder === undefined) return null;
  // A seat with a holder must have a take time, and the reverse.
  if ((holder === null) !== (lastTakeAt === null)) return null;
  return {
    mode: "live",
    holder,
    lastTakeAt,
    startPriceCents,
    clockSkewMs: serverNow - Math.round((sentAt + receivedAt) / 2),
    reignCount,
    generatedAt: serverNow,
  };
}

const WINDOWS: readonly TimeWindow[] = ["day", "week", "all"];

export function parseLeaderboard(json: unknown, expected: TimeWindow): TimeLeaderboard | null {
  if (!isRec(json) || !Array.isArray(json.rows)) return null;
  const generatedAt = epoch(json.generatedAt);
  if (generatedAt === null || !WINDOWS.includes(json.window as TimeWindow) || json.window !== expected) return null;
  const rows: TimeLeaderRow[] = [];
  for (const raw of json.rows) {
    if (!isRec(raw)) continue;
    const listing = parseListing(raw.listing);
    const totalMs = int(raw.totalMs, 1, Number.MAX_SAFE_INTEGER);
    const reigns = int(raw.reigns, 1, 1_000_000_000);
    if (!listing || totalMs === null || reigns === null) continue;
    rows.push({ rank: rows.length + 1, listing, totalMs, reigns, holdingNow: raw.holdingNow === true });
  }
  return { window: expected, rows, generatedAt };
}

/** https only, no embedded credentials. A hosted checkout must never be a plain http or script URL. */
export function safeCheckoutUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 2048) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Parsed body of POST /throne/take on success: either a checkout URL to redirect to, or the finished take. */
export type ParsedTake =
  | { kind: "redirect"; checkoutUrl: string }
  | { kind: "taken"; reign: Reign; chargedCents: number; nextStartCents: number };

export function parseTake(json: unknown): ParsedTake | null {
  if (!isRec(json)) return null;
  if (json.checkoutUrl !== undefined) {
    const checkoutUrl = safeCheckoutUrl(json.checkoutUrl);
    return checkoutUrl ? { kind: "redirect", checkoutUrl } : null;
  }
  if (json.ok !== true) return null;
  const reign = parseReign(json.reign);
  const chargedCents = int(json.chargedCents, THRONE.floorCents, RULES.maxBidCents);
  const nextStartCents = int(json.nextStartCents, THRONE.openingCents, RULES.maxBidCents * 2);
  if (!reign || chargedCents === null || nextStartCents === null) return null;
  return { kind: "taken", reign, chargedCents, nextStartCents };
}

export interface ParsedError {
  code: string | null;
  message: string | null;
  currentPriceCents: number | null;
}

export function parseError(json: unknown): ParsedError {
  const e = isRec(json) && isRec(json.error) ? json.error : null;
  return {
    code: e ? text(e.code, 60) : null,
    message: e ? text(e.message, 300) : null,
    currentPriceCents: e ? int(e.currentPriceCents, THRONE.floorCents, RULES.maxBidCents) : null,
  };
}
