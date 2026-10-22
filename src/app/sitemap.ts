import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages = ["", "/privacy", "/terms"];
  return pages.map((p) => ({
    url: `${SITE.url}${p}`,
    lastModified,
    priority: p === "" ? 1 : 0.5,
  }));
}
