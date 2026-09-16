import { buildHomeJsonLd } from "@/lib/home-json-ld";

/** Slice 12.31 — Organization + Offer JSON-LD on `/`. */
export function HomeJsonLd() {
  const graph = buildHomeJsonLd();
  return (
    <script
      type="application/ld+json"
      data-testid="home-json-ld"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
