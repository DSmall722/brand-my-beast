import { PUBLIC_COPY } from "@/lib/public-copy";

/**
 * Slice 14.24 — shared footer strings for branded 404 + 500 chrome.
 * Same PUBLIC_COPY.footer.line / .independent. No legal nav (home keeps that).
 */
export type SiteChromeFooterIds = {
  line: string;
  independent: string;
};

export function SiteChromeFooter({
  lineTestId,
}: {
  lineTestId: string;
  independentTestId?: string;
}) {
  return (
    <footer className="shell site-footer">
      <div data-testid={lineTestId}>{PUBLIC_COPY.footer.line}</div>
    </footer>
  );
}

/** Exported for Playwright / source gates — single string source. */
export const SITE_CHROME_FOOTER_LINE = PUBLIC_COPY.footer.line;
export const SITE_CHROME_FOOTER_INDEPENDENT = PUBLIC_COPY.footer.independent;
