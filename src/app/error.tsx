"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SiteChromeFooter } from "@/components/SiteChromeFooter";
import { BRAND } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

/**
 * Slice 12.34 — branded 500 / error boundary.
 * Same stainless chrome as 404. Not a panel. No personal identity.
 * Slice 14.24 — footer strings shared with not-found via SiteChromeFooter.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="not-found-page" data-testid="error-page">
      <a className="skip-link" href="#error-main">
        Skip to content
      </a>
      <header className="shell site-header">
        <Link href="/" className="wordmark" data-testid="brand-wordmark">
          {BRAND.name}
        </Link>
      </header>

      <main id="error-main" className="shell not-found-main">
        <h1 className="not-found-title" data-testid="error-title">
          This is not a panel.
        </h1>
        <p className="section-lead" data-testid="error-lead">
          Something broke on our side. Still no card charge on this page.
        </p>
        <div className="not-found-actions">
          <button
            type="button"
            className="btn btn-signal"
            data-testid="error-retry"
            onClick={() => retry()}
          >
            Try again
          </button>
          <Link
            className="btn btn-ghost"
            href="/"
            data-testid="error-home"
          >
            {PUBLIC_COPY.chrome.backToBoard}
          </Link>
          <Link
            className="btn btn-ghost"
            href="/#contactus"
            data-testid="error-waitlist"
          >
            {PUBLIC_COPY.hero.primaryCta}
          </Link>
        </div>
      </main>

      <SiteChromeFooter
        lineTestId="error-footer-line"
        independentTestId="error-footer-independent"
      />
    </div>
  );
}
