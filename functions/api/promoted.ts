import type { Env } from "../_lib/env";
import { json } from "../_lib/http";
import { activePromo, listPromos } from "../_lib/ledger";

/** GET /api/promoted : the paid Spotlight that is live right now (public, briefly cached). */
export const onRequestGet = async ({ env }: { env: Env }): Promise<Response> => {
  if (!env.PAYMENTS) return json({ ok: true, active: null, queued: 0 }, 200, { "Cache-Control": "public, max-age=30" });
  try {
    const now = Date.now();
    const { active, queued } = activePromo(await listPromos(env.PAYMENTS), now);
    return json(
      {
        ok: true,
        queued,
        active: active && {
          orderId: active.promo.orderId,
          startsAt: active.startsAt,
          endsAt: active.endsAt,
          mode: active.promo.mode,
          campaign: active.promo.campaign,
        },
      },
      200,
      { "Cache-Control": "public, max-age=15" },
    );
  } catch {
    return json({ ok: false, error: { code: "internal", message: "Could not load." } }, 500);
  }
};
