/**
 * Slice 12.11 — waitlist operator notify template (files under src/emails/).
 * Slice 12.13 — CAN-SPAM footer on every mail.
 */

import { BRAND } from "@/lib/campaign";
import { withCanSpamFooter } from "./can-spam";
import type { EmailTemplate } from "./intent-status";

export function waitlistOperatorEmailTemplate(email: string): EmailTemplate {
  return {
    subject: `Waitlist: ${email}`,
    text: withCanSpamFooter(`${email} joined the ${BRAND.name} waitlist.`),
  };
}
