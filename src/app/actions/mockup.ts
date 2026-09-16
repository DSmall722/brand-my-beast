"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import {
  assertEtchFinishAllowed,
  parseOperatorFinish,
} from "@/lib/etch-approve-lock";
import { assertEtchArtPassesLinter } from "@/lib/etch-linter";
import { loadBoardIntentStats } from "@/lib/intent-store";
import type { ImagineMockup } from "@/lib/mockup";
import { queueImagineMockup } from "@/lib/mockup-store";

export type MockupActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  mockup?: ImagineMockup;
};

export async function queueImagineMockupAction(
  _prev: MockupActionState,
  formData: FormData,
): Promise<MockupActionState> {
  const session = await auth();
  if (!session?.user?.email || !isOperatorEmail(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  const bidId = String(formData.get("bidId") ?? "");
  const finish = parseOperatorFinish(formData.get("finish"));

  if (finish === "etch") {
    const board = await loadBoardIntentStats();
    const etchGate = assertEtchFinishAllowed({
      finish,
      pledgedUsd: board.pledgedUsd,
    });
    if (!etchGate.ok) return { ok: false, error: etchGate.error };

    const artNotes = String(formData.get("artNotes") ?? "");
    const lintGate = assertEtchArtPassesLinter({ finish, artNotes });
    if (!lintGate.ok) return { ok: false, error: lintGate.error };
  }

  const result = await queueImagineMockup({ bidId, finish });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/operator");
  revalidatePath("/operator/approvals");
  revalidatePath(`/panels/${result.mockup.panelId}`);
  return {
    ok: true,
    mockup: result.mockup,
    message: `Same-day ${finish} mockup ready (placeholder — not billed).`,
  };
}
