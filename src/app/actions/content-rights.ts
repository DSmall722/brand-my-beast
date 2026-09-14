"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { saveContentRightsForUser } from "@/lib/content-rights-store";

export type ContentRightsActionState = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function saveContentRightsPrefs(
  _prev: ContentRightsActionState,
  formData: FormData,
): Promise<ContentRightsActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sign in to save content rights." };
  }

  const rights = formData.getAll("rights").map(String);
  await saveContentRightsForUser({
    userId: session.user.id,
    rights,
  });
  revalidatePath("/account/wins");
  return {
    ok: true,
    message: "Content rights saved. Still no auto-tweet. Still not charged.",
  };
}
