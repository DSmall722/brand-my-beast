/**
 * Slice 14.19 — “Seats open” email template.
 * Exists for later waitlist fan-out. Do not send from the agent or the
 * operator SEATS_OPEN toggle (14.18). CLOSE_AT stays unset. No card charge.
 */

import { BRAND, FLOOR_USD, GOAL_USD, formatUsd } from "@/lib/campaign";
import { withCanSpamFooter } from "./can-spam";
import type { EmailTemplate } from "./intent-status";

export function seatsOpenEmailTemplate(input?: {
  siteUrl?: string;
}): EmailTemplate {
  const site = input?.siteUrl ?? `https://${BRAND.domain}`;
  return {
    subject: `${BRAND.name} — seats are open for intent marks`,
    text: withCanSpamFooter(
      [
        `Seats are open on ${BRAND.name}.`,
        "",
        "You can list an intent mark on a panel. This is intent only — no card is charged on this path.",
        `Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. No close date on this mail.`,
        "",
        `Board: ${site}`,
        "",
        "If you did not join the waitlist, ignore this mail.",
        `— ${BRAND.name}`,
      ].join("\n"),
    ),
  };
}
