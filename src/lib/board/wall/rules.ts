/**
 * Pixel Wall rules. Pure functions only: no I/O, no clock, no randomness.
 * Money is integer US cents. Tile index = row * cols + col.
 */
import { WALL } from "../config";
import { formatUsd } from "../format";
import { checkText } from "../listing";
import type { LadderStep, Rect, WallBlock, WallErrorCode, WallQuote } from "./types";

export const COLS = WALL.cols;
export const ROWS = WALL.rows;
export const TOTAL_TILES = WALL.cols * WALL.rows;
/** A purchase is one tile or a rectangle of at most this many tiles. */
export const MAX_BLOCK_TILES = 25;

export interface Pricing {
  basePriceCents: number;
  stepCents: number;
}
const DEFAULT_PRICING: Pricing = WALL;

// ---------------------------------------------------------------- geometry

export const tileIndex = (col: number, row: number, cols: number = COLS): number => row * cols + col;

export function tileCoords(index: number, cols: number = COLS): { col: number; row: number } {
  return { col: index % cols, row: Math.floor(index / cols) };
}

export const isTileIndex = (n: unknown, total: number = TOTAL_TILES): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n < total;

/** Human wording, one-based: "column 3, row 5". */
export function tileName(index: number, cols: number = COLS): string {
  const { col, row } = tileCoords(index, cols);
  return `column ${col + 1}, row ${row + 1}`;
}

export const rectArea = (r: Rect): number => r.w * r.h;

export function rectInBounds(r: Rect, cols: number = COLS, rows: number = ROWS): boolean {
  return (
    Number.isInteger(r.col) && Number.isInteger(r.row) && Number.isInteger(r.w) && Number.isInteger(r.h) &&
    r.col >= 0 && r.row >= 0 && r.w >= 1 && r.h >= 1 && r.col + r.w <= cols && r.row + r.h <= rows
  );
}

/** Tile indexes of a rectangle in reading order (left to right, top to bottom). */
export function rectTiles(r: Rect, cols: number = COLS): number[] {
  const out: number[] = [];
  for (let y = r.row; y < r.row + r.h; y++) for (let x = r.col; x < r.col + r.w; x++) out.push(y * cols + x);
  return out;
}

export function rectContains(r: Rect, index: number, cols: number = COLS): boolean {
  const { col, row } = tileCoords(index, cols);
  return col >= r.col && col < r.col + r.w && row >= r.row && row < r.row + r.h;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;
}

/** The rectangle spanned by two corner tiles, in any order. */
export function rectFromCorners(a: number, b: number, cols: number = COLS): Rect {
  const p = tileCoords(a, cols);
  const q = tileCoords(b, cols);
  const col = Math.min(p.col, q.col);
  const row = Math.min(p.row, q.row);
  return { col, row, w: Math.abs(p.col - q.col) + 1, h: Math.abs(p.row - q.row) + 1 };
}

/**
 * The rectangle formed by exactly these tiles, or null when they are not a full rectangle
 * (gaps, duplicates, out of range, empty).
 */
export function rectFromTiles(tiles: readonly number[], cols: number = COLS, rows: number = ROWS): Rect | null {
  if (tiles.length === 0) return null;
  const total = cols * rows;
  const seen = new Set<number>();
  let minC = Infinity, minR = Infinity, maxC = -1, maxR = -1;
  for (const t of tiles) {
    if (!isTileIndex(t, total) || seen.has(t)) return null;
    seen.add(t);
    const { col, row } = tileCoords(t, cols);
    minC = Math.min(minC, col);
    minR = Math.min(minR, row);
    maxC = Math.max(maxC, col);
    maxR = Math.max(maxR, row);
  }
  const rect = { col: minC, row: minR, w: maxC - minC + 1, h: maxR - minR + 1 };
  return rectArea(rect) === tiles.length ? rect : null;
}

// ---------------------------------------------------------------- inventory

export const soldCount = (blocks: readonly Pick<WallBlock, "rect">[]): number => blocks.reduce((n, b) => n + rectArea(b.rect), 0);

export function takenSet(blocks: readonly Pick<WallBlock, "rect">[], cols: number = COLS): Set<number> {
  const s = new Set<number>();
  for (const b of blocks) for (const t of rectTiles(b.rect, cols)) s.add(t);
  return s;
}

/** For each tile, the index into `blocks` that owns it, or -1 when free. */
export function ownerMap(blocks: readonly Pick<WallBlock, "rect">[], cols: number = COLS, rows: number = ROWS): Int16Array {
  const map = new Int16Array(cols * rows).fill(-1);
  blocks.forEach((b, i) => {
    for (const t of rectTiles(b.rect, cols)) map[t] = i;
  });
  return map;
}

// ---------------------------------------------------------------- pricing

/** Price of the next tile when `sold` tiles are already sold. */
export function tilePriceCents(sold: number, p: Pricing = DEFAULT_PRICING): number {
  const n = Math.max(0, Math.trunc(sold));
  return p.basePriceCents + n * p.stepCents;
}

/** Sequential prices for `count` tiles bought in one purchase, starting at the current sold count. */
export function priceLadder(sold: number, count: number, p: Pricing = DEFAULT_PRICING): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(tilePriceCents(sold + i, p));
  return out;
}

