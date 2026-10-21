"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { validateListing, type ListingFields } from "@/lib/board/listing";

/** Listings this browser has used on other Board products. Written by other parts of the Board, may be absent. */
export const MINE_KEY = "adv-board-mine-v1";
const MAX_SAVED = 5;

/**
 * Read saved listings defensively. We accept an array, or an object with a `listings` array, whose items are
 * either listing fields or `{ listing: fields }`. Anything that does not pass validateListing is dropped.
 */
export function parseMine(raw: string | null): ListingFields[] {
  if (!raw) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = Array.isArray(json) ? json : json && typeof json === "object" && Array.isArray((json as { listings?: unknown }).listings) ? (json as { listings: unknown[] }).listings : [];
  const seen = new Set<string>();
  const out: ListingFields[] = [];
  for (const item of list) {
    const src = item && typeof item === "object" && "listing" in item ? (item as { listing: unknown }).listing : item;
    if (!src || typeof src !== "object") continue;
    const o = src as Record<string, unknown>;
    const fields: ListingFields = {
      url: typeof o.url === "string" ? o.url : "",
      name: typeof o.name === "string" ? o.name : "",
      tagline: typeof o.tagline === "string" ? o.tagline : "",
      category: typeof o.category === "string" ? (o.category as ListingFields["category"]) : "",
    };
    const v = validateListing(fields);
    if (!v.url || Object.keys(v.errors).length > 0 || seen.has(v.url.key)) continue;
    seen.add(v.url.key);
    out.push({ ...fields, url: v.url.url });
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(MINE_KEY);
  } catch {
    return null;
  }
}

/** Saved listings from this browser. Empty on the server and first render, then filled in on the client. */
export function useMine(): ListingFields[] {
  const subscribe = useCallback((cb: () => void) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MINE_KEY || e.key === null) cb();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseMine(raw), [raw]);
}
