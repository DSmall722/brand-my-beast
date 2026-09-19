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

/** Slice 16.34 — comment only. Crawl rules stay the same. */
export const ROBOTS_HOLD_COMMENT =
  "# production may be stale while Vercel hold is on.";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/panels/"],
      disallow: [...ROBOTS_DISALLOW_PATHS],
      other: {
        [ROBOTS_HOLD_COMMENT]: " ",
      },
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
