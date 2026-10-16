import { SITE } from "@/lib/site";

export type LeadKind = "contact" | "agency-listing";

export type LeadResult =
  | { ok: true; mode: "sent" | "mailto" }
  | { ok: false; error: string };

/**
 * Deliver a form submission. This never reports success unless something was
 * actually handed off:
 *  1. A configured endpoint must answer with a 2xx status.
 *  2. Otherwise, if a public email is configured, open a prefilled mailto
 *     (the user still has to press send, so the UI says so).
 *  3. Otherwise fail with an honest message.
 */
export async function submitLead(
  kind: LeadKind,
  fields: Record<string, string>,
): Promise<LeadResult> {
  const subject =
    kind === "contact"
      ? `Website enquiry from ${fields.name || "a visitor"}`
      : `Agency listing request: ${fields.agency || "new agency"}`;

  if (SITE.formEndpoint) {
    try {
      const res = await fetch(SITE.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind, subject, ...fields, page: window.location.href }),
      });
      if (!res.ok) {
        return { ok: false, error: `The server could not accept this (status ${res.status}). Please try again in a moment.` };
      }
      return { ok: true, mode: "sent" };
    } catch {
      return { ok: false, error: "We could not reach the server. Check your connection and try again." };
    }
  }

  if (SITE.contactEmail) {
    const body = Object.entries(fields)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    window.location.href = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { ok: true, mode: "mailto" };
  }

  return {
    ok: false,
    error: "This form is not connected to an inbox yet, so nothing was sent. Please check back soon.",
  };
}
