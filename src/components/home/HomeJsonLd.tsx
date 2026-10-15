import { buildHomeJsonLd } from "@/lib/home-json-ld";

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
