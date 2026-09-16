/**
 * Slice 12.11 — intent status email templates (files under src/emails/).
 * Intent only. Never claims a card was charged.
 */

import { BRAND, formatUsd } from "@/lib/campaign";
import type { IntentBid } from "@/lib/intent";
import { withCanSpamFooter } from "./can-spam";

export type IntentStatusKind =
  | "listed"
  | "outbid"
  | "approved"
  | "rejected";

export type EmailTemplate = {
  subject: string;
  text: string;
};

function finish(subject: string, lines: string[]): EmailTemplate {
  return {
    subject,
    text: withCanSpamFooter(lines.join("\n")),
  };
}

export function intentStatusEmailTemplate(input: {
  kind: IntentStatusKind;
  bid: IntentBid;
  note?: string;
  /** Slice 13.18 / 9.2 — next seat minimum after this outbid. */
  nextMinimumUsd?: number;
}): EmailTemplate {
  const panel = input.bid.panelId;
  const mark = formatUsd(input.bid.standingUsd);
  const brand = input.bid.brandLabel;

  switch (input.kind) {
    case "listed":
      return finish(`Intent listed — ${panel} at ${mark}`, [
        `Your intent for ${brand} on ${panel} is listed at ${mark}.`,
        "This is intent only. No card was charged.",
        `— ${BRAND.name}`,
      ]);
    case "outbid": {
      const nextMin =
        input.nextMinimumUsd != null && Number.isFinite(input.nextMinimumUsd)
          ? formatUsd(input.nextMinimumUsd)
          : null;
      return finish(`Outbid on ${panel}`, [
        `Your standing mark on ${panel} (${brand}, ${mark}) was outbid.`,
        nextMin
          ? `Next minimum to reclaim the seat: ${nextMin}.`
          : "You can place a higher intent when you are ready.",
        "No card was charged.",
        `— ${BRAND.name}`,
      ]);
    }
    case "approved":
      return finish(`Intent approved — ${panel}`, [
        `Your intent for ${brand} on ${panel} at ${mark} was approved.`,
        "Still intent only until the money path is live. No card was charged.",
        `— ${BRAND.name}`,
      ]);
    case "rejected": {
      const note = input.note?.trim();
      return finish(`Intent rejected — ${panel}`, [
        `Your intent for ${brand} on ${panel} at ${mark} was rejected.`,
        note ? `Operator note: ${note}` : "No operator note was attached.",
        "No card was charged.",
        `— ${BRAND.name}`,
      ]);
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}
