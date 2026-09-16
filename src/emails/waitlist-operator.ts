/**
 * Slice 12.11 — waitlist operator notify template (files under src/emails/).
 */

import { BRAND } from "@/lib/campaign";
import type { EmailTemplate } from "./intent-status";

export function waitlistOperatorEmailTemplate(email: string): EmailTemplate {
  return {
    subject: `Waitlist: ${email}`,
    text: `${email} joined the ${BRAND.name} waitlist.`,
  };
}
