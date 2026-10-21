/**
 * Demo adapter: runs entirely in the browser. Bookings live in localStorage, sample bookings are generated
 * (see samples.ts), and the payment is SIMULATED. No money moves and nothing is published anywhere.
 *
 * A purchase validates and commits inside one synchronous store update, so two purchases racing for the
 * same hour cannot both succeed. Retrying with the same idempotency key returns the original order.
 */
import { SPONSOR } from "@/lib/board/config";
import { checkText } from "@/lib/board/listing";
import { createStore, delay, uid, type Store } from "@/lib/board/store";
import {
  DAY_MS, HEADLINE_MAX, UNIT_MS, checkUnits, cheapestOpenCents, dayStart, horizon, hourStart, quoteCart, unitStart, validateBooking,
} from "./rules";
import { sampleDayBooking, sampleHourBooking } from "./samples";
import type {
  Booking, Calendar, CurrentPlacement, Order, OrderResult, PlacementListing, PurchaseDaysRequest, PurchaseErrorCode, PurchaseResult,
  PurchaseSlotsRequest, SpotlightApi, UnitKind,
} from "./types";

interface StoredOrder {
  key: string;
  order: Order;
}

interface DemoState {
  v: 1;
  hours: Booking[];
  days: Booking[];
  orders: StoredOrder[];
}

export interface DemoOptions {
  storeKey?: string;
  /** Simulated network and payment latency. */
  latencyMs?: number;
  now?: () => number;
}

const MAX_RANGE_MS = 31 * DAY_MS;
const MAX_STORED_ORDERS = 50;

const fail = (code: PurchaseErrorCode, error: string, conflicts?: number[]): PurchaseResult => ({ ok: false, code, error, ...(conflicts?.length ? { conflicts } : {}) });

function normaliseState(s: DemoState): DemoState {
  return { v: 1, hours: Array.isArray(s?.hours) ? s.hours : [], days: Array.isArray(s?.days) ? s.days : [], orders: Array.isArray(s?.orders) ? s.orders : [] };
}

