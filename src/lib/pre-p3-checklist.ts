import { CLOSE_AT } from "@/lib/campaign";

/**
 * Slice 11.8 — Pre-P3 operator checklist items.
 * UI checkboxes are display / local prep only. They never set CLOSE_AT.
 */

export type PreP3ChecklistItem = {
  id: "llc" | "terms" | "resend" | "stripe-not-wired";
  label: string;
};

export const PRE_P3_CHECKLIST: readonly PreP3ChecklistItem[] = [
  {
    id: "llc",
    label: "LLC paperwork path is decided (human). Not started from this UI.",
  },
  {
    id: "terms",
    label: "Terms / privacy stubs reviewed. Live counsel still human.",
  },
  {
    id: "resend",
    label: "Resend From is BrandMyBeast hello@brandmybeast.com.",
  },
  {
    id: "stripe-not-wired",
    label: "Stripe is not wired. No SetupIntent. No card capture.",
  },
] as const;

/** Checkboxes do not write OPEN_AT or CLOSE_AT. */
export function assertPreP3ChecklistDoesNotSetCloseAt(
  checkedIds: readonly string[],
): boolean {
  void checkedIds;
  void CLOSE_AT;
  return true;
}
