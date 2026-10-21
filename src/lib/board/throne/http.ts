/**
 * Live adapter: talks to BOARD_API_BASE. Contract in docs/board-api-throne.md.
 * Server JSON is untrusted: every response goes through the parsers in parse.ts, and a checkoutUrl is only
 * returned when it is https. The final state of a purchase is set by the payment webhook on the server.
 */
import { BOARD_API_BASE } from "@/lib/board/config";
import { checkEmail, checkThresholdCents, priceChangedMessage } from "./rules";
import { parseError, parseLeaderboard, parseReigns, parseTake, parseThroneView } from "./parse";
import type { AlertResult, TakeErrorCode, TakeRequest, TakeResult, ThroneApi, TimeWindow } from "./types";

const TIMEOUT_MS = 15_000;
const POLL_MS = 15_000;

class HttpFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

const GENERIC_LOAD_ERROR = "Could not reach the Throne. Check your connection and try again.";

async function call(path: string, init: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> } = {}): Promise<unknown> {
  if (!BOARD_API_BASE) throw new HttpFailure("The Throne is not connected to a server yet.", 0, null);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BOARD_API_BASE}${path}`, {
      method: init.method ?? "GET",
      credentials: "omit",
      signal: ctl.signal,
      headers: { Accept: "application/json", ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}), ...init.headers },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON body: handled by the status check below */
    }
    if (!res.ok) throw new HttpFailure(`HTTP ${res.status}`, res.status, json);
    return json;
  } catch (e) {
    if (e instanceof HttpFailure) throw e;
    throw new HttpFailure(GENERIC_LOAD_ERROR, 0, null); // network, CORS, timeout, abort
  } finally {
    clearTimeout(timer);
  }
}

const loadError = (e: unknown) => (e instanceof HttpFailure && e.status === 0 ? e.message : GENERIC_LOAD_ERROR);

const KNOWN: readonly TakeErrorCode[] = ["price_changed", "already_holder", "invalid_listing", "invalid_request", "terms_required", "payment_failed", "rate_limited"];

const FIXED_MESSAGES: Partial<Record<TakeErrorCode, string>> = {
  already_holder: "This listing already holds the throne. You can take it back after someone else does.",
  terms_required: "Please accept the rules and refund policy to continue.",
  payment_failed: "The payment did not go through and nothing was charged. Check your details or try another card.",
  rate_limited: "Too many attempts. Please wait a minute and try again.",
  invalid_request: "That request was not valid. Reload the page and try again.",
};

function takeFailure(e: unknown): TakeResult {
  if (!(e instanceof HttpFailure) || e.status === 0) {
    return {
      ok: false,
      code: "network",
      error: "We could not confirm whether your payment went through. Check the throne before trying again. If you retry now you will not be charged twice.",
    };
  }
  const parsed = parseError(e.body);
  const fromStatus: TakeErrorCode = e.status === 402 ? "payment_failed" : e.status === 429 ? "rate_limited" : e.status >= 500 ? "server" : "invalid_request";
  const code = (KNOWN as readonly string[]).includes(parsed.code ?? "") ? (parsed.code as TakeErrorCode) : fromStatus;
  if (code === "price_changed") {
    return {
      ok: false,
      code,
      error: parsed.currentPriceCents ? priceChangedMessage(parsed.currentPriceCents) : "The price changed while you were checking out. Nothing was charged.",
      ...(parsed.currentPriceCents ? { currentPriceCents: parsed.currentPriceCents } : {}),
    };
  }
  if (code === "invalid_listing") {
    return { ok: false, code, error: parsed.message ?? "Check the listing details and try again." };
  }
  return { ok: false, code, error: FIXED_MESSAGES[code] ?? "Something went wrong on our side and nothing was charged. Please try again." };
}

// Live updates by polling. One timer shared by every subscriber, paused while the tab is hidden.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
const fire = () => {
  if (typeof document === "undefined" || !document.hidden) listeners.forEach((l) => l());
};

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (listeners.size === 1 && typeof window !== "undefined") {
    timer = setInterval(fire, POLL_MS);
    document.addEventListener("visibilitychange", fire);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", fire);
    }
  };
}

async function postAlert(path: string, body: unknown): Promise<AlertResult> {
  try {
    await call(path, { method: "POST", body });
    return { ok: true };
  } catch (e) {
    if (e instanceof HttpFailure && e.status > 0) {
      const msg = parseError(e.body).message;
      return { ok: false, error: msg && e.status < 500 ? msg : "We could not save that alert. Please try again." };
    }
    return { ok: false, error: GENERIC_LOAD_ERROR };
  }
}

export const httpApi: ThroneApi = {
  async getThrone() {
    const sentAt = Date.now();
    const json = await call("/throne").catch((e) => {
      throw new Error(loadError(e));
    });
    const view = parseThroneView(json, sentAt, Date.now());
    if (!view) throw new Error("The server sent a response we could not read. Please try again later.");
    return view;
  },

  async purchaseTake(req: TakeRequest): Promise<TakeResult> {
    let json: unknown;
    try {
      json = await call("/throne/take", {
        method: "POST",
        headers: { "Idempotency-Key": req.idempotencyKey },
        body: {
          listing: req.listing,
          expectedPriceCents: req.expectedPriceCents,
          acceptedTerms: req.acceptedTerms,
          returnUrl: req.returnUrl,
          cancelUrl: req.cancelUrl,
        },
      });
    } catch (e) {
      return takeFailure(e);
    }
    const parsed = parseTake(json);
    // A success we cannot read is treated like a lost response: the same key is safe to retry.
    if (!parsed) return takeFailure(new HttpFailure("unreadable", 0, null));
    return { ok: true, ...parsed };
  },

  async getReigns(limit: number) {
    const n = Math.max(1, Math.min(100, Math.floor(limit) || 1));
    const json = await call(`/throne/reigns?limit=${n}`).catch((e) => {
      throw new Error(loadError(e));
    });
    const reigns = parseReigns(json);
    if (!reigns) throw new Error("The server sent a response we could not read. Please try again later.");
    return reigns;
  },

  async getTimeLeaderboard(window: TimeWindow) {
    const json = await call(`/throne/leaderboard?window=${window}`).catch((e) => {
      throw new Error(loadError(e));
    });
    const board = parseLeaderboard(json, window);
    if (!board) throw new Error("The server sent a response we could not read. Please try again later.");
    return board;
  },

  async setPriceAlert(email: string, thresholdCents: number) {
    const bad = checkEmail(email) ?? checkThresholdCents(Number.isInteger(thresholdCents) ? thresholdCents : null);
    if (bad) return { ok: false as const, error: bad };
    return postAlert("/throne/alerts/price", { email: email.trim(), thresholdCents });
  },

  async setTakeoverAlert(email: string) {
    const bad = checkEmail(email);
    if (bad) return { ok: false as const, error: bad };
    return postAlert("/throne/alerts/takeover", { email: email.trim() });
  },

  subscribe,
};
