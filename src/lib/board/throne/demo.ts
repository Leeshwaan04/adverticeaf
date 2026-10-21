/**
 * Demo adapter. Everything runs in the browser against a localStorage-backed store seeded with SAMPLE data.
 * The payment is SIMULATED: no money moves. The take itself is atomic: the price check, the charge and the
 * state change happen in one synchronous step against the store, so two takes can never both succeed.
 */
import { createStore, delay, uid, type Store } from "@/lib/board/store";
import { validateListing } from "@/lib/board/listing";
import type { Listing } from "@/lib/board/types";
import { applyTake, checkEmail, checkThresholdCents, timeLeaderboard } from "./rules";
import { buildSeed } from "./seed";
import type { AlertResult, Reign, TakeRequest, TakeResult, ThroneApi, ThroneData, ThroneView, TimeWindow } from "./types";

export const THRONE_STORE_KEY = "adv-board-throne-v1";
const ALERTS_STORE_KEY = "adv-board-throne-alerts-v1";
const MAX_REMEMBERED_KEYS = 50;

type TakenResult = Extract<TakeResult, { kind: "taken" }>;

interface DemoData extends ThroneData {
  v: 1;
  /** Idempotency key -> the result of the purchase it first produced. */
  receipts: Record<string, TakenResult>;
}

interface AlertData {
  v: 1;
  price: { email: string; thresholdCents: number; at: number }[];
  takeover: { email: string; at: number }[];
}

export interface DemoOptions {
  store?: Store<DemoData>;
  alertStore?: Store<AlertData>;
  now?: () => number;
  /** Simulated payment latency. Tests pass 0. */
  latencyMs?: number;
  newId?: () => string;
}

const isDemoData = (x: unknown): x is DemoData => {
  const d = x as DemoData | null;
  return !!d && d.v === 1 && Array.isArray(d.reigns) && !!d.state && typeof d.state.startPriceCents === "number" && !!d.receipts;
};

export function createDemoApi(opts: DemoOptions = {}): ThroneApi {
  const now = opts.now ?? (() => Date.now());
  const latency = opts.latencyMs ?? 700;
  const newId = opts.newId ?? (() => uid("reign"));
  const store = opts.store ?? createStore<DemoData>(THRONE_STORE_KEY, () => ({ v: 1, ...buildSeed(now()), receipts: {} }));
  const alertStore = opts.alertStore ?? createStore<AlertData>(ALERTS_STORE_KEY, () => ({ v: 1, price: [], takeover: [] }));

  /** Stored data can be stale or damaged (older version, hand edits). Fall back to a fresh sample history. */
  const read = (): DemoData => {
    const d = store.get();
    if (isDemoData(d)) return d;
    store.reset();
    return store.get();
  };

  return {
    async getThrone(): Promise<ThroneView> {
      const d = read();
      return {
        mode: "demo",
        holder: d.state.holder,
        lastTakeAt: d.state.lastTakeAt,
        startPriceCents: d.state.startPriceCents,
        clockSkewMs: 0,
        reignCount: d.reigns.length,
        generatedAt: now(),
      };
    },

    async purchaseTake(req: TakeRequest): Promise<TakeResult> {
      if (!req.acceptedTerms) return { ok: false, code: "terms_required", error: "Please accept the rules and refund policy to continue." };
      if (!req.idempotencyKey) return { ok: false, code: "invalid_request", error: "Missing request key. Reload the page and try again." };
      const checked = validateListing({ ...req.listing });
      const urlCheck = checked.url;
      if (!urlCheck || Object.keys(checked.errors).length > 0) {
        return { ok: false, code: "invalid_listing", error: Object.values(checked.errors)[0] ?? "Check the listing details." };
      }

      const replay = read().receipts[req.idempotencyKey];
      if (replay) return replay;

      await delay(latency); // simulated payment authorisation

      // Everything below is one synchronous step: nothing else can interleave.
      const d = read();
      const again = d.receipts[req.idempotencyKey];
      if (again) return again;
      const at = now();
      const known = d.reigns.filter((r) => r.listing.domain === urlCheck.key).map((r) => r.listing.createdAt);
      const listing: Listing = {
        domain: urlCheck.key,
        name: req.listing.name.trim(),
        url: urlCheck.url,
        category: req.listing.category,
        tagline: req.listing.tagline.trim(),
        createdAt: known.length ? Math.min(...known) : at,
        verified: false,
      };
      const decision = applyTake(d, { listing, expectedPriceCents: req.expectedPriceCents }, at, newId());
      if (!decision.ok) return { ok: false, code: decision.code, error: decision.error, currentPriceCents: decision.currentPriceCents };

      const result: TakenResult = { ok: true, kind: "taken", reign: decision.reign, chargedCents: decision.chargedCents, nextStartCents: decision.nextStartCents };
      const receipts = { ...d.receipts, [req.idempotencyKey]: result };
      const keys = Object.keys(receipts);
      for (const k of keys.slice(0, Math.max(0, keys.length - MAX_REMEMBERED_KEYS))) delete receipts[k];
      store.set({ ...d, ...decision.data, receipts });
      return result;
    },

    async getReigns(limit: number): Promise<Reign[]> {
      return read().reigns.slice(0, Math.max(1, Math.min(100, Math.floor(limit) || 1)));
    },

    async getTimeLeaderboard(window: TimeWindow) {
      const at = now();
      return { window, rows: timeLeaderboard(read().reigns, window, at), generatedAt: at };
    },

    async setPriceAlert(email: string, thresholdCents: number): Promise<AlertResult> {
      const e = checkEmail(email) ?? checkThresholdCents(Number.isInteger(thresholdCents) ? thresholdCents : null);
      if (e) return { ok: false, error: e };
      await delay(Math.min(latency, 400));
      alertStore.update((a) => {
        const em = email.trim().toLowerCase();
        if (!a.price.some((p) => p.email === em && p.thresholdCents === thresholdCents)) a.price.push({ email: em, thresholdCents, at: now() });
        return a;
      });
      return { ok: true };
    },

    async setTakeoverAlert(email: string): Promise<AlertResult> {
      const e = checkEmail(email);
      if (e) return { ok: false, error: e };
      await delay(Math.min(latency, 400));
      alertStore.update((a) => {
        const em = email.trim().toLowerCase();
        if (!a.takeover.some((t) => t.email === em)) a.takeover.push({ email: em, at: now() });
        return a;
      });
      return { ok: true };
    },

    subscribe: (cb) => store.subscribe(cb),
  };
}

export const demoApi: ThroneApi = createDemoApi();
