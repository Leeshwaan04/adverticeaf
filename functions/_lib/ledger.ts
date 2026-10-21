import type { PromoPayload } from "./promo";

/**
 * Order and promotion ledger on Cloudflare KV. Writes are designed to be idempotent and race-free:
 * every promotion lives under its own key (promo:{orderId}) and its paid time comes from Razorpay,
 * so the webhook and the browser verification can both fulfil the same order without conflict.
 * The live schedule is computed on read (see activePromo), never stored.
 */
export interface OrderRecord {
  id: string;
  sku: string;
  amountCents: number;
  currency: string;
  status: "created" | "paid";
  createdAt: number;
  paymentId?: string;
  paidAt?: number;
  mode: "test" | "live";
}

export interface PromoRecord {
  orderId: string;
  sku: string;
  durationMs: number;
  /** Epoch ms, from the Razorpay payment, not our clock. */
  paidAt: number;
  mode: "test" | "live";
  campaign: PromoPayload;
}

const DAY = 86_400;

export async function putCreated(kv: KVNamespace, order: OrderRecord, pending?: PromoPayload) {
  await kv.put(`order:${order.id}`, JSON.stringify(order), { expirationTtl: 30 * DAY });
  if (pending) await kv.put(`pending:${order.id}`, JSON.stringify(pending), { expirationTtl: 3 * DAY });
}

export async function getOrder(kv: KVNamespace, id: string): Promise<OrderRecord | null> {
  return (await kv.get<OrderRecord>(`order:${id}`, "json")) ?? null;
}

export async function rememberIdempotency(kv: KVNamespace, key: string, value: { orderId: string; amount: number; currency: string; sku: string; hash: string }) {
  await kv.put(`idem:${key}`, JSON.stringify(value), { expirationTtl: DAY });
}
export async function recallIdempotency(kv: KVNamespace, key: string) {
  return kv.get<{ orderId: string; amount: number; currency: string; sku: string; hash: string }>(`idem:${key}`, "json");
}

/** Mark an order paid and publish its promotion. Safe to call any number of times, from any path. */
export async function fulfilPaid(
  kv: KVNamespace,
  args: { orderId: string; paymentId: string; paidAtMs: number; durationMs?: number },
): Promise<{ order: OrderRecord; alreadyPaid: boolean } | null> {
  const order = await getOrder(kv, args.orderId);
  if (!order) return null;
  if (order.status === "paid") return { order, alreadyPaid: true };

  if (args.durationMs) {
    const pending = await kv.get<PromoPayload>(`pending:${args.orderId}`, "json");
    // A paid order whose submitted content is gone cannot be published: surface it for manual handling.
    if (!pending) throw new Error(`paid order ${args.orderId} has no pending promotion payload`);
    const promo: PromoRecord = {
      orderId: args.orderId, sku: order.sku, durationMs: args.durationMs, paidAt: args.paidAtMs, mode: order.mode, campaign: pending,
    };
    await kv.put(`promo:${args.orderId}`, JSON.stringify(promo), { expirationTtl: 60 * DAY });
  }
  const paid: OrderRecord = { ...order, status: "paid", paymentId: args.paymentId, paidAt: args.paidAtMs };
  await kv.put(`order:${args.orderId}`, JSON.stringify(paid), { expirationTtl: 90 * DAY });
  return { order: paid, alreadyPaid: false };
}

export async function listPromos(kv: KVNamespace): Promise<PromoRecord[]> {
  const listed = await kv.list({ prefix: "promo:", limit: 200 });
  const rows = await Promise.all(listed.keys.map((k) => kv.get<PromoRecord>(k.name, "json")));
  return rows.filter((r): r is PromoRecord => Boolean(r));
}

export interface ActivePromo {
  promo: PromoRecord;
  startsAt: number;
  endsAt: number;
}

/**
 * Promotions run one at a time in the order they were paid for. Each starts when the previous one ends
 * (or at its paid time if the slot was free). Returns the one live at `now`, plus how many are queued.
 */
export function activePromo(promos: PromoRecord[], now: number): { active: ActivePromo | null; queued: number } {
  const sorted = [...promos].sort((a, b) => a.paidAt - b.paidAt || a.orderId.localeCompare(b.orderId));
  let cursor = 0;
  let active: ActivePromo | null = null;
  let queued = 0;
  for (const p of sorted) {
    const startsAt = Math.max(cursor, p.paidAt);
    const endsAt = startsAt + p.durationMs;
    cursor = endsAt;
    if (now >= startsAt && now < endsAt) active = { promo: p, startsAt, endsAt };
    else if (startsAt > now) queued++;
  }
  return { active, queued };
}
