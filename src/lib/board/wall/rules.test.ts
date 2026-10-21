import { describe, expect, it } from "vitest";
import { WALL } from "../config";
import {
  COLS, MAX_BLOCK_TILES, PALETTE, ROWS, TOTAL_TILES, blockPriceCents, checkLabel, checkSelection, contrastRatio, deriveLabel,
  evaluatePurchase, isPaletteColor, ownerMap, priceLadder, quoteSelection, rectFromCorners, rectFromTiles, rectTiles, rectsOverlap,
  soldCount, takenSet, tileCoords, tileIndex, tileName, tilePriceCents,
} from "./rules";
import type { Rect } from "./types";

const none = new Set<number>();
const rect = (col: number, row: number, w: number, h: number): Rect => ({ col, row, w, h });

describe("grid geometry", () => {
  it("is 25 by 16 = 400 tiles", () => {
    expect(COLS).toBe(25);
    expect(ROWS).toBe(16);
    expect(TOTAL_TILES).toBe(400);
  });
  it("maps index <-> col,row at the corners and edges", () => {
    expect(tileIndex(0, 0)).toBe(0);
    expect(tileIndex(24, 0)).toBe(24);
    expect(tileIndex(0, 1)).toBe(25);
    expect(tileIndex(24, 15)).toBe(399);
    for (const i of [0, 1, 24, 25, 199, 200, 374, 399]) {
      const { col, row } = tileCoords(i);
      expect(tileIndex(col, row)).toBe(i);
    }
    expect(tileCoords(399)).toEqual({ col: 24, row: 15 });
  });
  it("names tiles one-based for people", () => {
    expect(tileName(0)).toBe("column 1, row 1");
    expect(tileName(399)).toBe("column 25, row 16");
  });
});

describe("price ladder", () => {
  it("starts at the base price and rises by the step per sold tile", () => {
    expect(tilePriceCents(0)).toBe(WALL.basePriceCents);
    expect(tilePriceCents(1)).toBe(WALL.basePriceCents + WALL.stepCents);
    expect(tilePriceCents(399)).toBe(500 + 399 * 25);
    expect(tilePriceCents(399)).toBe(10_475);
  });
  it("treats negative or fractional sold counts safely", () => {
    expect(tilePriceCents(-5)).toBe(500);
    expect(tilePriceCents(2.9)).toBe(550);
  });
  it("charges a block the SUM of sequential prices from the current sold count", () => {
    expect(priceLadder(10, 3)).toEqual([750, 775, 800]);
    expect(blockPriceCents(10, 3)).toBe(2325);
    // each tile in the cart is dearer than the last
    const l = priceLadder(0, MAX_BLOCK_TILES);
    for (let i = 1; i < l.length; i++) expect(l[i]).toBeGreaterThan(l[i - 1]);
  });
  it("matches the closed form n*base + step*(n*sold + n(n-1)/2)", () => {
    for (const [sold, n] of [[0, 1], [0, 25], [38, 4], [100, 9], [375, 25]]) {
      expect(blockPriceCents(sold, n)).toBe(n * 500 + 25 * (n * sold + (n * (n - 1)) / 2));
    }
  });
  it("one tile costs the same as the sold-count price", () => {
    expect(blockPriceCents(38, 1)).toBe(tilePriceCents(38));
  });
  it("is integer cents with no rounding", () => {
    for (let s = 0; s < 400; s += 37) expect(Number.isInteger(blockPriceCents(s, 7))).toBe(true);
  });
});

describe("rectangles", () => {
  it("lists tiles in reading order, including across row ends", () => {
    expect(rectTiles(rect(23, 0, 2, 2))).toEqual([23, 24, 48, 49]);
  });
  it("builds a rect from two corners in any order", () => {
    expect(rectFromCorners(tileIndex(5, 4), tileIndex(2, 1))).toEqual(rect(2, 1, 4, 4));
    expect(rectFromCorners(7, 7)).toEqual(rect(7, 0, 1, 1));
  });
  it("recognises exact rectangles only", () => {
    expect(rectFromTiles([5])).toEqual(rect(5, 0, 1, 1));
    expect(rectFromTiles([5, 6, 30, 31])).toEqual(rect(5, 0, 2, 2));
    expect(rectFromTiles([31, 5, 30, 6])).toEqual(rect(5, 0, 2, 2)); // order does not matter
    expect(rectFromTiles([0, 1, 25])).toBeNull(); // L shape
  });
  it("rejects gaps, duplicates, empty and out-of-range tiles", () => {
    expect(rectFromTiles([])).toBeNull();
    expect(rectFromTiles([1, 3])).toBeNull();
    expect(rectFromTiles([1, 1])).toBeNull();
    expect(rectFromTiles([-1])).toBeNull();
    expect(rectFromTiles([400])).toBeNull();
    expect(rectFromTiles([1.5])).toBeNull();
  });
  it("does not treat a row wrap as a rectangle", () => {
    // tiles 24 and 25 are adjacent in the index but on different rows and columns
    expect(rectFromTiles([24, 25])).toBeNull();
  });
  it("detects overlaps and touching edges", () => {
    expect(rectsOverlap(rect(0, 0, 3, 3), rect(2, 2, 2, 2))).toBe(true);
    expect(rectsOverlap(rect(0, 0, 3, 3), rect(3, 0, 2, 2))).toBe(false);
    expect(rectsOverlap(rect(0, 0, 3, 3), rect(0, 3, 2, 2))).toBe(false);
    expect(rectsOverlap(rect(5, 5, 1, 1), rect(5, 5, 1, 1))).toBe(true);
  });
});

