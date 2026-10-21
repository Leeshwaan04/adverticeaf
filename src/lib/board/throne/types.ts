import type { Listing, NewListingInput } from "@/lib/board/types";

/** Leaderboard windows. All boundaries are UTC. */
export type TimeWindow = "day" | "week" | "all";
export const TIME_WINDOWS: readonly { id: TimeWindow; label: string; blurb: string }[] = [
  { id: "day", label: "Today", blurb: "Since 00:00 UTC today" },
  { id: "week", label: "This week", blurb: "Since Monday 00:00 UTC" },
  { id: "all", label: "All time", blurb: "Every reign ever" },
];

/** The single seat. lastTakeAt is null only before the very first take. */
export interface ThroneState {
  holder: Listing | null;
  lastTakeAt: number | null;
  /** Price at lastTakeAt, in cents. Before the first take this is the opening price. */
  startPriceCents: number;
}

/** One continuous stretch on the throne. endedAt is null while it is ongoing. */
export interface Reign {
  id: string;
  listing: Listing;
  startedAt: number;
  endedAt: number | null;
  /** What the holder paid for this reign, in cents. */
  pricePaidCents: number;
  sample?: boolean;
}

/** Everything the rules need: the seat plus its full history, newest reign first. */
export interface ThroneData {
  state: ThroneState;
  reigns: Reign[];
}

export interface ThroneView {
  mode: "demo" | "live";
  holder: Listing | null;
  /** Start of the current reign (and the origin of the price decay). null before the first take. */
  lastTakeAt: number | null;
  startPriceCents: number;
  /** serverNow minus the browser clock at fetch time. Add to Date.now() to get server time. */
  clockSkewMs: number;
  /** Number of reigns so far, ongoing one included. */
  reignCount: number;
  generatedAt: number;
}

export interface TimeLeaderRow {
  rank: number;
  listing: Listing;
  /** Milliseconds on the throne inside the window. An ongoing reign counts up to generatedAt. */
  totalMs: number;
  /** Number of reigns that overlap the window. */
  reigns: number;
  holdingNow: boolean;
}

export interface TimeLeaderboard {
  window: TimeWindow;
  rows: TimeLeaderRow[];
  generatedAt: number;
}

export interface TakeRequest {
  listing: NewListingInput;
  /** The price the buyer saw, in cents. An upper bound: the buyer is charged the current price if it is lower. */
  expectedPriceCents: number;
  acceptedTerms: boolean;
  /** Reuse the same key when retrying the same purchase so a retry can never charge twice. */
  idempotencyKey: string;
  /** Where a hosted checkout sends the buyer afterwards. Live mode only. */
  returnUrl?: string;
  cancelUrl?: string;
}

export type TakeErrorCode =
  | "price_changed"
  | "already_holder"
  | "invalid_listing"
  | "invalid_request"
  | "terms_required"
  | "payment_failed"
  | "rate_limited"
  | "network"
  | "server";

export type TakeResult =
  | { ok: true; kind: "taken"; reign: Reign; chargedCents: number; nextStartCents: number }
  | { ok: true; kind: "redirect"; checkoutUrl: string }
  | { ok: false; code: TakeErrorCode; error: string; currentPriceCents?: number };

export type AlertResult = { ok: true } | { ok: false; error: string };

export interface ThroneApi {
  getThrone(): Promise<ThroneView>;
  purchaseTake(request: TakeRequest): Promise<TakeResult>;
  /** Newest first, the ongoing reign included. */
  getReigns(limit: number): Promise<Reign[]>;
  getTimeLeaderboard(window: TimeWindow): Promise<TimeLeaderboard>;
  /** Email me when the price falls to or below thresholdCents. */
  setPriceAlert(email: string, thresholdCents: number): Promise<AlertResult>;
  /** Email me whenever someone takes the throne. */
  setTakeoverAlert(email: string): Promise<AlertResult>;
  /** Called after any change. Returns an unsubscribe function. */
  subscribe(cb: () => void): () => void;
}
