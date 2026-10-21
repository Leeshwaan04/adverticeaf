/**
 * Server-side price list. The browser can only ASK for a sku; it never sets a price
 * (except inside a range the server enforces). Amounts are minor units (USD cents).
 */
export interface FixedItem {
  kind: "fixed";
  name: string;
  amountCents: number;
  /** Needs a place to store the result (KV ledger). Money is refused if it is not configured. */
  needsLedger: boolean;
  /** Only sellable with Razorpay TEST keys. */
  testOnly?: boolean;
  durationMs?: number;
}
export interface RangeItem {
  kind: "range";
  name: string;
  minCents: number;
  maxCents: number;
  stepCents: number;
  needsLedger: boolean;
  /** Disabled until the product it fulfils exists. */
  enabled: boolean;
}
export type CatalogItem = FixedItem | RangeItem;

const H = 3_600_000;

export const CATALOG: Record<string, CatalogItem> = {
  "test-1": { kind: "fixed", name: "Payment test", amountCents: 100, needsLedger: false, testOnly: true },
  "promo-24h": { kind: "fixed", name: "AdverticeAF Spotlight, 24 hours", amountCents: 2900, needsLedger: true, durationMs: 24 * H },
  "promo-7d": { kind: "fixed", name: "AdverticeAF Spotlight, 7 days", amountCents: 7900, needsLedger: true, durationMs: 7 * 24 * H },
  // Board bids: wired when the Board backend exists. Kept disabled so nothing can be bought without fulfilment.
  bid: { kind: "range", name: "AdverticeAF Board bid", minCents: 100, maxCents: 99_999_900, stepCents: 100, needsLedger: true, enabled: false },
};

export type PriceResult = { ok: true; item: CatalogItem; amountCents: number } | { ok: false; code: string; message: string };

export function priceFor(sku: unknown, requestedCents: unknown, opts: { testMode: boolean }): PriceResult {
  if (typeof sku !== "string" || !Object.prototype.hasOwnProperty.call(CATALOG, sku)) {
    return { ok: false, code: "unknown_sku", message: "That product does not exist." };
  }
  const item = CATALOG[sku];
  if (item.kind === "fixed") {
    if (item.testOnly && !opts.testMode) return { ok: false, code: "unknown_sku", message: "That product does not exist." };
    return { ok: true, item, amountCents: item.amountCents };
  }
  if (!item.enabled) return { ok: false, code: "unavailable", message: "This product is not available yet." };
  if (typeof requestedCents !== "number" || !Number.isInteger(requestedCents)) {
    return { ok: false, code: "invalid_amount", message: "Enter a whole-dollar amount." };
  }
  if (requestedCents < item.minCents || requestedCents > item.maxCents || requestedCents % item.stepCents !== 0) {
    return { ok: false, code: "invalid_amount", message: "That amount is outside the allowed range." };
  }
  return { ok: true, item, amountCents: requestedCents };
}
