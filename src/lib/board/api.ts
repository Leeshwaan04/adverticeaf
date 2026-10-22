"use client";

import { BOARD_MODE } from "./config";
import { demoAdapter } from "./demo";
import { httpAdapter } from "./http";
import { checkListingUrl } from "./listing";
import { createStore } from "./store";
import type { BoardApi, ListingDetail } from "./types";

export const MINE_KEY = "adv-board-mine-v1";
const MAX_MINE = 50;

const mineStore = createStore<string[]>(MINE_KEY, () => []);

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
  async getBoard(season, category) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.getBoard(season, category);
      } catch {
        // Fall back to client real-store
      }
    }
    return demoAdapter.getBoard(season, category);
  },

  async getListing(domain) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.getListing(domain);
      } catch {
        // Fall back
      }
    }
    return demoAdapter.getListing(domain);
  },

  async quote(input) {
    if (BOARD_MODE === "live") {
      try {
        const q = await httpAdapter.quote(input);
        if (q.ok) return q;
      } catch {
        // Fall back
      }
    }
    return demoAdapter.quote(input);
  },

  async purchaseBid(req, idempotencyKey) {
    if (BOARD_MODE === "live") {
      const result = await httpAdapter.purchaseBid(req, idempotencyKey);
      if (result.ok) {
        if (result.listing) {
          remember(result.listing.domain);
        } else {
          const key = req.domain ?? (req.newListing ? checkListingUrl(req.newListing.url) : null);
          if (typeof key === "string") remember(key);
          else if (key && key.ok) remember(key.key);
        }
      }
      return result;
    }
    const result = await demoAdapter.purchaseBid(req, idempotencyKey);
    if (result.ok) {
      if (result.listing) {
        remember(result.listing.domain);
      } else {
        const key = req.domain ?? (req.newListing ? checkListingUrl(req.newListing.url) : null);
        if (typeof key === "string") remember(key);
        else if (key && key.ok) remember(key.key);
      }
    }
    return result;
  },

  async recordClick(domain) {
    if (BOARD_MODE === "live") {
      try {
        await httpAdapter.recordClick(domain);
      } catch {
        // Fall back
      }
    }
    await demoAdapter.recordClick(domain);
  },

  async getHallOfFame() {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.getHallOfFame();
      } catch {
        // Fall back
      }
    }
    return demoAdapter.getHallOfFame();
  },

  async getActivity(limit) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.getActivity(limit);
      } catch {
        // Fall back
      }
    }
    return demoAdapter.getActivity(limit);
  },

  async getVerification(domain) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.getVerification(domain);
      } catch {
        // Fall back
      }
    }
    return demoAdapter.getVerification(domain);
  },

  async checkVerification(domain) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.checkVerification(domain);
      } catch {
        // Fall back
      }
    }
    return demoAdapter.checkVerification(domain);
  },

  async reportListing(domain, reason) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.reportListing(domain, reason);
      } catch {
        // Fall back
      }
    }
    return demoAdapter.reportListing(domain, reason);
  },

  async subscribeAlerts(domain, email) {
    if (BOARD_MODE === "live") {
      try {
        return await httpAdapter.subscribeAlerts(domain, email);
      } catch {
        // Fall back
      }
    }
    return demoAdapter.subscribeAlerts(domain, email);
  },

  subscribe(cb) {
    if (BOARD_MODE === "live") {
      return httpAdapter.subscribe(cb);
    }
    return demoAdapter.subscribe(cb);
  },

  async getMine() {
    return readMine();
  },

  async getMyListings() {
    const domains = readMine();
    if (domains.length === 0) return [];
    const results = await Promise.all(domains.map((d) => this.getListing(d)));
    return results.filter((x): x is ListingDetail => x !== null);
  },
};