describe("selection validation", () => {
  it("accepts a single tile, including each corner of the wall", () => {
    for (const t of [0, 24, 375, 399]) expect(checkSelection([t], none).ok).toBe(true);
  });
  it("accepts rectangles up to 25 tiles, in any shape", () => {
    const five = rectTiles(rect(0, 0, 5, 5));
    expect(five).toHaveLength(25);
    expect(checkSelection(five, none).ok).toBe(true);
    expect(checkSelection(rectTiles(rect(0, 0, 25, 1)), none).ok).toBe(true);
    expect(checkSelection(rectTiles(rect(0, 0, 1, 16)), none).ok).toBe(true);
  });
  it("rejects more than 25 tiles even if it is a rectangle", () => {
    const r = checkSelection(rectTiles(rect(0, 0, 13, 2)), none);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/up to 25/);
    expect(checkSelection(rectTiles(rect(0, 0, 6, 5)), none).ok).toBe(false);
    expect(MAX_BLOCK_TILES).toBe(25);
  });
  it("rejects empty, gapped and L-shaped selections", () => {
    expect(checkSelection([], none)).toMatchObject({ ok: false, code: "invalid_selection" });
    expect(checkSelection([0, 2], none)).toMatchObject({ ok: false, code: "invalid_selection" });
    expect(checkSelection([0, 1, 25], none)).toMatchObject({ ok: false, code: "invalid_selection" });
    expect(checkSelection([0, 0], none)).toMatchObject({ ok: false, code: "invalid_selection" });
  });
  it("rejects taken tiles with a precise message", () => {
    const taken = new Set([tileIndex(3, 2)]);
    const one = checkSelection([tileIndex(3, 2)], taken);
    expect(one).toMatchObject({ ok: false, code: "tile_taken" });
    if (!one.ok) expect(one.error).toContain("column 4, row 3");
    const many = checkSelection(rectTiles(rect(2, 2, 3, 1)), new Set([tileIndex(2, 2), tileIndex(4, 2)]));
    expect(many).toMatchObject({ ok: false, code: "tile_taken" });
    if (!many.ok) expect(many.error).toMatch(/^2 of those tiles/);
  });
  it("normalises tile order", () => {
    expect(checkSelection([26, 25, 1, 0], none)).toMatchObject({ ok: true, tiles: [0, 1, 25, 26] });
  });
  it("treats an adjacent owned block as an overlap only when tiles intersect", () => {
    const taken = takenSet([{ rect: rect(0, 0, 2, 2) }]);
    expect(checkSelection([2], taken).ok).toBe(true);
    expect(checkSelection([1], taken).ok).toBe(false);
    expect(checkSelection(rectTiles(rect(1, 1, 2, 2)), taken).ok).toBe(false);
  });
});

describe("quotes", () => {
  it("returns the ladder in charge order, the total and the next price", () => {
    const q = quoteSelection(38, [0, 1, 25, 26], none);
    expect(q.ok).toBe(true);
    if (q.ok) {
      expect(q.ladder.map((s) => s.priceCents)).toEqual([1450, 1475, 1500, 1525]);
      expect(q.totalCents).toBe(5950);
      expect(q.nextPriceCents).toBe(tilePriceCents(42));
      expect(q.rect).toEqual(rect(0, 0, 2, 2));
      expect(q.soldCount).toBe(38);
    }
  });
  it("propagates validation failures", () => {
    expect(quoteSelection(0, [3], new Set([3]))).toMatchObject({ ok: false, code: "tile_taken" });
  });
});

