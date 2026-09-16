"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BRAND } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

/**
 * Slice 12.34 — branded 500 / error boundary.
 * Same stainless chrome as 404. Not a panel. No lease. No personal identity.
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
            Home
          </Link>
          <Link
            className="btn btn-ghost"
            href="/#waitlist"
            data-testid="error-waitlist"
          >
            {PUBLIC_COPY.hero.primaryCta}
          </Link>
        </div>
      </main>

      <footer className="shell site-footer">
        <div data-testid="error-footer-line">{PUBLIC_COPY.footer.line}</div>
        <p className="fine-print" data-testid="error-footer-independent">
          {PUBLIC_COPY.footer.independent}
        </p>
      </footer>
    </div>
  );
}