export function createDemoSpotlight(opts: DemoOptions = {}): SpotlightApi & { store: Store<DemoState> } {
  const latency = opts.latencyMs ?? 600;
  const now = opts.now ?? (() => Date.now());
  const store = createStore<DemoState>(opts.storeKey ?? "adverticeaf.board.spotlight.demo.v1", () => ({ v: 1, hours: [], days: [], orders: [] }));
  const state = () => normaliseState(store.get());

  const sample = (kind: UnitKind) => (kind === "hour" ? sampleHourBooking : sampleDayBooking);

  /** Booking holding a unit, whether a sample or one made in this browser. */
  function bookingAt(kind: UnitKind, start: number): Booking | null {
    const s = state();
    const mine = (kind === "hour" ? s.hours : s.days).find((b) => b.start === start);
    return mine ?? sample(kind)(start);
  }

  function bookedSet(kind: UnitKind, units: readonly number[]): Set<number> {
    const out = new Set<number>();
    for (const u of units) if (typeof u === "number" && bookingAt(kind, u)) out.add(u);
    return out;
  }

  function calendar(kind: UnitKind, rangeStart: number, rangeEnd: number): Calendar {
    const step = UNIT_MS[kind];
    const start = unitStart(kind, Math.max(0, rangeStart));
    const end = Math.min(rangeEnd, start + MAX_RANGE_MS);
    const bookings: Booking[] = [];
    for (let t = start; t < end; t += step) {
      const b = bookingAt(kind, t);
      if (b) bookings.push(b);
    }
    return { kind, rangeStart: start, rangeEnd: end, bookings, generatedAt: now() };
  }

  function current(kind: UnitKind): CurrentPlacement {
    const t = now();
    const start = unitStart(kind, t);
    const booked = new Set<number>();
    const { end } = horizon(kind, t);
    for (let u = start + UNIT_MS[kind]; u < end; u += UNIT_MS[kind]) if (bookingAt(kind, u)) booked.add(u);
    return { kind, start, booking: bookingAt(kind, start), fromCents: cheapestOpenCents(kind, t, booked) };
  }

  function resolveListing(kind: UnitKind, req: PurchaseSlotsRequest | PurchaseDaysRequest): { listing: PlacementListing; headline: string } | PurchaseResult {
    const headline = (req.headline ?? "").trim();
    if (req.domain && !req.listing) {
      const s = state();
      const known = [...s.hours, ...s.days].find((b) => b.listing.domain === req.domain);
      if (!known) return fail("unknown_listing", "We do not have a listing with that link. Enter your details instead.");
      const err = checkText(headline, kind === "hour" ? "Headline" : "Message", kind === "hour" ? HEADLINE_MAX : SPONSOR.taglineMax, 3);
      if (err) return fail("headline", err);
      return { listing: known.listing, headline };
    }
    if (!req.listing) return fail("listing", "Enter your link, name and headline.");
    const check = validateBooking(kind, { ...req.listing, tagline: headline });
    const firstError = check.errors.url ?? check.errors.name ?? check.errors.tagline ?? check.errors.category;
    if (firstError || !check.url) {
      return fail(check.errors.tagline && !check.errors.url && !check.errors.name ? "headline" : "listing", firstError ?? "Check your details and try again.");
    }
    return {
      headline,
      listing: { domain: check.url.key, name: req.listing.name.trim(), url: check.url.url, category: req.listing.category },
    };
  }

  async function purchase(kind: UnitKind, units: number[], req: PurchaseSlotsRequest | PurchaseDaysRequest): Promise<PurchaseResult> {
    await delay(latency);
    const t = now();

    const key = req.idempotencyKey ? `${kind}:${req.idempotencyKey}` : "";
    if (key) {
      const prior = state().orders.find((o) => o.key === key);
      if (prior) return { ok: true, orderId: prior.order.orderId, order: prior.order };
    }
    if (!req.acceptedTerms) return fail("terms", "Please accept the Board rules and refund policy to continue.");

    const resolved = resolveListing(kind, req);
    if ("ok" in resolved) return resolved;

    // Validate and commit in one synchronous block: no other purchase can interleave.
    const check = checkUnits(kind, units, t, bookedSet(kind, Array.isArray(units) ? units : []));
    if (!check.ok) return fail(check.code, check.error, check.units);

    const quote = quoteCart(kind, check.units);
    const orderId = uid("ord");
    const bookings: Booking[] = check.units.map((start) => ({ id: uid("bk"), start, listing: resolved.listing, headline: resolved.headline }));
    const order: Order = {
      orderId,
      kind,
      status: "paid",
      bookings,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
    };
    store.update((s) => {
      const next = normaliseState(s);
      if (kind === "hour") next.hours.push(...bookings);
      else next.days.push(...bookings);
      next.orders.push({ key: key || `order:${orderId}`, order });
      next.orders = next.orders.slice(-MAX_STORED_ORDERS);
      return next;
    });
    return { ok: true, orderId, order };
  }

  return {
    store,
    async getSpotlight(rangeStart, rangeEnd) {
      await delay(Math.min(latency, 250));
      return calendar("hour", hourStart(rangeStart), rangeEnd);
    },
    async getCurrentSpotlight() {
      await delay(Math.min(latency, 150));
      return current("hour");
    },
    purchaseSlots: (req) => purchase("hour", Array.isArray(req.slots) ? req.slots : [], req),
    async getSponsorDays(rangeStart, rangeEnd) {
      await delay(Math.min(latency, 250));
      const h = horizon("day", now());
      return calendar("day", dayStart(rangeStart ?? h.start), rangeEnd ?? h.end);
    },
    async getCurrentSponsor() {
      await delay(Math.min(latency, 150));
      return current("day");
    },
    purchaseSponsorDays: (req) => purchase("day", Array.isArray(req.days) ? req.days : [], req),
    async getOrder(orderId): Promise<OrderResult> {
      await delay(Math.min(latency, 150));
      const found = state().orders.find((o) => o.order.orderId === orderId);
      return found ? { ok: true, order: found.order } : { ok: false, error: "We could not find that order in this browser." };
    },
    subscribe: (cb) => store.subscribe(cb),
  };
}
