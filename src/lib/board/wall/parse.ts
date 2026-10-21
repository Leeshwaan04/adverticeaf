/**
 * Defensive parsing for server JSON. Everything from the network or from localStorage is untrusted:
 * check shapes, clamp text, and drop what cannot be shown safely.
 */
import { BOARD_CATEGORIES, RULES, WALL, type BoardCategory } from "../config";
import type { Listing } from "../types";
import { DEFAULT_COLOR_ID, isPaletteColor, rectArea, rectInBounds, rectsOverlap } from "./rules";
import type { LadderStep, Rect, WallBlock, WallErrorCode, WallOrder, WallPurchaseResult, WallQuote, WallSnapshot } from "./types";

type Rec = Record<string, unknown>;
export const isRecord = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

const INVISIBLE = /[\u0000-\u001f\u007f​-‏‪-‮⁠﻿]/g;

/** Strip control and direction-override characters, trim and clamp. */
export function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(INVISIBLE, "").trim().slice(0, max) : "";
}

const finiteNumber = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const cents = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null);

const ERROR_CODES: readonly WallErrorCode[] = [
  "invalid_selection", "invalid_style", "invalid_listing", "terms", "tile_taken", "price_changed", "rate_limited", "unavailable",
];
export const isErrorCode = (v: unknown): v is WallErrorCode => typeof v === "string" && (ERROR_CODES as readonly string[]).includes(v);

export function parseRect(v: unknown): Rect | null {
  if (!isRecord(v)) return null;
  const rect = { col: v.col, row: v.row, w: v.w, h: v.h } as Rect;
  return rectInBounds(rect, WALL.cols, WALL.rows) ? rect : null;
}

function parseListing(v: unknown): Listing | null {
  if (!isRecord(v)) return null;
  const name = cleanText(v.name, RULES.nameMax);
  const url = typeof v.url === "string" ? v.url.trim().slice(0, 2048) : "";
  if (!name || !url) return null;
  const category = (BOARD_CATEGORIES as readonly string[]).includes(v.category as string) ? (v.category as BoardCategory) : "Other";
  return {
    domain: cleanText(v.domain, 200),
    name,
    url,
    category,
    tagline: cleanText(v.tagline, RULES.taglineMax),
    createdAt: finiteNumber(v.createdAt) ?? 0,
    verified: v.verified === true,
    ...(v.sample === true ? { sample: true } : {}),
  };
}

/** One block, or null when it cannot be shown (bad rect, missing listing). An unknown colour falls back to the default. */
export function parseBlock(v: unknown): WallBlock | null {
  if (!isRecord(v)) return null;
  const id = typeof v.id === "string" && v.id.length > 0 && v.id.length <= 80 ? v.id : null;
  const rect = parseRect(v.rect);
  const listing = parseListing(v.listing);
  if (!id || !rect || !listing) return null;
  return {
    id,
    rect,
    label: cleanText(v.label, WALL.labelMax),
    color: isPaletteColor(v.color) ? v.color : DEFAULT_COLOR_ID,
    listing,
    paidCents: cents(v.paidCents) ?? 0,
    at: finiteNumber(v.at) ?? 0,
    ...(v.sample === true ? { sample: true } : {}),
  };
}

/** Parse a list of blocks. Blocks that overlap an earlier block are dropped, so one tile never has two owners. */
export function parseBlocks(v: unknown): WallBlock[] {
  if (!Array.isArray(v)) return [];
  const out: WallBlock[] = [];
  for (const raw of v) {
    const b = parseBlock(raw);
    if (!b) continue;
    if (out.some((o) => o.id === b.id || rectsOverlap(o.rect, b.rect))) continue;
    out.push(b);
  }
  return out;
}

export function parseSnapshot(v: unknown, mode: "demo" | "live"): WallSnapshot {
  if (!isRecord(v) || !Array.isArray(v.blocks)) throw new Error("The wall sent an unexpected response. Please try again.");
  if (v.cols !== WALL.cols || v.rows !== WALL.rows) throw new Error("The wall layout has changed. Please reload the page.");
  return {
    cols: WALL.cols,
    rows: WALL.rows,
    blocks: parseBlocks(v.blocks),
    generatedAt: finiteNumber(v.generatedAt) ?? 0,
    mode,
  };
}

