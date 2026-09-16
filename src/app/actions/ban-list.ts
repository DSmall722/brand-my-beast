"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import {
  addBanRule,
  logBanListMatch,
  matchesBanPattern,
} from "@/lib/operator-ban-list";
import { appendOperatorAuditLog } from "@/lib/operator-audit-log";
import {
  listBidsWithStatus,
  setIntentStatus,
} from "@/lib/intent-store";
import { saveApprovalNote } from "@/lib/approval-note-store";

export type BanListActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

/**
 * Slice 8.8 — add ban pattern and hard-reject matching listed intents.
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

  const listed = await listBidsWithStatus("listed");
  let rejected = 0;
  for (const bid of listed) {
    if (
      matchesBanPattern(bid.brandLabel, bid.tradeLabel, result.rule.pattern)
    ) {
      logBanListMatch({
        rule: result.rule,
        brandLabel: bid.brandLabel,
        tradeLabel: bid.tradeLabel,
        context: "sweep",
      });
      const note = `Hard-reject: ban-list “${result.rule.pattern}” (rule ${result.rule.id}).`;
      const status = await setIntentStatus(bid.id, "rejected", { note });
      if (status.ok) {
        const saved = await saveApprovalNote({
          bidId: bid.id,
          decision: "rejected",
          note,
        });
        await appendOperatorAuditLog({
          bidId: bid.id,
          decision: "rejected",
          actorEmail: session.user.email,
          actorUserId: session.user.id ?? null,
          noteId: saved.id,
        });
        rejected += 1;
      }
    }
  }

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
