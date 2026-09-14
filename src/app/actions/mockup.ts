"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
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
  const finishRaw = String(formData.get("finish") ?? "wrap");
  const finish = finishRaw === "etch" ? "etch" : "wrap";

  const result = await queueImagineMockup({ bidId, finish });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/operator/approvals");
  revalidatePath(`/panels/${result.mockup.panelId}`);
  return {
    ok: true,
    mockup: result.mockup,
    message: `Same-day ${finish} mockup ready (placeholder — not billed).`,
  };
}
