import {
  BOARD_CATEGORIES, FULL_PATH_HOSTS, PATH_KEYED_HOSTS, RULES, SHORTENER_HOSTS, TRACKING_PARAMS, type BoardCategory,
} from "./config";

export type UrlCheck = { ok: true; url: string; key: string; host: string } | { ok: false; error: string };

const ADULT_TLDS = ["xxx", "porn", "sex", "adult", "sexy"];
const INVITE_RULES: { host: string; pathStarts?: string[] }[] = [
  { host: "discord.gg" },
  { host: "discord.com", pathStarts: ["/invite"] },
  { host: "discordapp.com", pathStarts: ["/invite"] },
  { host: "chat.whatsapp.com" },
  { host: "t.me", pathStarts: ["/+", "/joinchat"] },
  { host: "signal.group" },
  { host: "line.me", pathStarts: ["/ti/g"] },
];

const bare = (host: string) => host.replace(/^(www|m|mobile)\./, "");
const hostIs = (host: string, target: string) => host === target || host.endsWith(`.${target}`);

/**
 * Validate and normalise a listing URL. This is the product's first moderation gate:
 * it blocks shorteners, invite links, adult domains, IPs and credentials, and strips tracking parameters
 * so a listing's identity (the key) is stable and cannot be duplicated by varying the query string.
 */
export function checkListingUrl(input: string): UrlCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Enter the link people should visit." };
  if (/\s/.test(raw)) return { ok: false, error: "A link cannot contain spaces." };

  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, error: "That does not look like a valid link. Try yourbrand.com." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "Only http and https links are allowed." };
  if (u.username || u.password) return { ok: false, error: "Links with a username or password are not allowed." };

  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, error: "Use a public website address, like yourbrand.com." };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return { ok: false, error: "IP addresses are not allowed. Use a domain name." };
  if (host.endsWith(".onion")) return { ok: false, error: "That kind of address is not allowed." };

  const tld = host.split(".").pop() ?? "";
  if (ADULT_TLDS.includes(tld)) return { ok: false, error: "Adult sites are not allowed on the Board." };
  if (SHORTENER_HOSTS.some((s) => hostIs(host, s))) return { ok: false, error: "Link shorteners are not allowed. Use your full destination link." };

  const path = u.pathname || "/";
  for (const r of INVITE_RULES) {
    if (hostIs(host, r.host) && (!r.pathStarts || r.pathStarts.some((p) => path.toLowerCase().startsWith(p)))) {
      return { ok: false, error: "Group-chat invite links are not allowed. Link to a public page instead." };
    }
  }

  // Strip tracking parameters and fragments so the same destination always has the same identity.
  for (const k of Array.from(u.searchParams.keys())) {
    if (k.toLowerCase().startsWith("utm_") || (TRACKING_PARAMS as readonly string[]).includes(k.toLowerCase())) u.searchParams.delete(k);
  }
  u.hash = "";
  if (u.port && ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80"))) u.port = "";
  const search = u.searchParams.toString();
  const cleanPath = path === "/" ? "" : path.replace(/\/$/, "");
  const url = `${u.protocol}//${u.host}${cleanPath}${search ? `?${search}` : ""}`;

  const h = bare(host);
  const segments = path.split("/").filter(Boolean);
  let key = h;
  if ((PATH_KEYED_HOSTS as readonly string[]).some((p) => hostIs(h, p))) {
    const root = (PATH_KEYED_HOSTS as readonly string[]).find((p) => hostIs(h, p)) as string;
    if (segments.length === 0) {
      return { ok: false, error: `Link to your page on ${root} (for example ${root}/yourname), not the ${root} home page.` };
    }
    key = `${root}/${segments[0].toLowerCase().replace(/^@/, "")}`;
  } else if ((FULL_PATH_HOSTS as readonly string[]).some((p) => hostIs(h, p))) {
    if (segments.length === 0) return { ok: false, error: "Link to your specific app page, not the store home page." };
    key = `${h}/${segments.join("/").toLowerCase()}`;
  }
  return { ok: true, url, key, host: h };
}

export interface ListingFields {
  url: string;
  name: string;
  tagline: string;
  category: BoardCategory | "";
}
export type ListingErrors = Partial<Record<keyof ListingFields, string>>;

const CONTROL = /[\u0000-\u001f\u007f​-\u200F\u202A-\u202E⁠﻿]/;

/** Name and tagline are text, not links: no URLs, no control or direction-override characters. */
export function checkText(value: string, label: string, max: number, min = 2): string | undefined {
  const v = value.trim();
  if (v.length < min) return `${label} is required.`;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  if (CONTROL.test(v)) return `${label} contains characters that are not allowed.`;
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|app|xyz|lol)\b)/i.test(v)) return `${label} cannot contain links. Put the link in the link field.`;
  return undefined;
}

export function validateListing(f: ListingFields): { errors: ListingErrors; url?: UrlCheck & { ok: true } } {
  const errors: ListingErrors = {};
  const urlCheck = checkListingUrl(f.url);
  if (!urlCheck.ok) errors.url = urlCheck.error;
  const n = checkText(f.name, "Name", RULES.nameMax);
  if (n) errors.name = n;
  const t = checkText(f.tagline, "Tagline", RULES.taglineMax, 3);
  if (t) errors.tagline = t;
  if (!f.category || !(BOARD_CATEGORIES as readonly string[]).includes(f.category)) errors.category = "Choose a category.";
  return { errors, url: urlCheck.ok ? urlCheck : undefined };
}

export const EMPTY_LISTING: ListingFields = { url: "", name: "", tagline: "", category: "" };
