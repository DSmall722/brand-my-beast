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
      </footer>
  );
}
