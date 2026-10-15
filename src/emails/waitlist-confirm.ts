import { BRAND } from "@/lib/campaign";
import { withCanSpamFooter } from "./can-spam";
import type { EmailTemplate } from "./intent-status";

export function waitlistConfirmEmailTemplate(input: {
  email: string;
  confirmUrl: string;
}): EmailTemplate {
  return {
    subject: `Confirm your ${BRAND.name} waitlist spot`,
    text: withCanSpamFooter(
      [
        `Confirm ${input.email} for the ${BRAND.name} waitlist.`,
        "",
        `Open this link to finish double opt-in:`,
        input.confirmUrl,
        "",
        "If you did not join, ignore this mail. No card was charged.",
        `— ${BRAND.name}`,
      ].join("\n"),
    ),
  };
}