function parseLadder(v: unknown, expected: number[]): LadderStep[] | null {
  if (!Array.isArray(v) || v.length !== expected.length) return null;
  const out: LadderStep[] = [];
  for (let i = 0; i < v.length; i++) {
    const s = v[i];
    if (!isRecord(s)) return null;
    const price = cents(s.priceCents);
    if (s.index !== expected[i] || price === null) return null;
    out.push({ index: expected[i], priceCents: price });
  }
  return out;
}

export function parseQuote(v: unknown): WallQuote {
  if (!isRecord(v)) return { ok: false, code: "unavailable", error: "The wall sent an unexpected response. Please try again." };
  if (v.ok === false) {
    return {
      ok: false,
      code: isErrorCode(v.code) ? v.code : "unavailable",
      error: cleanText(v.error, 300) || "That selection cannot be bought.",
    };
  }
  const rect = parseRect(v.rect);
  const tiles = Array.isArray(v.tiles) && v.tiles.every((t) => Number.isInteger(t)) ? (v.tiles as number[]) : null;
  const total = cents(v.totalCents);
  const sold = cents(v.soldCount);
  const next = cents(v.nextPriceCents);
  if (v.ok !== true || !rect || !tiles || tiles.length !== rectArea(rect) || total === null || sold === null || next === null) {
    return { ok: false, code: "unavailable", error: "The wall sent an unexpected response. Please try again." };
  }
  const ladder = parseLadder(v.ladder, tiles);
  if (!ladder || ladder.reduce((s, l) => s + l.priceCents, 0) !== total) {
    return { ok: false, code: "unavailable", error: "The wall sent a price we could not verify. Please try again." };
  }
  return { ok: true, tiles, rect, ladder, totalCents: total, soldCount: sold, nextPriceCents: next };
}

/** Only an https URL is ever followed for payment. Anything else is dropped. */
export function safeCheckoutUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 2048) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch {
    return null;
  }
}

const orderId = (v: unknown): string | undefined => (typeof v === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(v) ? v : undefined);

/** A purchase answer is either a finished block, or a hosted checkout URL, or an error. */
export function parsePurchase(v: unknown): WallPurchaseResult {
  const bad: WallPurchaseResult = { ok: false, code: "unavailable", error: "The wall sent an unexpected response. Please check the wall before trying again." };
  if (!isRecord(v)) return bad;
  if (v.ok === false) {
    return {
      ok: false,
      code: isErrorCode(v.code) ? v.code : "unavailable",
      error: cleanText(v.error, 300) || "The purchase could not be completed.",
    };
  }
  if (v.checkoutUrl !== undefined && v.checkoutUrl !== null) {
    const url = safeCheckoutUrl(v.checkoutUrl);
    if (!url) {
      return { ok: false, code: "unavailable", error: "The payment page link was not secure, so we stopped. Nothing was charged." };
    }
    return { ok: true, checkoutUrl: url, orderId: orderId(v.orderId) };
  }
  const block = parseBlock(v.block);
  if (v.ok !== true || !block) return bad;
  return { ok: true, block, orderId: orderId(v.orderId) };
}

export function parseOrder(v: unknown): WallOrder {
  if (!isRecord(v)) return { status: "failed", message: "The wall sent an unexpected response." };
  switch (v.status) {
    case "pending":
      return { status: "pending" };
    case "paid": {
      const block = parseBlock(v.block);
      return block ? { status: "paid", block } : { status: "failed", message: "The wall sent an unexpected response." };
    }
    case "expired":
    case "not_found":
    case "failed":
      return { status: v.status, message: cleanText(v.message, 300) || undefined };
    default:
      return { status: "failed", message: "The wall sent an unexpected response." };
  }
}
