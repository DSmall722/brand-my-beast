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
import { parseStandingUsd } from "@/lib/intent";
import {
  editPendingIntent,
  getIntentBidById,
  listWholeTruckSiblingBids,
  loadBoardIntentStats,
  placeIntentBid,
  placeWholeTruckIntent,
  setIntentStatus,
  withdrawPendingIntent,
} from "@/lib/intent-store";
import { GOAL_USD, PANELS, formatUsd } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";
import {
  assertEtchFinishAllowed,
  parseOperatorFinish,
} from "@/lib/etch-approve-lock";
import { assertEtchArtPassesLinter } from "@/lib/etch-linter";
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
  const standingParsed = parseStandingUsd(standingRaw === "" ? null : standingRaw);
  if (!standingParsed.ok) {
    return { ok: false, error: standingParsed.error };
  }
  const standingUsd = standingParsed.standingUsd;
  const proxyRaw = String(formData.get("proxyMaxUsd") ?? "").trim();
  const proxyMaxUsd = proxyRaw === "" ? null : Number(proxyRaw);
  const asFloorSave =
    formData.get("floorSave") === "on" ||
    formData.get("floorSave") === "1" ||
    formData.get("floorSave") === "true";
  const artwork = parseIntentArtwork({
    artworkUrl: String(formData.get("artworkUrl") ?? ""),
    artworkUpload: String(formData.get("artworkUpload") ?? ""),
  });
  if (!artwork.ok) return { ok: false, error: artwork.error };

  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();

  if (asFloorSave) {
    if (standingUsd == null || !Number.isFinite(standingUsd)) {
      return { ok: false, error: "Floor-save mark Y is required." };
    }
  }

  let result: Awaited<ReturnType<typeof placeIntentBid>>;
  try {
    result = await placeIntentBid({
      panelId,
      userId: session.user.id,
      brandLabel,
      tradeLabel,
      standingUsd: asFloorSave ? undefined : standingUsd,
      proxyMaxUsd: asFloorSave ? null : proxyMaxUsd,
      floorSaveUsd: asFloorSave ? standingUsd : null,
      artworkUrl: artwork.artworkUrl,
      idempotencyKey: idempotencyKey || null,
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
  if (result.bid.floorSaveUsd != null) {
    return {
      ok: true,
      message: `Floor-save listed at $${result.bid.floorSaveUsd} if short of $58,000. Deposit shown: $${result.bid.depositUsd} (not charged).`,
    };
  }
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

  if (decision === "approved") {
    const finish = parseOperatorFinish(formData.get("finish"));
    if (finish === "etch") {
      const bid = await getIntentBidById(bidId);
      if (!bid) return { ok: false, error: "Bid not found." };
      const panel = PANELS.find((row) => row.id === bid.panelId);
      if (!panel || panel.finishAtGoal !== "wrap_or_etch") {
        return {
          ok: false,
          error: "This panel is wrap-only. Cannot approve etch finish.",
        };
      }
      const board = await loadBoardIntentStats();
      const etchGate = assertEtchFinishAllowed({
        finish,
        pledgedUsd: board.pledgedUsd,
      });
      if (!etchGate.ok) return { ok: false, error: etchGate.error };

      // Slice 13.27 — etch art notes must pass linter; wrap may still list.
      const artNotes = String(formData.get("artNotes") ?? "");
      const lintGate = assertEtchArtPassesLinter({ finish, artNotes });
      if (!lintGate.ok) return { ok: false, error: lintGate.error };
    }
  }

  // Slice 13.17 — capture siblings before reject mutates status.
  const wholeTruckSiblings =
    decision === "rejected"
      ? await listWholeTruckSiblingBids(bidId)
      : null;

  const result = await setIntentStatus(bidId, decision, { note });
  if (!result.ok) return { ok: false, error: result.error };

  const noteTargets = wholeTruckSiblings ?? [result.bid];
  let noteId: string | null = null;
  if (note.trim() || decision === "rejected") {
    for (const target of noteTargets) {
      const saved = await saveApprovalNote({
        bidId: target.id,
        decision,
        note,
      });
      if (target.id === bidId) noteId = saved.id;
    }
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
  revalidatePath("/account");
  for (const target of noteTargets) {
    revalidatePath(`/panels/${target.panelId}`);
  }
  return {
    ok: true,
    message:
      wholeTruckSiblings != null
        ? `Whole-truck bid ${decision} (12 panels).`
        : `Bid ${decision}.`,
  };
}

/** Read helper for account / decided log (server components). */
export async function loadApprovalNote(bidId: string) {
  return getApprovalNote(bidId);
}

/** Slice 9.7 — owner withdraws a pending (listed) intent only. */
export async function withdrawIntentBid(
  _prev: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to withdraw an intent." };
  }

  const bidId = String(formData.get("bidId") ?? "");
  if (!bidId) return { ok: false, error: "Missing intent id." };

  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");
  const result = await withdrawPendingIntent({
    bidId,
    userId: session.user.id,
    expectedUpdatedAt: expectedUpdatedAt || undefined,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/account");
  revalidatePath(`/panels/${result.bid.panelId}`);
  revalidatePath("/operator");
  revalidatePath("/operator/approvals");
  return {
    ok: true,
    message: PUBLIC_COPY.seat.withdrawSuccess,
  };
}

/** Slice 9.8 — owner edits brand / trade / art while pending only. */
export async function editPendingIntentBid(
  _prev: IntentActionState,
  formData: FormData,
): Promise<IntentActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to edit an intent." };
  }

  const bidId = String(formData.get("bidId") ?? "");
  if (!bidId) return { ok: false, error: "Missing intent id." };

  const brandLabel = String(formData.get("brandLabel") ?? "");
  const tradeLabel = String(formData.get("tradeLabel") ?? "");
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "");
  const artwork = parseIntentArtwork({
    artworkUrl: String(formData.get("artworkUrl") ?? ""),
    artworkUpload: String(formData.get("artworkUpload") ?? ""),
  });
  if (!artwork.ok) return { ok: false, error: artwork.error };

  const clearArt =
    formData.get("clearArtwork") === "on" ||
    formData.get("clearArtwork") === "1" ||
    formData.get("clearArtwork") === "true";

  const result = await editPendingIntent({
    bidId,
    userId: session.user.id,
    brandLabel,
    tradeLabel,
    artworkUrl: clearArt
      ? null
      : artwork.artworkUrl !== null
        ? artwork.artworkUrl
        : undefined,
    expectedUpdatedAt: expectedUpdatedAt || undefined,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/account");
  revalidatePath(`/panels/${result.bid.panelId}`);
  revalidatePath("/operator");
  revalidatePath("/operator/approvals");
  return {
    ok: true,
    message: "Intent updated. Still not charged.",
  };
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