export function blockPriceCents(sold: number, count: number, p: Pricing = DEFAULT_PRICING): number {
  return priceLadder(sold, count, p).reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------- selection and purchase checks

export type SelectionCheck =
  | { ok: true; rect: Rect; tiles: number[] }
  | { ok: false; code: Extract<WallErrorCode, "invalid_selection" | "tile_taken">; error: string };

/** A purchase is one tile or a rectangle of up to MAX_BLOCK_TILES tiles, all currently free. */
export function checkSelection(tiles: readonly number[], taken: ReadonlySet<number>): SelectionCheck {
  if (tiles.length === 0) return { ok: false, code: "invalid_selection", error: "Select at least one tile." };
  if (tiles.length > MAX_BLOCK_TILES) {
    return { ok: false, code: "invalid_selection", error: `You can buy up to ${MAX_BLOCK_TILES} tiles at once.` };
  }
  const rect = rectFromTiles(tiles);
  if (!rect) {
    return { ok: false, code: "invalid_selection", error: "Tiles must form a single rectangle with no gaps." };
  }
  const clash = tiles.filter((t) => taken.has(t));
  if (clash.length === 1) {
    return { ok: false, code: "tile_taken", error: `The tile at ${tileName(clash[0])} is already taken. Choose a free spot.` };
  }
  if (clash.length > 1) {
    return { ok: false, code: "tile_taken", error: `${clash.length} of those tiles are already taken. Choose a free spot.` };
  }
  return { ok: true, rect, tiles: rectTiles(rect) };
}

export function quoteSelection(sold: number, tiles: readonly number[], taken: ReadonlySet<number>): WallQuote {
  const check = checkSelection(tiles, taken);
  if (!check.ok) return check;
  const prices = priceLadder(sold, check.tiles.length);
  const ladder: LadderStep[] = check.tiles.map((index, i) => ({ index, priceCents: prices[i] }));
  return {
    ok: true,
    tiles: check.tiles,
    rect: check.rect,
    ladder,
    totalCents: prices.reduce((a, b) => a + b, 0),
    soldCount: sold,
    nextPriceCents: tilePriceCents(sold + check.tiles.length),
  };
}

export type PurchaseEvaluation =
  | { ok: true; rect: Rect; tiles: number[]; ladder: LadderStep[]; totalCents: number }
  | { ok: false; code: WallErrorCode; error: string };

export interface PurchaseInput {
  soldCount: number;
  taken: ReadonlySet<number>;
  tiles: readonly number[];
  label: string;
  color: string;
  expectedTotalCents: number;
}

/**
 * The atomic purchase decision. Everything is checked against ONE consistent view of the wall:
 * shape, label, colour, availability, then the price the buyer expects.
 * Rejects if any tile was taken or the total changed since the buyer saw it.
 */
export function evaluatePurchase(input: PurchaseInput): PurchaseEvaluation {
  const q = quoteSelection(input.soldCount, input.tiles, input.taken);
  if (!q.ok) return q;
  const labelError = checkLabel(input.label);
  if (labelError) return { ok: false, code: "invalid_style", error: labelError };
  if (!isPaletteColor(input.color)) {
    return { ok: false, code: "invalid_style", error: "Choose one of the listed colours." };
  }
  if (!Number.isInteger(input.expectedTotalCents) || input.expectedTotalCents !== q.totalCents) {
    return {
      ok: false,
      code: "price_changed",
      error: `The price is now ${formatUsd(q.totalCents)}, which is different from the total you saw. Tiles may have sold in the meantime. Nothing was charged. Review the new total and confirm again.`,
    };
  }
  return { ok: true, rect: q.rect, tiles: q.tiles, ladder: q.ladder, totalCents: q.totalCents };
}

// ---------------------------------------------------------------- label and colour

/** 1 to WALL.labelMax characters, no links, no control characters. */
export function checkLabel(label: string): string | undefined {
  return checkText(label, "Label", WALL.labelMax, 1);
}

/** A starting label taken from a name: whole words that fit, else the first characters. */
export function deriveLabel(name: string, max: number = WALL.labelMax): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  return out || words[0].slice(0, max);
}

export interface PaletteColor {
  id: string;
  name: string;
  /** Tile background. */
  bg: string;
  /** Text colour on bg. Every pair meets WCAG AA (4.5:1), asserted in tests. */
  fg: string;
}

export const PALETTE: readonly PaletteColor[] = [
  { id: "cyan", name: "Cyan", bg: "#22d3ee", fg: "#04141a" },
  { id: "sky", name: "Sky", bg: "#38bdf8", fg: "#04141a" },
  { id: "blue", name: "Blue", bg: "#2563eb", fg: "#ffffff" },
  { id: "violet", name: "Violet", bg: "#7c3aed", fg: "#ffffff" },
  { id: "fuchsia", name: "Fuchsia", bg: "#c026d3", fg: "#ffffff" },
  { id: "rose", name: "Rose", bg: "#e11d48", fg: "#ffffff" },
  { id: "red", name: "Red", bg: "#dc2626", fg: "#ffffff" },
  { id: "orange", name: "Orange", bg: "#f97316", fg: "#1a0b00" },
  { id: "amber", name: "Amber", bg: "#fbbf24", fg: "#1a1000" },
  { id: "lime", name: "Lime", bg: "#a3e635", fg: "#0f1a00" },
  { id: "green", name: "Green", bg: "#15803d", fg: "#ffffff" },
  { id: "slate", name: "Slate", bg: "#64748b", fg: "#ffffff" },
];

export const DEFAULT_COLOR_ID = PALETTE[0].id;

export const isPaletteColor = (id: unknown): id is string => typeof id === "string" && PALETTE.some((c) => c.id === id);

export function paletteColor(id: string): PaletteColor {
  return PALETTE.find((c) => c.id === id) ?? PALETTE[0];
}

/** WCAG 2.x relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two #rrggbb colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
