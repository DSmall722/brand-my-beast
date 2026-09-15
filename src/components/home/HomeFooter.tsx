import Link from "next/link";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeFooter() {
  return (
    <footer className="shell site-footer" data-testid="site-footer">
      <p className="site-footer-line" data-testid="site-footer-line">
        {PUBLIC_COPY.footer.line}
      </p>
      <p
        className="fine-print site-footer-independent"
        data-testid="site-footer-independent"
      >
        {PUBLIC_COPY.footer.independent}
      </p>
      <nav className="site-footer-legal" data-testid="site-footer-legal">
        <Link href="/privacy" data-testid="footer-privacy-link">
          Privacy
        </Link>
        <Link href="/terms" data-testid="footer-terms-link">
          Terms
        </Link>
      </nav>
    </footer>
  );
}
