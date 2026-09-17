import type { MetadataRoute } from "next";
import { BRAND, PANELS } from "@/lib/campaign";
import { gitHeadLastModified, gitLastModified } from "@/lib/git-lastmod";

const SITE = `https://${BRAND.domain}`;

/**
 * Slice 7.8 — sitemap lists home and each panel seat only.
 * Slice 14.22 — lastmod from git committer time, not wall-clock / a fake clock.
 * Private boards stay out of the crawl index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const homeLast =
    gitLastModified("src/app/page.tsx") ?? gitHeadLastModified() ?? undefined;
  const panelsLast =
    gitLastModified("src/app/panels") ??
    gitLastModified("src/lib/campaign.ts") ??
    gitHeadLastModified() ??
    undefined;

  return [
    {
      url: SITE,
      lastModified: homeLast,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...PANELS.map((panel) => ({
      url: `${SITE}/panels/${panel.id}`,
      lastModified: panelsLast,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
