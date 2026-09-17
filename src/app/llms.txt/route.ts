import { buildLlmsTxt } from "@/lib/llms-txt";

/**
 * Slice 14.21 — `/llms.txt` with PUBLIC_COPY facts only.
 * Plain text for crawlers / LLM ingest. No Stripe. CLOSE_AT null.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
