import type { Listing, NewListingInput } from "../types";

/** A rectangle of tiles. col and row are the zero-based top-left tile. */
export interface Rect {
  col: number;
  row: number;
  w: number;
  h: number;
}

/** One purchase: a single tile or a rectangle. Rendered as one merged block with one label. */
export interface WallBlock {
  id: string;
  rect: Rect;
  /** Up to WALL.labelMax characters. */
  label: string;
  /** Palette colour id, see PALETTE in rules.ts. */
  color: string;
  listing: Listing;
  /** What this purchase cost in US cents (the sum of its sequential tile prices). */
  paidCents: number;
  /** Epoch ms. */
  at: number;
  sample?: boolean;
}

export interface WallSnapshot {
  cols: number;
  rows: number;
  blocks: WallBlock[];
  generatedAt: number;
  mode: "demo" | "live";
}

export type WallErrorCode =
  | "invalid_selection"
  | "invalid_style"
  | "invalid_listing"
  | "terms"
  | "tile_taken"
  | "price_changed"
  | "rate_limited"
  | "unavailable";

export interface LadderStep {
  /** Tile index (row * cols + col). */
  index: number;
  priceCents: number;
}

export type WallQuote =
  | {
      ok: true;
      tiles: number[];
      rect: Rect;
      /** Price of each tile in the order they are charged. */
      ladder: LadderStep[];
      totalCents: number;
      /** Tiles sold right now. The first tile in the ladder costs tilePriceCents(soldCount). */
      soldCount: number;
      /** Price of the next tile after this purchase completes. */
      nextPriceCents: number;
    }
  | { ok: false; code: WallErrorCode; error: string };

export interface WallPurchaseRequest {
  /** Tile indexes: a single tile or a full rectangle of up to 25 free tiles. */
  tiles: number[];
  label: string;
  /** Palette colour id. */
  color: string;
  listing: NewListingInput;
  /** The total the buyer saw. If the real total differs the purchase is rejected. */
  expectedTotalCents: number;
  acceptedTerms: boolean;
  /** Same key = same purchase. A retry after a network failure must reuse it. Sent as the Idempotency-Key header. */
  idempotencyKey: string;
  /** Where a hosted payment page sends the buyer back to. The server appends ?order=<orderId>. */
  returnUrl?: string;
}

export type WallPurchaseResult =
  | {
      ok: true;
      /** Present when the purchase completed on site. Absent when payment continues on a hosted page. */
      block?: WallBlock;
      /** https URL of a hosted payment page. The final state is set by the payment webhook. */
      checkoutUrl?: string;
      orderId?: string;
    }
  | { ok: false; code: WallErrorCode; error: string };

export type WallOrder =
  | { status: "pending" }
  | { status: "paid"; block: WallBlock }
  | { status: "failed" | "expired" | "not_found"; message?: string };

export interface WallApi {
  getWall(): Promise<WallSnapshot>;
  quoteTiles(tiles: number[]): Promise<WallQuote>;
  purchaseTiles(request: WallPurchaseRequest): Promise<WallPurchaseResult>;
  /** Used after a hosted checkout redirect brings the buyer back with ?order=<id>. */
  getOrder(orderId: string): Promise<WallOrder>;
  subscribe(cb: () => void): () => void;
}
