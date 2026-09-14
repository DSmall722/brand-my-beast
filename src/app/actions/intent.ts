"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { resolveAuthMode } from "@/lib/auth/mode";
import { placeIntentBid, setIntentStatus } from "@/lib/intent-store";

export type IntentActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

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

export async function submitIntentBid(
  _prev: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to place an intent mark." };
  }

  const panelId = String(formData.get("panelId") ?? "");
  const brandLabel = String(formData.get("brandLabel") ?? "");
  const standingRaw = String(formData.get("standingUsd") ?? "").trim();
  const standingUsd = standingRaw ? Number(standingRaw) : undefined;

  const result = placeIntentBid({
    panelId,
    userId: session.user.id,
    brandLabel,
    standingUsd,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/panels/${panelId}`);
  revalidatePath("/operator/approvals");
  return {
    ok: true,
    message: `Intent listed at $${result.bid.standingUsd}. Deposit shown: $${result.bid.depositUsd} (not charged).`,
  };
}

export async function decideIntentBid(
  _prev: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  const session = await auth();
  if (!session?.user?.email || !isOperator(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  const bidId = String(formData.get("bidId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, error: "Invalid decision." };
  }

  const result = setIntentStatus(bidId, decision);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/operator/approvals");
  revalidatePath(`/panels/${result.bid.panelId}`);
  return { ok: true, message: `Bid ${decision}.` };
}
