import { describe, expect, it } from "vitest";
import {
  ZOOM_LEVELS, blockContent, canZoomIn, canZoomOut, extendHead, findFreeRect, fitCellPx, resizeSelection, stepFocus, stepTile, zoomStep,
} from "./grid";
import { MAX_BLOCK_TILES, rectArea, rectFromCorners, tileIndex } from "./rules";
import type { Rect } from "./types";

const noBlock = () => null;

describe("stepTile and stepFocus", () => {
  it("moves one tile and stops at every edge", () => {
    expect(stepTile(tileIndex(5, 5), "right")).toBe(tileIndex(6, 5));
    expect(stepTile(tileIndex(5, 5), "up")).toBe(tileIndex(5, 4));
    expect(stepTile(0, "left")).toBe(0);
    expect(stepTile(0, "up")).toBe(0);
    expect(stepTile(24, "right")).toBe(24);
    expect(stepTile(399, "down")).toBe(399);
  });
  it("does not wrap from the end of a row to the next row", () => {
    expect(stepTile(tileIndex(24, 3), "right")).toBe(tileIndex(24, 3));
    expect(stepTile(tileIndex(0, 3), "left")).toBe(tileIndex(0, 3));
  });
  it("skips over a merged block as one focus stop and keeps the other coordinate", () => {
    const block: Rect = { col: 4, row: 2, w: 3, h: 2 };
    const at = (i: number) => {
      const c = i % 25;
      const r = Math.floor(i / 25);
      return c >= 4 && c < 7 && r >= 2 && r < 4 ? block : null;
    };
    const inside = tileIndex(5, 3);
    expect(stepFocus(inside, "right", at)).toBe(tileIndex(7, 3));
    expect(stepFocus(inside, "left", at)).toBe(tileIndex(3, 3));
    expect(stepFocus(inside, "up", at)).toBe(tileIndex(5, 1));
    expect(stepFocus(inside, "down", at)).toBe(tileIndex(5, 4));
    expect(stepFocus(tileIndex(3, 2), "right", at)).toBe(tileIndex(4, 2)); // entering the block
  });
  it("stays put when a block touches the wall edge", () => {
    const block: Rect = { col: 23, row: 0, w: 2, h: 1 };
    const at = (i: number) => (i === 23 || i === 24 ? block : null);
    expect(stepFocus(24, "right", at)).toBe(24);
    expect(stepFocus(23, "up", at)).toBe(23);
    expect(stepFocus(10, "right", noBlock)).toBe(11);
  });
});

describe("extendHead (Shift+arrows)", () => {
  it("extends a rectangle one tile at a time", () => {
    const a = tileIndex(3, 3);
    expect(extendHead({ anchor: a, head: a }, "right")).toEqual({ head: tileIndex(4, 3), blocked: null });
    expect(extendHead({ anchor: a, head: tileIndex(4, 3) }, "down")).toEqual({ head: tileIndex(4, 4), blocked: null });
  });
  it("blocks at the wall edge", () => {
    const a = tileIndex(24, 0);
    expect(extendHead({ anchor: a, head: a }, "right")).toEqual({ head: a, blocked: "edge" });
  });
  it("blocks beyond 25 tiles", () => {
    const anchor = tileIndex(0, 0);
    const head = tileIndex(4, 4); // 5x5 = 25
    expect(extendHead({ anchor, head }, "right")).toEqual({ head, blocked: "max" });
    expect(extendHead({ anchor, head }, "down")).toEqual({ head, blocked: "max" });
    expect(extendHead({ anchor, head }, "left")).toEqual({ head: tileIndex(3, 4), blocked: null });
  });
});

