import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";
import { BRAND } from "@/lib/campaign";

/** Compact chrome for panel / account / approvals pages. */
export async function SiteChrome() {
  const session = await auth();
  const showApprovals = isOperatorEmail(session?.user?.email);
  const showShop = isShopPartnerEmail(session?.user?.email);

  return (
    <header className="shell site-header site-header-compact">
      <Link href="/" className="wordmark" data-testid="brand-wordmark">
        {BRAND.name}
      </Link>
      <nav className="header-nav" aria-label="Primary">
        <Link className="nav-link" href="/#panels">
          Panels
        </Link>
        {showApprovals ? (
          <Link
            className="nav-link"
            href="/operator/approvals"
            data-testid="approvals-nav-link"
          >
            Approvals
          </Link>
        ) : null}
        {showShop ? (
          <Link
            className="nav-link"
            href="/partner/shop"
            data-testid="shop-nav-link"
          >
            Wrap shop
          </Link>
        ) : null}
        <AuthNav />
      </nav>
    </header>
  );
}
