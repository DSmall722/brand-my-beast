import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { WrapShopSheet } from "@/components/WrapShopSheet";
import { auth } from "@/lib/auth";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { listApprovedBids } from "@/lib/intent-store";

export default async function PartnerShopPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/partner/shop");
  }
  if (!isShopPartnerEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main className="shell auth-page" data-testid="partner-shop-denied">
          <h1>Wrap shop partners only</h1>
          <p className="section-lead">
            This read-only wrap sheet is limited to shop partner emails. Set{" "}
            <code>SHOP_PARTNER_EMAILS</code> in Vercel. In test mode use{" "}
            <code>shop@example.com</code>.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const approved = await listApprovedBids();

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page partner-shop-page"
        data-testid="partner-shop"
      >
        <p className="eyebrow">Partner</p>
        <h1>Wrap shop sheet</h1>
        <p className="section-lead" data-testid="partner-shop-lead">
          Read-only wrap sheet. Floor {formatUsd(FLOOR_USD)}. Buyout{" "}
          {formatUsd(GOAL_USD)}. No payments on this path. No close clock.
        </p>
        <WrapShopSheet approved={approved} />
        <p className="auth-back">
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}