describe("resizeSelection (buttons instead of dragging)", () => {
  const sel = (a: number, h: number) => ({ anchor: a, head: h });
  it("grows and shrinks width and height", () => {
    const s = sel(tileIndex(2, 2), tileIndex(2, 2));
    const wider = resizeSelection(s, "w", 1)!;
    expect(rectFromCorners(wider.anchor, wider.head)).toEqual({ col: 2, row: 2, w: 2, h: 1 });
    const taller = resizeSelection(wider, "h", 1)!;
    expect(rectFromCorners(taller.anchor, taller.head)).toEqual({ col: 2, row: 2, w: 2, h: 2 });
    const narrower = resizeSelection(taller, "w", -1)!;
    expect(rectFromCorners(narrower.anchor, narrower.head)).toEqual({ col: 2, row: 2, w: 1, h: 2 });
  });
  it("cannot shrink below one tile", () => {
    const s = sel(5, 5);
    expect(resizeSelection(s, "w", -1)).toBeNull();
    expect(resizeSelection(s, "h", -1)).toBeNull();
  });
  it("grows the other way at the right and bottom edges", () => {
    const s = sel(tileIndex(24, 15), tileIndex(24, 15));
    const w = resizeSelection(s, "w", 1)!;
    expect(rectFromCorners(w.anchor, w.head)).toEqual({ col: 23, row: 15, w: 2, h: 1 });
    const h = resizeSelection(s, "h", 1)!;
    expect(rectFromCorners(h.anchor, h.head)).toEqual({ col: 24, row: 14, w: 1, h: 2 });
  });
  it("never exceeds 25 tiles", () => {
    const s = sel(tileIndex(0, 0), tileIndex(4, 4));
    expect(resizeSelection(s, "w", 1)).toBeNull();
    expect(resizeSelection(s, "h", 1)).toBeNull();
    const r = resizeSelection(sel(0, tileIndex(4, 3)), "h", 1)!;
    expect(rectArea(rectFromCorners(r.anchor, r.head))).toBeLessThanOrEqual(MAX_BLOCK_TILES);
  });
  it("returns null when the row is already full width", () => {
    expect(resizeSelection(sel(tileIndex(0, 0), tileIndex(24, 0)), "w", 1)).toBeNull();
  });
});

describe("findFreeRect (quick buy and presets)", () => {
  it("prefers the middle of an empty wall", () => {
    const r = findFreeRect(() => false, 1, 1)!;
    expect(Math.abs(r.col - 12)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.row - 7.5)).toBeLessThanOrEqual(1);
    const big = findFreeRect(() => false, 5, 5)!;
    expect(big).toMatchObject({ w: 5, h: 5 });
    expect(big.col + 5).toBeLessThanOrEqual(25);
    expect(big.row + 5).toBeLessThanOrEqual(16);
  });
  it("never returns a rect that touches a taken tile", () => {
    const taken = new Set<number>();
    for (let r = 4; r < 12; r++) for (let c = 8; c < 17; c++) taken.add(tileIndex(c, r));
    for (const [w, h] of [[1, 1], [2, 2], [3, 3], [5, 5]]) {
      const rect = findFreeRect((i) => taken.has(i), w, h)!;
      for (let y = rect.row; y < rect.row + h; y++) for (let x = rect.col; x < rect.col + w; x++) expect(taken.has(tileIndex(x, y))).toBe(false);
    }
  });
  it("returns null when nothing fits", () => {
    expect(findFreeRect(() => true, 1, 1)).toBeNull();
    // a checkerboard has no free 2x2
    expect(findFreeRect((i) => ((i % 25) + Math.floor(i / 25)) % 2 === 0, 2, 2)).toBeNull();
    expect(findFreeRect(() => false, 26, 1)).toBeNull();
  });
  it("finds the last free single tile", () => {
    const only = tileIndex(24, 15);
    expect(findFreeRect((i) => i !== only, 1, 1)).toEqual({ col: 24, row: 15, w: 1, h: 1 });
  });
});

describe("zoom", () => {
  it("fits the wall to the container width within limits", () => {
    expect(fitCellPx(360)).toBe(Math.floor((360 - 48) / 25));
    expect(fitCellPx(100)).toBe(12);
    expect(fitCellPx(5000)).toBe(44);
    expect(fitCellPx(Number.NaN)).toBe(12);
  });
  it("steps through levels and back to fit", () => {
    const fit = 12;
    let z: number | null = null;
    const seen: (number | null)[] = [];
    for (let i = 0; i < 8; i++) {
      z = zoomStep(z, fit, 1);
      seen.push(z);
    }
    expect(seen.slice(0, 5)).toEqual([...ZOOM_LEVELS]);
    expect(seen[7]).toBe(56);
    expect(canZoomIn(56, fit)).toBe(false);
    expect(canZoomIn(null, fit)).toBe(true);
    expect(zoomStep(56, fit, -1)).toBe(44);
    expect(zoomStep(20, fit, -1)).toBeNull();
    expect(zoomStep(null, fit, -1)).toBeNull();
    expect(canZoomOut(null)).toBe(false);
    expect(canZoomOut(28)).toBe(true);
  });
  it("zooming in from a wide fit skips levels that are not larger", () => {
    expect(zoomStep(null, 40, 1)).toBe(44);
    expect(zoomStep(null, 44, 1)).toBe(56);
    expect(zoomStep(44, 40, -1)).toBeNull();
  });
});

describe("blockContent", () => {
  it("shows only an initial in small blocks and the label when it fits", () => {
    expect(blockContent(1, 1, 13)).toBe("initial");
    expect(blockContent(1, 1, 44)).toBe("initial");
    expect(blockContent(2, 1, 13)).toBe("initial");
    expect(blockContent(2, 1, 28)).toBe("label");
    expect(blockContent(3, 3, 28)).toBe("label-avatar");
  });
});
