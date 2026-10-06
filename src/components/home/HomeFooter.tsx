import Link from "next/link";
import { BRAND } from "@/lib/campaign";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Visible line matches PUBLIC_COPY.footer.line. */
export function HomeFooter() {
  return (
    <footer className="shell site-footer" data-testid="site-footer">
      <p className="site-footer-line" data-testid="site-footer-line">
        {BRAND.name}
        {" · "}
        <a href="https://x.com/BrandMyBeast" data-testid="footer-x-link">
          {BRAND.handle}
        </a>
        {" · "}
        <a href={`mailto:${BRAND.email}`} data-testid="footer-email-link">
          {BRAND.email}
        </a>
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
