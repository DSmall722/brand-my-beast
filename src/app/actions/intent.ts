"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { assertNoteRequiredForReject } from "@/lib/artwork-approval";
import {
  getApprovalNote,
  saveApprovalNote,
} from "@/lib/approval-note-store";
import { appendOperatorAuditLog } from "@/lib/operator-audit-log";
import { parseIntentArtwork } from "@/lib/intent-artwork";
import {
  placeIntentBid,
  placeWholeTruckIntent,
  setIntentStatus,
} from "@/lib/intent-store";
import { GOAL_USD, PANELS, formatUsd } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { checkRateLimit } from "@/lib/rate-limit";

export type IntentActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function submitIntentBid(
  _prev: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to place an intent mark." };
  }

  const limited = checkRateLimit("intent", `user:${session.user.id}`);
  if (!limited.ok) {
    return { ok: false, error: PUBLIC_COPY.intent.rateLimited };
  }

  const panelId = String(formData.get("panelId") ?? "");
  const brandLabel = String(formData.get("brandLabel") ?? "");
  const tradeLabel = String(formData.get("tradeLabel") ?? "");
  const standingRaw = String(formData.get("standingUsd") ?? "").trim();
  const standingUsd = standingRaw ? Number(standingRaw) : undefined;
  const artwork = parseIntentArtwork({
    artworkUrl: String(formData.get("artworkUrl") ?? ""),
    artworkUpload: String(formData.get("artworkUpload") ?? ""),
  });
  if (!artwork.ok) return { ok: false, error: artwork.error };

  let result: Awaited<ReturnType<typeof placeIntentBid>>;
  try {
    result = await placeIntentBid({
      panelId,
      userId: session.user.id,
      brandLabel,
      tradeLabel,
      standingUsd,
      artworkUrl: artwork.artworkUrl,
    });
  } catch {
    return {
      ok: false,
      error: "Could not record intent. Try again. No intent was saved.",
    };
  }

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/panels/${panelId}`);
  revalidatePath("/operator");
  revalidatePath("/operator/approvals");
  revalidatePath("/account");
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
  if (!session?.user?.email || !isOperatorEmail(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  const bidId = String(formData.get("bidId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected") {
    return { ok: false, error: "Invalid decision." };
  }

  const note = String(formData.get("note") ?? "");
  const noteGate = assertNoteRequiredForReject({ decision, note });
  if (!noteGate.ok) return { ok: false, error: noteGate.error };

  const result = await setIntentStatus(bidId, decision, { note });
  if (!result.ok) return { ok: false, error: result.error };

  let noteId: string | null = null;
  if (note.trim() || decision === "rejected") {
    const saved = await saveApprovalNote({ bidId, decision, note });
    noteId = saved.id;
  }

  await appendOperatorAuditLog({
    bidId,
    decision,
    actorEmail: session.user.email,
    actorUserId: session.user.id ?? null,
    noteId,
  });

  revalidatePath("/operator");
  revalidatePath("/operator/approvals");
  revalidatePath("/operator/audit");
  revalidatePath(`/panels/${result.bid.panelId}`);
  revalidatePath("/account");
  return { ok: true, message: `Bid ${decision}.` };
}

/** Read helper for account / decided log (server components). */
export async function loadApprovalNote(bidId: string) {
  return getApprovalNote(bidId);
}

export async function submitWholeTruckIntent(
  _prev: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to list a whole-truck intent." };
  }

  const limited = checkRateLimit("intent", `user:${session.user.id}`);
  if (!limited.ok) {
    return { ok: false, error: PUBLIC_COPY.intent.rateLimited };
  }

  const brandLabel = String(formData.get("brandLabel") ?? "");
  const tradeLabel = String(formData.get("tradeLabel") ?? "");
  const artwork = parseIntentArtwork({
    artworkUrl: String(formData.get("artworkUrl") ?? ""),
    artworkUpload: String(formData.get("artworkUpload") ?? ""),
  });
  if (!artwork.ok) return { ok: false, error: artwork.error };

  const result = await placeWholeTruckIntent({
    userId: session.user.id,
    brandLabel,
    tradeLabel,
    artworkUrl: artwork.artworkUrl,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/");
  revalidatePath("/operator");
  revalidatePath("/operator/approvals");
  revalidatePath("/account");
  for (const panel of PANELS) {
    revalidatePath(`/panels/${panel.id}`);
  }

  return {
    ok: true,
    message: `Whole-truck intent listed at ${formatUsd(GOAL_USD)} across ${result.bids.length} panels (not charged).`,
  };
}
