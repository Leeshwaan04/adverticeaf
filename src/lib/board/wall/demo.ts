/**
 * Demo adapter: the whole wall runs in this browser against a localStorage store, seeded with SAMPLE blocks.
 * The payment is simulated. Nothing leaves the device.
 *
 * Purchases are atomic: availability, price and style are all checked against one read of the store and the
 * write happens in the same synchronous step, so two purchases of the same tile cannot both succeed.
 */
import { WALL } from "../config";
import { createStore, delay, uid, type Store } from "../store";
import { validateListing } from "../listing";
import { parseBlocks } from "./parse";
import { evaluatePurchase, quoteSelection, soldCount, takenSet } from "./rules";
import { sampleBlocks } from "./seed";
import type { WallApi, WallBlock, WallOrder, WallPurchaseRequest, WallPurchaseResult, WallQuote, WallSnapshot } from "./types";

export interface DemoState {
  v: 1;
  blocks: WallBlock[];
}

export interface DemoOptions {
  storageKey?: string;
  /** Simulated network latency in ms. Tests pass 0. */
  latencyMs?: number;
  now?: () => number;
  store?: Store<DemoState>;
}

export const DEMO_STORAGE_KEY = "adv-board-wall-demo-v1";

export function createDemoWallApi(opts: DemoOptions = {}): WallApi & { reset(): void } {
  const latency = opts.latencyMs ?? 450;
  const now = opts.now ?? Date.now;
  const store: Store<DemoState> =
    opts.store ?? createStore<DemoState>(opts.storageKey ?? DEMO_STORAGE_KEY, () => ({ v: 1, blocks: sampleBlocks(now()) }));
  /** Completed purchases by idempotency key, so a replayed request returns the same block instead of charging twice. */
  const completed = new Map<string, WallPurchaseResult>();

  /** Re-validate whatever is in storage: it may be from an older version or hand edited. */
  function blocks(): WallBlock[] {
    const raw = store.get() as Partial<DemoState> | null;
    return parseBlocks(raw?.blocks);
  }

  async function wait(ms: number) {
    if (ms > 0) await delay(ms);
  }

  return {
    async getWall(): Promise<WallSnapshot> {
      await wait(Math.round(latency / 2));
      const b = blocks();
      return { cols: WALL.cols, rows: WALL.rows, blocks: b, generatedAt: now(), mode: "demo" };
    },

    async quoteTiles(tiles: number[]): Promise<WallQuote> {
      await wait(Math.round(latency / 4));
      const b = blocks();
      return quoteSelection(soldCount(b), tiles, takenSet(b));
    },

    async purchaseTiles(req: WallPurchaseRequest): Promise<WallPurchaseResult> {
      await wait(latency);
      const replay = req.idempotencyKey ? completed.get(req.idempotencyKey) : undefined;
      if (replay) return replay;

      if (!req.acceptedTerms) return { ok: false, code: "terms", error: "Please accept the Board rules and refund policy to continue." };

      const check = validateListing({ ...req.listing });
      const firstError = Object.values(check.errors)[0];
      if (firstError || !check.url) {
        return { ok: false, code: "invalid_listing", error: firstError ?? "Check the listing details and try again." };
      }

      // One consistent read, one write, no await in between: this is the atomic step.
      const current = blocks();
      const verdict = evaluatePurchase({
        soldCount: soldCount(current),
        taken: takenSet(current),
        tiles: req.tiles,
        label: req.label,
        color: req.color,
        expectedTotalCents: req.expectedTotalCents,
      });
      if (!verdict.ok) return verdict;

      const at = now();
      const block: WallBlock = {
        id: uid("blk"),
        rect: verdict.rect,
        label: req.label.trim(),
        color: req.color,
        listing: {
          domain: check.url.key,
          name: req.listing.name.trim(),
          url: check.url.url,
          category: req.listing.category,
          tagline: req.listing.tagline.trim(),
          createdAt: at,
          verified: false,
        },
        paidCents: verdict.totalCents,
        at,
      };
      store.set({ v: 1, blocks: [...current, block] });

      const result: WallPurchaseResult = { ok: true, block };
      if (req.idempotencyKey) completed.set(req.idempotencyKey, result);
      return result;
    },

    async getOrder(): Promise<WallOrder> {
      return { status: "not_found", message: "Orders are only tracked in live mode." };
    },

    subscribe: (cb) => store.subscribe(cb),

    reset: () => store.reset(),
  };
}
