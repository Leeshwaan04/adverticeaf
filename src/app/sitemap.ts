import type { MetadataRoute } from "next";
import { AGENCIES } from "@/data/agencies";
import { CAMPAIGNS_SEED } from "@/data/campaigns";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(SITE.lastReviewed);
  const pages = ["", "/campaigns", "/agencies", "/about", "/contact", "/methodology", "/privacy", "/terms"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, lastModified, priority: p === "" ? 1 : 0.7 })),
    ...AGENCIES.map((a) => ({ url: `${SITE.url}/agencies/${a.slug}`, lastModified, priority: 0.6 })),
    ...CAMPAIGNS_SEED.map((c) => ({ url: `${SITE.url}/campaigns/${c.slug}`, lastModified, priority: 0.8 })),
  ];
}
