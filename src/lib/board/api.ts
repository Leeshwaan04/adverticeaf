/**
 * The single entry point the Board UI talks to. It picks the adapter from BOARD_MODE and adds the one thing
 * that is always browser-local: which listings this browser created or paid for ("my listings").
 */
import { BOARD_MODE } from "./config";
import { demoAdapter } from "./demo";
import { httpAdapter } from "./http";
import { checkListingUrl } from "./listing";
import { createStore } from "./store";
import type { BoardAdapter, BoardApi, ListingDetail } from "./types";

const adapter: BoardAdapter = BOARD_MODE === "live" ? httpAdapter : demoAdapter;

export const MINE_KEY = "adv-board-mine-v1";
const MAX_MINE = 50;

const mineStore = createStore<string[]>(MINE_KEY, () => []);

/** Stored data can be edited by the user, so only keep plain non-empty strings. */
function readMine(): string[] {
  const raw: unknown = mineStore.get();
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 200).slice(0, MAX_MINE);
}

function remember(domain: string) {
  const current = readMine();
  if (current[0] === domain) return;
  mineStore.set([domain, ...current.filter((d) => d !== domain)].slice(0, MAX_MINE));
}

export const api: BoardApi = {
  ...adapter,

  async purchaseBid(req, idempotencyKey) {
    const result = await adapter.purchaseBid(req, idempotencyKey);
    if (result.ok) {
      if (result.listing) {
        remember(result.listing.domain);
      } else {
        // Redirecting to a hosted payment page: remember the key now, since this page is about to unload.
        const key = req.domain ?? (req.newListing ? checkListingUrl(req.newListing.url) : null);
        if (typeof key === "string") remember(key);
        else if (key && key.ok) remember(key.key);
      }
    }
    return result;
  },

  async getMine() {
    return readMine();
  },

  async getMyListings() {
    const found = await Promise.all(readMine().map((d) => adapter.getListing(d).catch(() => null)));
    return found.filter((d): d is ListingDetail => d !== null);
  },

  subscribe(cb) {
    const a = adapter.subscribe(cb);
    const b = mineStore.subscribe(cb);
    return () => {
      a();
      b();
    };
  },
};
