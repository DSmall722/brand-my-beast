import { PUBLIC_COPY } from "@/lib/public-copy";

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

export const SITE_CHROME_FOOTER_LINE = PUBLIC_COPY.footer.line;
export const SITE_CHROME_FOOTER_INDEPENDENT = PUBLIC_COPY.footer.independent;
