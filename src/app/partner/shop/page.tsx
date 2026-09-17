import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { WrapShopSheet } from "@/components/WrapShopSheet";
import { auth } from "@/lib/auth";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";
import { FLOOR_USD, GOAL_USD, TRUCK_EXISTS, formatUsd } from "@/lib/campaign";
import { listApprovedBids } from "@/lib/intent-store";
import { toPartnerShopSeats } from "@/lib/partner-shop-seat";
import { listShopArtStatusesForBids } from "@/lib/shop-art-status-store";

/**
 * Slice 14.13 — wrap shop partners get seat art only. No weekly mileage
 * ledger or city time-in-market heatmap cards on `/partner`.
 */
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
            This wrap sheet is limited to shop partner emails. Set{" "}
            <code>SHOP_PARTNER_EMAILS</code> in Vercel. In test mode use{" "}
            <code>shop@example.com</code>.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const approved = toPartnerShopSeats(await listApprovedBids());
  const artStatuses = await listShopArtStatusesForBids(
    approved.map((seat) => seat.bidId),
  );

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page partner-shop-page"
        data-testid="partner-shop"
        data-truck-exists={TRUCK_EXISTS ? "true" : "false"}
      >
        <p className="eyebrow">Partner</p>
        <h1>Wrap shop sheet</h1>
        <p className="section-lead" data-testid="partner-shop-lead">
          Wrap sheet for approved seats. Brand + trade + art only — no bidder
          email. Mark art shop-ready or needs-fix. Floor{" "}
          {formatUsd(FLOOR_USD)}. Buyout {formatUsd(GOAL_USD)}. No payments on
          this path. No close clock.
        </p>
        <WrapShopSheet approved={approved} artStatuses={artStatuses} />
        <p className="auth-back">
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}
