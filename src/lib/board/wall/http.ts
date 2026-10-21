/**
 * Live adapter: talks to the Board API at BOARD_API_BASE. See docs/board-api-wall.md for the contract.
 * All JSON is parsed defensively (parse.ts). A checkoutUrl is only ever returned if it is https.
 */
import { parseOrder, parsePurchase, parseQuote, parseSnapshot, isRecord, cleanText, isErrorCode } from "./parse";
import type { WallApi, WallErrorCode, WallOrder, WallPurchaseRequest, WallPurchaseResult, WallQuote, WallSnapshot } from "./types";

export interface HttpOptions {
  fetchImpl?: typeof fetch;
  /** Milliseconds between background refreshes while the page is visible. 0 turns polling off. */
  pollMs?: number;
  timeoutMs?: number;
}

type Raw = { status: number; json: unknown } | { status: 0; json: null };

const NETWORK_ERROR =
  "We could not reach the server. If you were buying, check the wall before trying again. Retrying is safe: the request carries an idempotency key, so you will not be charged twice.";

const STATUS_CODE: Record<number, WallErrorCode> = {
  400: "invalid_selection",
  409: "tile_taken",
  422: "invalid_listing",
  429: "rate_limited",
};

export function createHttpWallApi(base: string, opts: HttpOptions = {}): WallApi {
  const doFetch = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const pollMs = opts.pollMs ?? 20_000;
  const root = base.replace(/\/$/, "");

  async function call(path: string, init?: RequestInit): Promise<Raw> {
    if (!root) return { status: 0, json: null };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await doFetch(`${root}${path}`, {
        ...init,
        signal: ctl.signal,
        headers: { Accept: "application/json", ...(init?.headers ?? {}) },
        credentials: "omit",
        redirect: "error",
      });
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { status: res.status, json };
    } catch {
      return { status: 0, json: null };
    } finally {
      clearTimeout(timer);
    }
  }

  const unreachable = (): Error => new Error(root ? "We could not load the wall. Check your connection and try again." : "The Board is not configured yet.");

  /** Pick a code and message for a non-2xx answer, trusting the body only if it has the documented shape. */
  function errorFrom(raw: Raw): { code: WallErrorCode; error: string } {
    if (raw.status === 0) return { code: "unavailable", error: root ? NETWORK_ERROR : "The Board is not configured yet. Nothing was charged." };
    if (isRecord(raw.json) && typeof raw.json.error === "string") {
      const code = isErrorCode(raw.json.code) ? raw.json.code : (STATUS_CODE[raw.status] ?? "unavailable");
      return { code, error: cleanText(raw.json.error, 300) || "The request could not be completed." };
    }
    const code = STATUS_CODE[raw.status] ?? "unavailable";
    if (code === "rate_limited") return { code, error: "Too many requests. Wait a moment and try again." };
    if (raw.status >= 500) {
      return { code: "unavailable", error: "The server had a problem. If you were buying, check the wall before trying again. Retrying is safe." };
    }
    return { code, error: "The request could not be completed." };
  }

  return {
    async getWall(): Promise<WallSnapshot> {
      const raw = await call("/wall");
      if (raw.status < 200 || raw.status >= 300) throw unreachable();
      return parseSnapshot(raw.json, "live");
    },

    async quoteTiles(tiles: number[]): Promise<WallQuote> {
      const raw = await call("/wall/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiles }),
      });
      if (raw.status >= 200 && raw.status < 300) return parseQuote(raw.json);
      // A 4xx with a documented body (for example 409 tile_taken) is a normal "no", not a crash.
      return { ok: false, ...errorFrom(raw) };
    },

    async purchaseTiles(req: WallPurchaseRequest): Promise<WallPurchaseResult> {
      const { idempotencyKey, ...body } = req;
      const raw = await call("/wall/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      });
      if (raw.status >= 200 && raw.status < 300) return parsePurchase(raw.json);
      return { ok: false, ...errorFrom(raw) };
    },

    async getOrder(orderId: string): Promise<WallOrder> {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(orderId)) return { status: "not_found" };
      const raw = await call(`/wall/orders/${encodeURIComponent(orderId)}`);
      if (raw.status === 404) return { status: "not_found" };
      if (raw.status < 200 || raw.status >= 300) throw unreachable();
      return parseOrder(raw.json);
    },

    subscribe(cb: () => void): () => void {
      if (typeof document === "undefined" || pollMs <= 0) return () => {};
      const tick = () => {
        if (document.visibilityState === "visible") cb();
      };
      const id = setInterval(tick, pollMs);
      document.addEventListener("visibilitychange", tick);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", tick);
      };
    },
  };
}
