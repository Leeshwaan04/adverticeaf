import type { Env } from "./env";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...BASE_HEADERS, ...extra } });
}

/** Browsers always send Origin on cross-origin and POST fetches. Reject anything not from this site. */
export function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  const allowed = new Set<string>([new URL(request.url).origin, "https://adverticeaf.com", "https://www.adverticeaf.com"]);
  for (const o of (env.ALLOWED_ORIGINS ?? "").split(",")) if (o.trim()) allowed.add(o.trim());
  // Cloudflare Pages preview deployments of this project.
  if (/^https:\/\/[a-z0-9-]+\.adverticeaf\.pages\.dev$/.test(origin)) return true;
  return allowed.has(origin);
}

export async function readJson<T = unknown>(request: Request, maxBytes = 20_000): Promise<T> {
  const type = request.headers.get("Content-Type") ?? "";
  if (!type.toLowerCase().includes("application/json")) throw new HttpError(415, "unsupported_media_type", "Send JSON.");
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "payload_too_large", "Request is too large.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body is not valid JSON.");
  }
}

export class RazorpayError extends Error {
  constructor(
    public status: number,
    public code: string,
    public description: string,
  ) {
    super(`Razorpay ${status} ${code}`);
  }
}

/** Wrap a handler: consistent JSON errors, no stack traces or upstream details leaked to the client. */
export function handle(fn: (request: Request, env: Env) => Promise<Response>) {
  return async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
    try {
      return await fn(request, env);
    } catch (e) {
      if (e instanceof HttpError) return json({ ok: false, error: { code: e.code, message: e.message } }, e.status);
      if (e instanceof RazorpayError) {
        // Log the upstream reason server-side only.
        console.error("razorpay_error", e.status, e.code, e.description);
        const auth = e.status === 401;
        return json(
          { ok: false, error: { code: auth ? "gateway_auth" : "gateway_error", message: auth ? "Payments are not configured correctly." : "The payment provider rejected the request." } },
          auth ? 503 : 502,
        );
      }
      console.error("unhandled_error", e instanceof Error ? e.message : "unknown");
      return json({ ok: false, error: { code: "internal", message: "Something went wrong. You have not been charged." } }, 500);
    }
  };
}
