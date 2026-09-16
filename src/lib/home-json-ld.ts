/**
 * Slice 12.31 — JSON-LD Organization + Offer for `/`.
 * Strings from PUBLIC_COPY / BRAND. Money from campaign.ts.
 * No impression counts, CPMs, or invented reach claims.
 */

import {
  BRAND,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "./campaign";
import { PUBLIC_COPY } from "./public-copy";

export type HomeJsonLdGraph = {
  "@context": "https://schema.org";
  "@graph": readonly [
    {
      "@type": "Organization";
      "@id": string;
      name: string;
      url: string;
      email: string;
      sameAs: readonly string[];
      description: string;
    },
    {
      "@type": "Offer";
      "@id": string;
      name: string;
      description: string;
      url: string;
      seller: { "@id": string };
      priceCurrency: "USD";
      price: string;
      eligibleQuantity: {
        "@type": "QuantitativeValue";
        value: number;
        unitText: string;
      };
      additionalProperty: readonly {
        "@type": "PropertyValue";
        name: string;
        value: string;
      }[];
    },
  ];
};

const SITE_URL = `https://${BRAND.domain}`;

export function buildHomeJsonLd(): HomeJsonLdGraph {
  const orgId = `${SITE_URL}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: BRAND.name,
        url: SITE_URL,
        email: BRAND.email,
        sameAs: [`https://x.com/${BRAND.handle.replace(/^@/, "")}`],
        description: PUBLIC_COPY.meta.description,
      },
      {
        "@type": "Offer",
        "@id": `${SITE_URL}/#panel-offer`,
        name: PUBLIC_COPY.meta.title,
        description: PUBLIC_COPY.hero.lead,
        url: SITE_URL,
        seller: { "@id": orgId },
        priceCurrency: "USD",
        price: String(FLOOR_USD),
        eligibleQuantity: {
          "@type": "QuantitativeValue",
          value: 12,
          unitText: "panels",
        },
        additionalProperty: [
          {
            "@type": "PropertyValue",
            name: "Floor",
            value: formatUsd(FLOOR_USD),
          },
          {
            "@type": "PropertyValue",
            name: "Buyout",
            value: formatUsd(GOAL_USD),
          },
        ],
      },
    ],
  };
}

export function homeJsonLdIsSafe(graph: HomeJsonLdGraph): boolean {
  const raw = JSON.stringify(graph).toLowerCase();
  if (/\blease\b/.test(raw)) return false;
  if (/\bimpression/.test(raw)) return false;
  if (/\bcpm\b/.test(raw)) return false;
  if (raw.includes("teslacyberbeast")) return false;
  if (raw.includes("@gmail.com")) return false;
  if (!raw.includes(formatUsd(FLOOR_USD).toLowerCase())) return false;
  if (!raw.includes(formatUsd(GOAL_USD).toLowerCase())) return false;
  return true;
}
