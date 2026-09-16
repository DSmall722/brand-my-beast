import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/campaign";

const SITE = `https://${BRAND.domain}`;

/**
 * Slice 7.8 / 13.37 — public crawl surface is `/` and `/panels/*` only.
 * Disallow auth and private boards: `/account`, `/signin`, `/operator`.
 */
export const ROBOTS_DISALLOW_PATHS = [
  "/account",
  "/account/",
  "/signin",
  "/signin/",
  "/operator",
  "/operator/",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/panels/"],
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
