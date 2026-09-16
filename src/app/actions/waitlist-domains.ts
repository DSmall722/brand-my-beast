"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { addDomainBlock } from "@/lib/waitlist-domain-blocklist";

export type DomainBlockActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

/**
 * Slice 13.31 — operator adds a waitlist email domain to the blocklist.
 */
export async function submitDomainBlock(
  _prev: DomainBlockActionState,
  formData: FormData,
): Promise<DomainBlockActionState> {
  const session = await auth();
  if (!session?.user?.email || !isOperatorEmail(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  const domain = String(formData.get("domain") ?? "");
  const note = String(formData.get("note") ?? "");
  const result = await addDomainBlock({ domain, note });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/operator/waitlist-domains");
  revalidatePath("/operator");
  return {
    ok: true,
    message: `Blocked “${result.rule.domain}”. New waitlist joins from that domain fail.`,
  };
}
