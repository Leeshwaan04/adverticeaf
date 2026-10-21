/**
 * Live adapter: an HTTP client for the contract in docs/board-api-spotlight.md.
 * All server JSON is untrusted and goes through parse.ts. A hosted checkout URL is only returned if it is https.
 * The final state of a purchase is decided by the server after the payment webhook, never by this client.
 */
import { horizon } from "./rules";
import { defaultMessage, isObj, parseCalendar, parseCheckoutUrl, parseCurrent, parseError, parseOrder } from "./parse";
import type {
  OrderResult, PurchaseDaysRequest, PurchaseResult, PurchaseSlotsRequest, SpotlightApi, UnitKind,
} from "./types";

const TIMEOUT_MS = 15_000;
const POLL_MS = 30_000;

export function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

type Fetched = { kind: "ok"; status: number; json: unknown } | { kind: "network" };

export interface HttpOptions {
  fetchImpl?: typeof fetch;
}

export function createHttpSpotlight(base: string, opts: HttpOptions = {}): SpotlightApi {
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const root = base.replace(/\/$/, "");

  async function call(path: string, init: RequestInit = {}): Promise<Fetched> {
    if (!root) return { kind: "network" };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await doFetch(`${root}${path}`, {
        ...init,
        signal: ctl.signal,
        credentials: "omit",
        headers: { Accept: "application/json", ...(init.headers ?? {}) },
      });
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { kind: "ok", status: res.status, json };
    } catch {
      return { kind: "network" };
    } finally {
      clearTimeout(timer);
    }
  }

  const range = (a: number, b: number) => `?start=${encodeURIComponent(String(Math.trunc(a)))}&end=${encodeURIComponent(String(Math.trunc(b)))}`;

  async function getCalendar(kind: UnitKind, path: string, start: number, end: number) {
    const r = await call(`${path}${range(start, end)}`);
    if (r.kind === "network") throw new Error("We could not reach the booking service. Check your connection and try again.");
    const cal = r.status >= 200 && r.status < 300 ? parseCalendar(kind, r.json, { start, end }) : null;
    if (!cal) throw new Error("The calendar could not be loaded right now. Please try again.");
    return cal;
  }

  async function getCurrent(kind: UnitKind, path: string) {
    const r = await call(path);
    if (r.kind === "network") throw new Error("We could not reach the booking service.");
    const cur = r.status >= 200 && r.status < 300 ? parseCurrent(kind, r.json) : null;
    if (!cur) throw new Error("The current placement could not be loaded.");
    return cur;
  }

  async function purchase(path: string, kind: UnitKind, units: Record<string, number[]>, req: PurchaseSlotsRequest | PurchaseDaysRequest): Promise<PurchaseResult> {
    const key = req.idempotencyKey || newIdempotencyKey();
    const body: Record<string, unknown> = { ...units, headline: req.headline, acceptedTerms: req.acceptedTerms };
    if (req.domain) body.domain = req.domain;
    if (req.listing) body.listing = req.listing;
    if (req.returnUrl) body.returnUrl = req.returnUrl;

    const r = await call(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(body),
    });
    if (r.kind === "network") {
      return { ok: false, code: "network", error: `${defaultMessage("network")} If you retry, you will not be charged twice.` };
    }
    if (r.status < 200 || r.status >= 300) {
      const e = parseError(r.json, r.status);
      return { ok: false, ...e };
    }

    const json = isObj(r.json) ? r.json : {};
    if (json.checkoutUrl !== undefined) {
      const url = parseCheckoutUrl(json.checkoutUrl);
      if (!url) {
        return { ok: false, code: "server", error: "The payment page link we received was not secure, so we did not open it. Nothing was charged." };
      }
      const orderId = typeof json.orderId === "string" && json.orderId.length <= 80 ? json.orderId : "";
      return { ok: true, orderId, order: null, checkoutUrl: url };
    }
    const order = json.ok === true ? parseOrder(json.order) : null;
    if (!order || order.kind !== kind) {
      return {
        ok: false,
        code: "server",
        error: "We could not read the confirmation. Your booking may have gone through, so refresh the calendar before trying again. You will not be charged twice for the same attempt.",
      };
    }
    if (order.status === "failed" || order.status === "expired") {
      return { ok: false, code: "server", error: "The payment did not complete. Nothing was charged." };
    }
    return { ok: true, orderId: order.orderId, order };
  }

  /* One shared poll for every subscriber, only while the tab is visible. */
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  const tick = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    listeners.forEach((l) => l());
  };

  return {
    getSpotlight: (a, b) => getCalendar("hour", "/spotlight/slots", a, b),
    getCurrentSpotlight: () => getCurrent("hour", "/spotlight/current"),
    purchaseSlots: (req) => purchase("/spotlight/slots/purchase", "hour", { slots: req.slots }, req),
    getSponsorDays: (a, b) => {
      const h = horizon("day", Date.now());
      return getCalendar("day", "/spotlight/sponsor/days", a ?? h.start, b ?? h.end);
    },
    getCurrentSponsor: () => getCurrent("day", "/spotlight/sponsor/current"),
    purchaseSponsorDays: (req) => purchase("/spotlight/sponsor/purchase", "day", { days: req.days }, req),
    async getOrder(orderId): Promise<OrderResult> {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(orderId)) return { ok: false, error: "That order link is not valid." };
      const r = await call(`/spotlight/orders/${orderId}`);
      if (r.kind === "network") return { ok: false, error: "We could not reach the booking service. Please try again." };
      const order = r.status >= 200 && r.status < 300 && isObj(r.json) ? parseOrder(r.json.order) : null;
      return order ? { ok: true, order } : { ok: false, error: "We could not find that order." };
    },
    subscribe(cb) {
      listeners.add(cb);
      if (!timer) timer = setInterval(tick, POLL_MS);
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
  };
}
