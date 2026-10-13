import { assertTestLoginNotInProduction } from "@/lib/auth/mode";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { createScrubSpanProcessor } from "@/lib/otel/scrub";

/**
 * Boot assert, then Vercel built-in OpenTelemetry.
 * Edge skips the Node SDK. "auto" keeps Vercel's exporter; the scrubber runs first.
 */
export async function register(): Promise<void> {
  assertTestLoginNotInProduction();

  if (process.env.NEXT_RUNTIME === "edge") return;

  const { registerOTel } = await import("@vercel/otel");
  registerOTel({
    serviceName: "brandmybeast",
    spanProcessors: [
      createScrubSpanProcessor() as unknown as SpanProcessor,
      "auto",
    ],
  });
}
