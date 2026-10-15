import { BRAND, formatUsd } from "@/lib/campaign";
import { withCanSpamFooter } from "./can-spam";
import type { EmailTemplate } from "./intent-status";

export type OperatorDigestTemplateInput = {
  pendingCount: number;
  waitlistCount: number;
  pledgedUsd: number;
  shortfallFloorUsd: number;
  shortfallGoalUsd: number;
  seatedPanels: number;
  openSeats: number;
  floorUsd: number;
  goalUsd: number;
  closeAt: string | null;
  generatedAt: string;
};

export function operatorDigestEmailTemplate(
  digest: OperatorDigestTemplateInput,
): EmailTemplate {
  return {
    subject: `${BRAND.name} digest — ${digest.pendingCount} pending / ${formatUsd(digest.pledgedUsd)} pledged`,
    text: withCanSpamFooter(
      [
        `${BRAND.name} operator digest`,
        `Generated: ${digest.generatedAt}`,
        "",
        `Pending intents: ${digest.pendingCount}`,
        `Waitlist signups: ${digest.waitlistCount}`,
        `Pledged (approved): ${formatUsd(digest.pledgedUsd)}`,
        `Short of floor (${formatUsd(digest.floorUsd)}): ${formatUsd(digest.shortfallFloorUsd)}`,
        `Short of buyout (${formatUsd(digest.goalUsd)}): ${formatUsd(digest.shortfallGoalUsd)}`,
        `Seated panels: ${digest.seatedPanels} / open seats: ${digest.openSeats}`,
        `CLOSE_AT: ${digest.closeAt === null ? "null" : digest.closeAt}`,
        "",
        "Intent only. No cards charged. Does not post to X.",
        `— ${BRAND.name} <${BRAND.email}>`,
      ].join("\n"),
    ),
  };
}
