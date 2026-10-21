/**
 * SAMPLE data for the demo adapter. Every domain is under the reserved .example TLD and every name says "(sample)".
 * None of these are real businesses. Prices paid are computed from the ladder in the order the blocks were "sold".
 */
import { blockPriceCents, rectArea } from "./rules";
import type { Rect, WallBlock } from "./types";

interface SeedSpec {
  slug: string;
  name: string;
  label: string;
  color: string;
  category: WallBlock["listing"]["category"];
  rect: Rect;
}

const r = (col: number, row: number, w: number, h: number): Rect => ({ col, row, w, h });

const SPECS: SeedSpec[] = [
  { slug: "northwind-studio", name: "Northwind Studio (sample)", label: "Northwind", color: "cyan", category: "Marketing", rect: r(1, 1, 3, 2) },
  { slug: "bluefin-ads", name: "Bluefin Ads (sample)", label: "Bluefin", color: "blue", category: "Developer", rect: r(5, 1, 2, 2) },
  { slug: "harbor-creative", name: "Harbor Creative (sample)", label: "Harbor", color: "amber", category: "Marketing", rect: r(8, 2, 1, 1) },
  { slug: "lumen-analytics", name: "Lumen Analytics (sample)", label: "Lumen", color: "lime", category: "SEO", rect: r(11, 1, 4, 1) },
  { slug: "tidepool-media", name: "Tidepool Media (sample)", label: "Tidepool", color: "violet", category: "Agents", rect: r(3, 5, 2, 3) },
  { slug: "oak-and-ember", name: "Oak & Ember (sample)", label: "Oak & Ember", color: "orange", category: "Productivity", rect: r(10, 5, 1, 1) },
  { slug: "pixel-orchard", name: "Pixel Orchard (sample)", label: "Orchard", color: "green", category: "Games", rect: r(12, 6, 2, 2) },
  { slug: "fieldnote-agency", name: "Fieldnote Agency (sample)", label: "Fieldnote", color: "fuchsia", category: "Marketing", rect: r(18, 3, 2, 3) },
  { slug: "copperline-labs", name: "Copperline Labs (sample)", label: "Copperline", color: "rose", category: "Developer", rect: r(20, 10, 1, 1) },
  { slug: "signal-ferry", name: "Signal Ferry (sample)", label: "Signal", color: "sky", category: "Other", rect: r(6, 9, 3, 1) },
  { slug: "marlow-and-finch", name: "Marlow & Finch (sample)", label: "Marlow", color: "slate", category: "Crypto", rect: r(15, 12, 2, 1) },
];

const HOUR = 3_600_000;

/** Blocks in sale order. `now` is passed in so this stays deterministic. */
export function sampleBlocks(now: number): WallBlock[] {
  let sold = 0;
  return SPECS.map((s, i) => {
    const tiles = rectArea(s.rect);
    const paidCents = blockPriceCents(sold, tiles);
    sold += tiles;
    const at = now - (SPECS.length - i) * 5 * HOUR;
    return {
      id: `sample_${s.slug}`,
      rect: s.rect,
      label: s.label,
      color: s.color,
      listing: {
        domain: `${s.slug}.example`,
        name: s.name,
        url: `https://${s.slug}.example`,
        category: s.category,
        tagline: "Sample listing. This is demo data, not a real business.",
        createdAt: at,
        verified: false,
        sample: true,
      },
      paidCents,
      at,
      sample: true,
    };
  });
}
