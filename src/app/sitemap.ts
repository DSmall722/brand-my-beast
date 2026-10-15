import type { MetadataRoute } from "next";
import { PANELS, PUBLIC_SITE_ORIGIN } from "@/lib/campaign";
import { gitHeadLastModified, gitLastModified } from "@/lib/git-lastmod";

const SITE = PUBLIC_SITE_ORIGIN;

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
