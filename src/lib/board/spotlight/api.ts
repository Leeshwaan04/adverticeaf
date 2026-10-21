/**
 * The one Spotlight api object. Picks the adapter from BOARD_MODE:
 *  - "demo": browser-only adapter with sample data and a simulated payment.
 *  - "live": HTTP client for BOARD_API_BASE (docs/board-api-spotlight.md).
 *  - "off": nothing should call this (the route layout and the two exported components render nothing),
 *    but if something does it gets the demo adapter's shape without touching storage until first use.
 */
import { BOARD_API_BASE, BOARD_MODE } from "@/lib/board/config";
import { createDemoSpotlight } from "./demo";
import { createHttpSpotlight } from "./http";
import type { SpotlightApi } from "./types";

export { newIdempotencyKey } from "./http";

let instance: SpotlightApi | null = null;

function build(): SpotlightApi {
  return BOARD_MODE === "live" ? createHttpSpotlight(BOARD_API_BASE) : createDemoSpotlight();
}

function get(): SpotlightApi {
  instance ??= build();
  return instance;
}

/** Lazy so that importing this module on the server (static export) never touches storage or the network. */
export const api: SpotlightApi = {
  getSpotlight: (a, b) => get().getSpotlight(a, b),
  getCurrentSpotlight: () => get().getCurrentSpotlight(),
  purchaseSlots: (r) => get().purchaseSlots(r),
  getSponsorDays: (a, b) => get().getSponsorDays(a, b),
  getCurrentSponsor: () => get().getCurrentSponsor(),
  purchaseSponsorDays: (r) => get().purchaseSponsorDays(r),
  getOrder: (id) => get().getOrder(id),
  subscribe: (cb) => get().subscribe(cb),
};

export default api;
