import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { WinnerPortalSheet } from "@/components/WinnerPortalSheet";
import { auth } from "@/lib/auth";
import { FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { listApprovedBidsForUser } from "@/lib/intent-store";

export default async function WinnerPortalPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/account/wins");
  }

  const wins = await listApprovedBidsForUser(session.user.id);

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page winner-portal-page"
        data-testid="winner-portal"
      >
        <p className="eyebrow">Account</p>
        <h1>Winner portal</h1>
        <p className="section-lead" data-testid="winner-portal-lead">
          Approved seats only. Floor {formatUsd(FLOOR_USD)}. Buyout{" "}
          {formatUsd(GOAL_USD)}. No payments on this path. No close clock.
        </p>
        <WinnerPortalSheet wins={wins} />
        <p className="auth-back">
          <Link href="/account">Back to account</Link>
        </p>
      </main>
    </>
  );
}
