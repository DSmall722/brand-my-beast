"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { addBanRule } from "@/lib/operator-ban-list";
import { appendOperatorAuditLog } from "@/lib/operator-audit-log";
import { rejectListedMatchingBanRule } from "@/lib/intent-store";
import { saveApprovalNote } from "@/lib/approval-note-store";

export type BanListActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

/**
 * Slice 8.8 / 13.16 — add ban pattern and re-run pending intents.
 * Matching listed → hard-reject. Approved seats stay.
 */
export async function submitBanRule(
  _prev: BanListActionState,
  formData: FormData,
): Promise<BanListActionState> {
  const session = await auth();
  if (!session?.user?.email || !isOperatorEmail(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  const pattern = String(formData.get("pattern") ?? "");
  const note = String(formData.get("note") ?? "");
  const result = await addBanRule({ pattern, note });
  if (!result.ok) return { ok: false, error: result.error };

  const sweep = await rejectListedMatchingBanRule(result.rule);
  for (const bidId of sweep.rejectedIds) {
    const rejectNote = `Hard-reject: ban-list “${result.rule.pattern}” (rule ${result.rule.id}).`;
    const saved = await saveApprovalNote({
      bidId,
      decision: "rejected",
      note: rejectNote,
    });
    await appendOperatorAuditLog({
      bidId,
      decision: "rejected",
      actorEmail: session.user.email,
      actorUserId: session.user.id ?? null,
      noteId: saved.id,
    });
  }

  const rejected = sweep.rejectedIds.length;
  revalidatePath("/operator");
  revalidatePath("/operator/ban-list");
  revalidatePath("/operator/audit");
  return {
    ok: true,
    message:
      rejected === 0
        ? `Ban “${result.rule.pattern}” added. No listed intents matched.`
        : `Ban “${result.rule.pattern}” added. Hard-rejected ${rejected} listed intent${rejected === 1 ? "" : "s"}.`,
  };
}
