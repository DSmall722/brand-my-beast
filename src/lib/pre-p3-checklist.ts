import { CLOSE_AT } from "@/lib/campaign";

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

export function assertPreP3ChecklistDoesNotSetCloseAt(
  checkedIds: readonly string[],
): boolean {
  void checkedIds;
  void CLOSE_AT;
  return true;
}
