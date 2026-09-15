import type { MetadataRoute } from "next";
import { BRAND, PANELS } from "@/lib/campaign";

const SITE = `https://${BRAND.domain}`;

/**
 * Slice 7.8 — sitemap lists home and each panel seat only.
 * Private boards stay out of the crawl index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...PANELS.map((panel) => ({
      url: `${SITE}/panels/${panel.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
