import { CAMPAIGN_CATEGORIES, CAMPAIGN_FORMATS } from "../../src/data/campaigns";

/** What a buyer submits for a paid Spotlight. Validated and cleaned on the SERVER before any money is taken. */
export interface PromoPayload {
  title: string;
  brand: string;
  agencyName: string;
  tagline: string;
  websiteUrl: string;
  category: string;
  format: string;
  theHook: string;
  theAngle: string;
  theResult: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

// Control characters, zero-width and bidirectional-override characters, and angle brackets.
const BAD_CHARS = /[\u0000-\u001f\u007f​-\u200F\u202A-\u202E⁠﻿<>]/g;

export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(BAD_CHARS, "").replace(/\s+/g, " ").trim().slice(0, max);
}

const SHORTENERS = ["bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "lnkd.in", "t.ly", "rb.gy"];
const TRACKING = ["fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid", "igshid", "yclid", "twclid", "ttclid"];
const ADULT_TLDS = ["xxx", "porn", "sex", "adult", "sexy"];

/** https only, public host, no credentials, no shorteners; tracking parameters and fragment removed. */
export function cleanHttpsUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const raw = v.trim();
  if (!raw || /\s/.test(raw) || raw.length > 300) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".onion")) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return null;
  if (ADULT_TLDS.includes(host.split(".").pop() ?? "")) return null;
  if (SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) return null;
  for (const k of Array.from(u.searchParams.keys())) {
    if (k.toLowerCase().startsWith("utm_") || TRACKING.includes(k.toLowerCase())) u.searchParams.delete(k);
  }
  u.hash = "";
  const search = u.searchParams.toString();
  return `https://${u.host}${u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "")}${search ? `?${search}` : ""}`;
}

export function parsePromoPayload(input: unknown): Result<PromoPayload> {
  if (!input || typeof input !== "object") return { ok: false, message: "Campaign details are missing." };
  const o = input as Record<string, unknown>;
  const title = cleanText(o.title, 80);
  const brand = cleanText(o.brand, 60);
  const tagline = cleanText(o.tagline, 120);
  if (title.length < 3) return { ok: false, message: "Add a title (at least 3 characters)." };
  if (brand.length < 2) return { ok: false, message: "Add the brand name." };
  if (tagline.length < 3) return { ok: false, message: "Add a short tagline." };
  const websiteUrl = cleanHttpsUrl(o.websiteUrl);
  if (!websiteUrl) return { ok: false, message: "Enter a valid https link. Shorteners, invite links and IP addresses are not allowed." };
  const category = cleanText(o.category, 40);
  const format = cleanText(o.format, 40);
  if (!(CAMPAIGN_CATEGORIES as readonly string[]).includes(category)) return { ok: false, message: "Choose a category." };
  if (!(CAMPAIGN_FORMATS as readonly string[]).includes(format)) return { ok: false, message: "Choose a format." };
  return {
    ok: true,
    value: {
      title, brand, tagline, websiteUrl, category, format,
      agencyName: cleanText(o.agencyName, 60) || brand,
      theHook: cleanText(o.theHook, 200),
      theAngle: cleanText(o.theAngle, 200),
      theResult: cleanText(o.theResult, 200),
    },
  };
}
