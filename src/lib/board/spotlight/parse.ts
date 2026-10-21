/**
 * Defensive parsers for server JSON. Everything from the network is untrusted: every field is type-checked,
 * length-limited and stripped of control characters, and every link goes through checkListingUrl again.
 * A parser returns null for anything it cannot make sense of instead of throwing.
 */
import { BOARD_CATEGORIES, type BoardCategory } from "@/lib/board/config";
import { checkListingUrl } from "@/lib/board/listing";
import type { Booking, Calendar, CurrentPlacement, Order, OrderStatus, PlacementListing, PurchaseErrorCode, UnitKind } from "./types";

const CONTROL = /[\u0000-\u001f\u007f​-‏‪-‮⁠﻿]/g;

type Obj = Record<string, unknown>;
export const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(CONTROL, "").trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

const safeInt = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) ? v : null);
const cents = (v: unknown): number | null => {
  const n = safeInt(v);
  return n !== null && n >= 0 && n <= 100_000_000 ? n : null;
};
const EPOCH_MIN = Date.UTC(2020, 0, 1);
const EPOCH_MAX = Date.UTC(2100, 0, 1);
const epoch = (v: unknown): number | null => {
  const n = safeInt(v);
  return n !== null && n >= EPOCH_MIN && n <= EPOCH_MAX ? n : null;
};

export function parseListing(v: unknown): PlacementListing | null {
  if (!isObj(v)) return null;
  const domain = cleanText(v.domain, 120);
  const name = cleanText(v.name, 80);
  if (!domain || !name) return null;
  let url: string | null = null;
  if (typeof v.url === "string") {
    const check = checkListingUrl(v.url);
    if (check.ok) url = check.url;
  }
  const category = (BOARD_CATEGORIES as readonly string[]).includes(v.category as string) ? (v.category as BoardCategory) : null;
  return { domain, name, url, category };
}

export function parseBooking(v: unknown): Booking | null {
  if (!isObj(v)) return null;
  const id = cleanText(v.id, 80);
  const start = epoch(v.start);
  const listing = parseListing(v.listing);
  const headline = cleanText(v.headline, 120);
  if (!id || start === null || !listing || !headline) return null;
  return { id, start, listing, headline, ...(v.sample === true ? { sample: true } : {}) };
}

function parseBookings(v: unknown): Booking[] {
  if (!Array.isArray(v)) return [];
  const out: Booking[] = [];
  for (const item of v.slice(0, 2000)) {
    const b = parseBooking(item);
    if (b) out.push(b);
  }
  return out;
}

export function parseCalendar(kind: UnitKind, v: unknown, fallback: { start: number; end: number }): Calendar | null {
  if (!isObj(v) || !Array.isArray(v.bookings)) return null;
  return {
    kind,
    rangeStart: epoch(v.rangeStart) ?? fallback.start,
    rangeEnd: epoch(v.rangeEnd) ?? fallback.end,
    bookings: parseBookings(v.bookings),
    generatedAt: epoch(v.serverTime) ?? Date.now(),
  };
}

export function parseCurrent(kind: UnitKind, v: unknown): CurrentPlacement | null {
  if (!isObj(v)) return null;
  const start = epoch(v.start);
  if (start === null) return null;
  const booking = v.booking === null || v.booking === undefined ? null : parseBooking(v.booking);
  if (v.booking !== null && v.booking !== undefined && !booking) return null;
  const fromCents = v.fromCents === null || v.fromCents === undefined ? null : cents(v.fromCents);
  return { kind, start, booking, fromCents };
}

const STATUSES: readonly OrderStatus[] = ["pending", "paid", "failed", "expired"];

export function parseOrder(v: unknown): Order | null {
  if (!isObj(v)) return null;
  const orderId = cleanText(v.orderId, 80);
  const kind = v.kind === "hour" || v.kind === "day" ? v.kind : null;
  const status = STATUSES.find((s) => s === v.status);
  const subtotalCents = cents(v.subtotalCents);
  const discountCents = cents(v.discountCents);
  const totalCents = cents(v.totalCents);
  if (!orderId || !kind || !status || subtotalCents === null || discountCents === null || totalCents === null) return null;
  return { orderId, kind, status, bookings: parseBookings(v.bookings), subtotalCents, discountCents, totalCents };
}

/** A hosted payment page link is only accepted if it is an https URL. */
export function parseCheckoutUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 2048 || /\s/.test(v)) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const CODES: readonly PurchaseErrorCode[] = [
  "empty", "invalid", "duplicate", "too_many", "past", "beyond", "conflict", "terms", "listing", "headline", "unknown_listing", "rate_limited", "server",
];

const DEFAULT_MESSAGES: Record<PurchaseErrorCode, string> = {
  empty: "Pick at least one slot.",
  invalid: "One of the slots is not valid. Refresh and try again.",
  duplicate: "Each slot can only be picked once.",
  too_many: "That is more slots than one purchase allows.",
  past: "Some of those slots have already started. Nothing was charged.",
  beyond: "Some of those slots are too far ahead. Nothing was charged.",
  conflict: "Some of those slots were just booked by someone else. Nothing was charged.",
  terms: "Please accept the Board rules and refund policy to continue.",
  listing: "Check your link and details, then try again.",
  headline: "Check your headline, then try again.",
  unknown_listing: "We do not have a listing with that link. Enter your details instead.",
  rate_limited: "Too many attempts. Wait a minute and try again. Nothing was charged.",
  network: "We could not reach the booking service. Nothing was charged.",
  server: "Something went wrong on our side. Nothing was charged.",
};

export interface ParsedError {
  code: PurchaseErrorCode;
  error: string;
  conflicts?: number[];
}

/** Parse `{ "error": { "code", "message", "conflicts" } }`. Unknown codes become "server". */
export function parseError(v: unknown, status: number): ParsedError {
  const e = isObj(v) && isObj(v.error) ? v.error : null;
  let code: PurchaseErrorCode = status === 429 ? "rate_limited" : "server";
  if (e && typeof e.code === "string") {
    const match = CODES.find((c) => c === e.code);
    if (match) code = match;
  }
  const message = e ? cleanText(e.message, 200) : null;
  const conflicts = e && Array.isArray(e.conflicts) ? e.conflicts.map(epoch).filter((n): n is number => n !== null).slice(0, 100) : undefined;
  return { code, error: message ?? DEFAULT_MESSAGES[code], ...(conflicts?.length ? { conflicts } : {}) };
}

export const defaultMessage = (code: PurchaseErrorCode): string => DEFAULT_MESSAGES[code];
