"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { retryMailDeadLetter } from "@/lib/mail-dead-letter";

export type MailDeadLetterActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

/**
 * Slice 12.12 — operator retries a failed Resend payload from the dead-letter.
 */
export async function submitRetryMailDeadLetter(
  _prev: MailDeadLetterActionState,
  formData: FormData,
): Promise<MailDeadLetterActionState> {
  const session = await auth();
  if (!session?.user?.email || !isOperatorEmail(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  const id = String(formData.get("deadLetterId") ?? "").trim();
  if (!id) return { ok: false, error: "Dead-letter id required." };

  const result = await retryMailDeadLetter(id);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/operator/mail");
  return { ok: true, message: "Resend retry sent." };
}
