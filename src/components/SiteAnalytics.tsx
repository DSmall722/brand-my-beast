"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { redactAnalyticsUrl } from "@/lib/analytics-url";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent {
  return { ...event, url: redactAnalyticsUrl(event.url) };
}

/** Vercel Web Analytics with query strings redacted (utm_* kept). */
export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
