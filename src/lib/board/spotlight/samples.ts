/**
 * SAMPLE bookings for the demo adapter. They are generated deterministically from the slot or day start,
 * so there is always sample data in the visible window no matter when the demo is opened, and the same slot
 * always has the same sample. Every name carries "(sample)" and every domain is under the reserved .example TLD.
 */
import { SPONSOR } from "@/lib/board/config";
import { DAY_MS, HOUR_MS } from "./rules";
import type { Booking, PlacementListing } from "./types";

interface SampleBrand {
  name: string;
  domain: string;
  category: NonNullable<PlacementListing["category"]>;
  headline: string;
}

const BRANDS: readonly SampleBrand[] = [
  { name: "Northwind Studio (sample)", domain: "northwind-studio.example", category: "Marketing", headline: "Short-form video ads people watch to the end" },
  { name: "Harbor Lane Media (sample)", domain: "harborlane.example", category: "Marketing", headline: "Paid social for brands that sell online" },
  { name: "Quill Analytics (sample)", domain: "quill-analytics.example", category: "Developer", headline: "Creative reporting without the spreadsheet" },
  { name: "Brightwave Tools (sample)", domain: "brightwave.example", category: "SEO", headline: "Plan and compare campaign budgets in minutes" },
  { name: "Fern & Field Co (sample)", domain: "fernandfield.example", category: "Productivity", headline: "Small-batch goods, shipped worldwide" },
  { name: "Lumen Creators (sample)", domain: "lumen-creators.example", category: "Agents", headline: "A weekly newsletter on creator-led ads" },
  { name: "Tidepool Labs (sample)", domain: "tidepool.example", category: "Other", headline: "Experiments for teams that test their ads" },
  { name: "Copperfield Agency (sample)", domain: "copperfield.example", category: "Crypto", headline: "Brand and performance under one roof" },
];

/** Integer hash, stable across runs and engines. */
function hash(n: number): number {
  let h = Math.imul(n | 0, 0x9e3779b1) ^ Math.imul(Math.floor(n / 4_294_967_296) | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

function toBooking(prefix: string, start: number, brand: SampleBrand): Booking {
  return {
    id: `${prefix}_${start}`,
    start,
    sample: true,
    headline: brand.headline,
    listing: { domain: brand.domain, name: brand.name, url: `https://${brand.domain}`, category: brand.category },
  };
}

/** About 3 in 10 hours are held by a sample brand. */
export function sampleHourBooking(slot: number): Booking | null {
  const h = hash(Math.floor(slot / HOUR_MS));
  if (h % 100 >= 30) return null;
  return toBooking("sample_h", slot, BRANDS[(h >>> 8) % BRANDS.length]);
}

/** About 4 in 10 days are held by a sample sponsor. */
export function sampleDayBooking(day: number): Booking | null {
  const h = hash(Math.floor(day / DAY_MS) + 7919);
  if (h % 100 >= 40) return null;
  const brand = BRANDS[(h >>> 8) % BRANDS.length];
  const b = toBooking("sample_d", day, brand);
  return { ...b, headline: brand.headline.slice(0, SPONSOR.taglineMax) };
}

export const SAMPLE_BRAND_COUNT = BRANDS.length;
