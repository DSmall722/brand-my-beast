/**
 * Slice 12.11 — intent status email templates (files under src/emails/).
 * Intent only. Never claims a card was charged.
 */

import { BRAND, formatUsd } from "@/lib/campaign";
import type { IntentBid } from "@/lib/intent";

export type IntentStatusKind =
  | "listed"
  | "outbid"
  | "approved"
  | "rejected";

export type EmailTemplate = {
  subject: string;
  text: string;
};

export function intentStatusEmailTemplate(input: {
  kind: IntentStatusKind;
  bid: IntentBid;
  note?: string;
}): EmailTemplate {
  const panel = input.bid.panelId;
  const mark = formatUsd(input.bid.standingUsd);
  const brand = input.bid.brandLabel;

  switch (input.kind) {
    case "listed":
      return {
        subject: `Intent listed — ${panel} at ${mark}`,
        text: [
          `Your intent for ${brand} on ${panel} is listed at ${mark}.`,
          "This is intent only. No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    case "outbid":
      return {
        subject: `Outbid on ${panel}`,
        text: [
          `Your standing mark on ${panel} (${brand}, ${mark}) was outbid.`,
          "You can place a higher intent when you are ready. No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    case "approved":
      return {
        subject: `Intent approved — ${panel}`,
        text: [
          `Your intent for ${brand} on ${panel} at ${mark} was approved.`,
          "Still intent only until the money path is live. No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    case "rejected": {
      const note = input.note?.trim();
      return {
        subject: `Intent rejected — ${panel}`,
        text: [
          `Your intent for ${brand} on ${panel} at ${mark} was rejected.`,
          note ? `Operator note: ${note}` : "No operator note was attached.",
          "No card was charged.",
          `— ${BRAND.name}`,
        ].join("\n"),
      };
    }
    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}
