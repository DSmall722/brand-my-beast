import Link from "next/link";
import { BRAND } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

/**
 * Slice 6.13 — branded 404. Dark stainless chrome only.
 * Layout cue from 404s.design; not a gallery clone or type theft.
 */
export default function NotFound() {
  return (
    <div className="not-found-page" data-testid="not-found-page">
      <a className="skip-link" href="#not-found-main">
        Skip to content
      </a>
      <header className="shell site-header">
        <Link href="/" className="wordmark" data-testid="brand-wordmark">
          {BRAND.name}
        </Link>
      </header>

      <main id="not-found-main" className="shell not-found-main">
        <h1 className="not-found-title" data-testid="not-found-title">
          This page is not a panel.
        </h1>
        <div className="not-found-actions">
          <Link
            className="btn btn-signal"
            href="/"
            data-testid="not-found-home"
          >
            Home
          </Link>
          <Link
            className="btn btn-ghost"
            href="/#waitlist"
            data-testid="not-found-waitlist"
          >
            {PUBLIC_COPY.hero.primaryCta}
          </Link>
        </div>
      </main>

      <footer className="shell site-footer">
        <div data-testid="not-found-footer-line">{PUBLIC_COPY.footer.line}</div>
        <p className="fine-print" data-testid="not-found-footer-independent">
          {PUBLIC_COPY.footer.independent}
        </p>
      </footer>
    </div>
  );
}
