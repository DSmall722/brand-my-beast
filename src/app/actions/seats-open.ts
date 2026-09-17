"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { CLOSE_AT } from "@/lib/campaign";
import { seatsOpenToggleRejectsDate } from "@/lib/seats-open";
import { setSeatsOpenOverride } from "@/lib/seats-open-store";

export type SeatsOpenActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  seatsOpen?: boolean;
};

/**
 * Slice 14.18 — operator toggles SEATS_OPEN. Does not set a date or CLOSE_AT.
 */
export async function submitSeatsOpenToggle(
  _prev: SeatsOpenActionState,
  formData: FormData,
): Promise<SeatsOpenActionState> {
  const session = await auth();
  if (!session?.user?.email || !isOperatorEmail(session.user.email)) {
    return { ok: false, error: "Operator access required." };
  }

  if (CLOSE_AT !== null) {
    return {
      ok: false,
      error: "CLOSE_AT must stay null. Seats toggle does not set a date.",
    };
  }

  // Reject any accidental date payload — toggle is open/closed only.
  for (const key of ["date", "closeAt", "close_at", "until", "opensAt"]) {
    if (!seatsOpenToggleRejectsDate(formData.get(key))) {
      return {
        ok: false,
        error: "Seats toggle does not set a date.",
      };
    }
  }

  const raw = String(formData.get("seatsOpen") ?? "").trim().toLowerCase();
  if (raw !== "true" && raw !== "false") {
    return { ok: false, error: "Choose open or closed." };
  }
  const open = raw === "true";
  const result = setSeatsOpenOverride(open);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/operator");
  revalidatePath("/panels/hood");
  revalidatePath("/");
  return {
    ok: true,
    seatsOpen: result.seatsOpen,
    message: open
      ? "Seats open for intent marks. No date set. CLOSE_AT unset."
      : "Seats closed — waitlist only. No date set. CLOSE_AT unset.",
  };
}
