import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/campaign";

const SITE = `https://${BRAND.domain}`;

/**
 * Slice 7.8 — public crawl surface is `/` and `/panels/*` only.
 * `/operator` is disallowed and must not appear in the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/panels/"],
      disallow: ["/operator", "/operator/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