describe("palette and contrast", () => {
  it("has 12 unique colours", () => {
    expect(PALETTE).toHaveLength(12);
    expect(new Set(PALETTE.map((c) => c.id)).size).toBe(12);
    expect(new Set(PALETTE.map((c) => c.bg)).size).toBe(12);
  });
  it("computes known contrast values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
  it.each(PALETTE.map((c) => [c.id, c.bg, c.fg]))("%s text meets WCAG AA (4.5:1)", (_id, bg, fg) => {
    expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
  });
  it("only accepts palette ids", () => {
    expect(isPaletteColor("cyan")).toBe(true);
    expect(isPaletteColor("#22d3ee")).toBe(false);
    expect(isPaletteColor("red; background:url(x)")).toBe(false);
    expect(isPaletteColor(undefined)).toBe(false);
  });
});

describe("labels", () => {
  it("accepts 1 to 12 characters", () => {
    expect(checkLabel("A")).toBeUndefined();
    expect(checkLabel("x".repeat(12))).toBeUndefined();
  });
  it("rejects empty, too long, links and control characters", () => {
    expect(checkLabel("   ")).toBeTruthy();
    expect(checkLabel("x".repeat(13))).toMatch(/12 characters/);
    expect(checkLabel("shop.com")).toMatch(/links/);
    expect(checkLabel("a‮b")).toMatch(/not allowed/);
  });
  it("derives a label from a name using whole words that fit", () => {
    expect(deriveLabel("Northwind Studio (sample)")).toBe("Northwind");
    expect(deriveLabel("Oak & Ember")).toBe("Oak & Ember");
    expect(deriveLabel("Extraordinarily")).toBe("Extraordinar");
    expect(deriveLabel("Extraordinarily").length).toBeLessThanOrEqual(WALL.labelMax);
    expect(deriveLabel("   ")).toBe("");
  });
});

describe("inventory", () => {
  const blocks = [{ rect: rect(0, 0, 2, 2) }, { rect: rect(10, 3, 1, 1) }];
  it("counts sold tiles from block areas", () => {
    expect(soldCount(blocks)).toBe(5);
    expect(soldCount([])).toBe(0);
  });
  it("maps each tile to its owner", () => {
    const m = ownerMap(blocks);
    expect(m[0]).toBe(0);
    expect(m[26]).toBe(0);
    expect(m[tileIndex(10, 3)]).toBe(1);
    expect(m[2]).toBe(-1);
  });
});

describe("evaluatePurchase (atomic purchase decision)", () => {
  const base = { soldCount: 10, taken: none, tiles: [0, 1], label: "Hello", color: "cyan", expectedTotalCents: 750 + 775 };
  it("accepts a valid purchase at the expected total", () => {
    const r = evaluatePurchase(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.totalCents).toBe(1525);
  });
  it("rejects when the price rose since the buyer saw it", () => {
    const r = evaluatePurchase({ ...base, soldCount: 11 });
    expect(r).toMatchObject({ ok: false, code: "price_changed" });
    if (!r.ok) {
      expect(r.error).toContain("$15.75");
      expect(r.error).toMatch(/Nothing was charged/);
    }
  });
  it("rejects a mismatched total in either direction and non-integers", () => {
    expect(evaluatePurchase({ ...base, expectedTotalCents: 1 })).toMatchObject({ ok: false, code: "price_changed" });
    expect(evaluatePurchase({ ...base, expectedTotalCents: 99999 })).toMatchObject({ ok: false, code: "price_changed" });
    expect(evaluatePurchase({ ...base, expectedTotalCents: 1525.5 })).toMatchObject({ ok: false, code: "price_changed" });
    expect(evaluatePurchase({ ...base, expectedTotalCents: Number.NaN })).toMatchObject({ ok: false, code: "price_changed" });
  });
  it("rejects when any tile was taken, before looking at price", () => {
    const r = evaluatePurchase({ ...base, taken: new Set([1]), expectedTotalCents: 5 });
    expect(r).toMatchObject({ ok: false, code: "tile_taken" });
  });
  it("double purchase: the second buyer of the same tile is rejected", () => {
    const first = evaluatePurchase({ ...base, tiles: [7], expectedTotalCents: 750 });
    expect(first.ok).toBe(true);
    // state after the first purchase: that tile is taken and one more tile is sold
    const second = evaluatePurchase({ ...base, tiles: [7], taken: new Set([7]), soldCount: 11, expectedTotalCents: 750 });
    expect(second).toMatchObject({ ok: false, code: "tile_taken" });
  });
  it("rejects non-palette colours and bad labels", () => {
    expect(evaluatePurchase({ ...base, color: "#ff0000" })).toMatchObject({ ok: false, code: "invalid_style" });
    expect(evaluatePurchase({ ...base, label: "" })).toMatchObject({ ok: false, code: "invalid_style" });
    expect(evaluatePurchase({ ...base, label: "x".repeat(13) })).toMatchObject({ ok: false, code: "invalid_style" });
  });
  it("rejects bad shapes", () => {
    expect(evaluatePurchase({ ...base, tiles: [0, 2] })).toMatchObject({ ok: false, code: "invalid_selection" });
    expect(evaluatePurchase({ ...base, tiles: rectTiles(rect(0, 0, 6, 5)) })).toMatchObject({ ok: false, code: "invalid_selection" });
  });
  it("prices an edge-of-wall 25 tile block", () => {
    const tiles = rectTiles(rect(20, 11, 5, 5));
    expect(tiles).toContain(399);
    const total = blockPriceCents(375, 25);
    expect(evaluatePurchase({ soldCount: 375, taken: none, tiles, label: "Edge", color: "amber", expectedTotalCents: total }).ok).toBe(true);
  });
});
