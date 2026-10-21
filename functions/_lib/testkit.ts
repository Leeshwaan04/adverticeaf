import { createHmac } from "node:crypto";
import type { Env } from "./env";

/** In-memory stand-in for a KV namespace (just what the ledger uses). */
export class FakeKV {
  store = new Map<string, string>();
  async get(key: string, type?: string) {
    const v = this.store.get(key);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
  async list({ prefix = "", limit = 1000 }: { prefix?: string; limit?: number } = {}) {
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name }));
    return { keys, list_complete: true };
  }
}

export const hmac = (secret: string, msg: string) => createHmac("sha256", secret).update(msg).digest("hex");

export function makeEnv(over: Partial<Env> & { kv?: boolean } = {}): Env & { _kv?: FakeKV } {
  const kv = over.kv === false ? undefined : new FakeKV();
  return {
    RAZORPAY_KEY_ID: "rzp_test_unitTestKey01",
    RAZORPAY_KEY_SECRET: "unit-test-secret-000000",
    RAZORPAY_WEBHOOK_SECRET: "unit-test-webhook-secret",
    RAZORPAY_CURRENCY: "USD",
    PAYMENTS: kv as unknown as KVNamespace | undefined,
    ...over,
    _kv: kv,
  } as Env & { _kv?: FakeKV };
}

export interface RzpState {
  orders: Record<string, { id: string; amount: number; currency: string; status: string; notes: Record<string, string> }>;
  payments: Record<string, { id: string; order_id: string; amount: number; currency: string; status: string; created_at: number }>;
  calls: { method: string; path: string; body?: unknown }[];
}

/** Fake Razorpay API installed as global fetch. */
export function installRazorpay(): RzpState {
  const state: RzpState = { orders: {}, payments: {}, calls: [] };
  let n = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input).replace("https://api.razorpay.com/v1", "");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    state.calls.push({ method, path: url, body });
    const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    if (method === "POST" && url === "/orders") {
      const id = `order_TEST${String(++n).padStart(10, "0")}`;
      state.orders[id] = { id, amount: body.amount, currency: body.currency, status: "created", notes: body.notes };
      return reply(state.orders[id]);
    }
    let m = url.match(/^\/orders\/(.+)$/);
    if (method === "GET" && m) return state.orders[m[1]] ? reply(state.orders[m[1]]) : reply({ error: { code: "BAD_REQUEST_ERROR", description: "not found" } }, 400);
    m = url.match(/^\/payments\/([^/]+)\/capture$/);
    if (method === "POST" && m) {
      const p = state.payments[m[1]];
      if (!p) return reply({ error: { code: "BAD_REQUEST_ERROR", description: "nf" } }, 400);
      p.status = "captured";
      return reply(p);
    }
    m = url.match(/^\/payments\/([^/]+)$/);
    if (method === "GET" && m) return state.payments[m[1]] ? reply(state.payments[m[1]]) : reply({ error: { code: "BAD_REQUEST_ERROR", description: "nf" } }, 400);
    return reply({ error: { code: "NOT_FOUND", description: "x" } }, 404);
  }) as typeof fetch;
  return state;
}

export function post(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://adverticeaf.com${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://adverticeaf.com", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export const VALID_CAMPAIGN = {
  title: "Test Campaign",
  brand: "Acme",
  tagline: "A short tagline",
  websiteUrl: "https://acme.example/launch?utm_source=x",
  category: "DTC & Consumer",
  format: "Reel / TikTok",
};
