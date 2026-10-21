/** Pure helpers for the wall grid UI: focus movement, selection resizing, free-spot search, zoom, label fit. */
import { COLS, MAX_BLOCK_TILES, ROWS, rectArea, rectFromCorners, tileCoords, tileIndex } from "./rules";
import type { Rect } from "./types";

export type Dir = "left" | "right" | "up" | "down";

export interface Selection {
  /** Tile where the selection started and stays fixed. */
  anchor: number;
  /** Tile at the moving corner. */
  head: number;
}

const DELTA: Record<Dir, { dc: number; dr: number }> = {
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
};

/** One tile in a direction. Returns the same index at an edge. */
export function stepTile(index: number, dir: Dir, cols: number = COLS, rows: number = ROWS): number {
  const { col, row } = tileCoords(index, cols);
  const c = col + DELTA[dir].dc;
  const r = row + DELTA[dir].dr;
  return c < 0 || r < 0 || c >= cols || r >= rows ? index : tileIndex(c, r, cols);
}

/**
 * Arrow-key focus movement. A merged block is one focus stop, so leaving it skips to the first tile
 * beyond its edge in that direction while keeping the other coordinate.
 */
export function stepFocus(
  index: number,
  dir: Dir,
  blockRectAt: (index: number) => Rect | null,
  cols: number = COLS,
  rows: number = ROWS,
): number {
  const rect = blockRectAt(index);
  const { col, row } = tileCoords(index, cols);
  let c = col;
  let r = row;
  if (dir === "right") c = rect ? rect.col + rect.w : col + 1;
  if (dir === "left") c = rect ? rect.col - 1 : col - 1;
  if (dir === "down") r = rect ? rect.row + rect.h : row + 1;
  if (dir === "up") r = rect ? rect.row - 1 : row - 1;
  return c < 0 || r < 0 || c >= cols || r >= rows ? index : tileIndex(c, r, cols);
}

export type ExtendResult = { head: number; blocked: "edge" | "max" | null };

/** Shift+arrow: move the head one tile, but never beyond the grid or MAX_BLOCK_TILES. */
export function extendHead(sel: Selection, dir: Dir, cols: number = COLS, rows: number = ROWS): ExtendResult {
  const next = stepTile(sel.head, dir, cols, rows);
  if (next === sel.head) return { head: sel.head, blocked: "edge" };
  if (rectArea(rectFromCorners(sel.anchor, next, cols)) > MAX_BLOCK_TILES) return { head: sel.head, blocked: "max" };
  return { head: next, blocked: null };
}

/** Whether moving the head to `next` keeps the selection within the size limit. */
export const withinLimit = (anchor: number, next: number, cols: number = COLS): boolean =>
  rectArea(rectFromCorners(anchor, next, cols)) <= MAX_BLOCK_TILES;

/**
 * Buttons for people who cannot drag: grow or shrink the selection's width or height by one,
 * keeping the anchor corner fixed. Returns null when the change is not possible.
 */
export function resizeSelection(
  sel: Selection,
  axis: "w" | "h",
  delta: 1 | -1,
  cols: number = COLS,
  rows: number = ROWS,
): Selection | null {
  const a = tileCoords(sel.anchor, cols);
  const h = tileCoords(sel.head, cols);
  const rect = rectFromCorners(sel.anchor, sel.head, cols);
  const size = axis === "w" ? rect.w : rect.h;
  const nextSize = size + delta;
  if (nextSize < 1) return null;
  const nextW = axis === "w" ? nextSize : rect.w;
  const nextH = axis === "h" ? nextSize : rect.h;
  if (nextW * nextH > MAX_BLOCK_TILES) return null;

  const limit = axis === "w" ? cols : rows;
  const aPos = axis === "w" ? a.col : a.row;
  const hPos = axis === "w" ? h.col : h.row;
  let sign = hPos >= aPos ? 1 : -1;
  let target = aPos + sign * (nextSize - 1);
  if (target < 0 || target >= limit) {
    sign = -sign;
    target = aPos + sign * (nextSize - 1);
    if (target < 0 || target >= limit) return null;
  }
  const head = axis === "w" ? tileIndex(target, h.row, cols) : tileIndex(h.col, target, cols);
  return { anchor: sel.anchor, head };
}

/**
 * The free w by h rectangle closest to the middle of the wall (most visible), ties broken in reading order.
 * Used by one-tap quick buy and the size presets.
 */
export function findFreeRect(
  isTaken: (index: number) => boolean,
  w: number,
  h: number,
  cols: number = COLS,
  rows: number = ROWS,
): Rect | null {
  let best: Rect | null = null;
  let bestDist = Infinity;
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  for (let row = 0; row + h <= rows; row++) {
    for (let col = 0; col + w <= cols; col++) {
      let free = true;
      for (let y = row; y < row + h && free; y++) {
        for (let x = col; x < col + w; x++) {
          if (isTaken(y * cols + x)) {
            free = false;
            break;
          }
        }
      }
      if (!free) continue;
      const dx = col + (w - 1) / 2 - cx;
      const dy = row + (h - 1) / 2 - cy;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = { col, row, w, h };
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------- zoom

export const ZOOM_LEVELS = [20, 28, 36, 44, 56] as const;
export const TILE_GAP_PX = 2;
const MIN_FIT_PX = 12;
const MAX_FIT_PX = 44;

/** Tile size that makes the whole wall fit the container width. */
export function fitCellPx(containerWidth: number, cols: number = COLS): number {
  const raw = Math.floor((containerWidth - TILE_GAP_PX * (cols - 1)) / cols);
  return Math.max(MIN_FIT_PX, Math.min(MAX_FIT_PX, Number.isFinite(raw) ? raw : MIN_FIT_PX));
}

/** `current` null means "fit". Returns the next zoom (null = fit) or the same value at a limit. */
export function zoomStep(current: number | null, fit: number, dir: 1 | -1): number | null {
  const eff = current ?? fit;
  if (dir === 1) return ZOOM_LEVELS.find((l) => l > eff) ?? current;
  if (current === null) return null;
  const smaller = [...ZOOM_LEVELS].reverse().find((l) => l < eff && l > fit);
  return smaller ?? null;
}

export const canZoomIn = (current: number | null, fit: number): boolean => ZOOM_LEVELS.some((l) => l > (current ?? fit));
export const canZoomOut = (current: number | null): boolean => current !== null;

// ---------------------------------------------------------------- block content

/** Pixel size of a w by h block at a cell size, including the gaps it spans. */
export const blockPx = (n: number, cell: number): number => n * cell + (n - 1) * TILE_GAP_PX;

export type BlockContent = "initial" | "label" | "label-avatar";

/** What fits inside a block without text smaller than 12px: just an initial, the label, or label plus avatar. */
export function blockContent(w: number, h: number, cell: number): BlockContent {
  const pw = blockPx(w, cell);
  const ph = blockPx(h, cell);
  if (pw >= 64 && ph >= 52) return "label-avatar";
  if (pw >= 48 && ph >= 20) return "label";
  return "initial";
}
