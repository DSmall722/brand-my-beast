import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalButtons } from "@/components/ApprovalButtons";
import { auth } from "@/lib/auth";
import { resolveAuthMode } from "@/lib/auth/mode";
import { formatUsd, PANELS } from "@/lib/campaign";
import { listBidsPendingApproval } from "@/lib/intent-store";

function isOperator(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allow.includes(email.toLowerCase())) return true;
  if (resolveAuthMode() === "test" && email.endsWith("@example.com")) {
    return true;
  }
  return false;
}

export default async function OperatorApprovalsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/approvals");
  }
  if (!isOperator(session.user.email)) {
    return (
      <main className="shell auth-page" data-testid="operator-denied">
        <h1>Operator only</h1>
        <p className="section-lead">
          This approval thread is limited to operator emails. Set{" "}
          <code>OPERATOR_EMAILS</code> in Vercel.
        </p>
        <Link href="/">Back to the board</Link>
      </main>
    );
  }

  const pending = await listBidsPendingApproval();

  return (
    <main className="shell auth-page" data-testid="operator-approvals">
      <p className="eyebrow">Operator</p>
      <h1>Intent approvals</h1>
      <p className="section-lead">
        Approve or reject listed intents. No cards are charged here.
      </p>

      {pending.length === 0 ? (
        <p className="auth-hint" data-testid="approvals-empty">
          No listed intents waiting.
        </p>
      ) : (
        <ul className="intent-list" data-testid="approvals-list">
          {pending.map((bid) => {
            const panel = PANELS.find((row) => row.id === bid.panelId);
            return (
              <li key={bid.id} data-testid={`approval-row-${bid.id}`}>
                <div>
                  <strong>{bid.brandLabel}</strong> on{" "}
                  {panel?.name ?? bid.panelId} — {formatUsd(bid.standingUsd)}
                </div>
                <ApprovalButtons bidId={bid.id} />
              </li>
            );
          })}
        </ul>
      )}

      <p className="auth-back">
        <Link href="/">Back to the board</Link>
      </p>
    </main>
  );
}
