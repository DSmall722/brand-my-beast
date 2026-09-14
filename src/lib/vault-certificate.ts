/**
 * Immortal vault certificate copy (FEATURES P4 #45).
 * Record of etch — not cash, not a VIN, no invented impressions.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const VAULT_CERTIFICATE_LEAD = `Immortal etch gets a vault certificate after install — only if the board hits ${formatUsd(GOAL_USD)}. Not cash. No reserved VIN. Miss ${formatUsd(FLOOR_USD)} and there is no certificate. Still no card charge.`;

export const VAULT_CERTIFICATE_FACTS = [
  {
    id: "buyout-unlock",
    text: `Unlocks only at ${formatUsd(GOAL_USD)} buyout. Etch stays locked under that mark.`,
  },
  {
    id: "until-steel-gone",
    text: "Etch lasts until that piece of steel is gone. The certificate is the record, not a second wrap term.",
  },
  {
    id: "not-cash",
    text: "Not a cash refund of the etch premium. Not a VIN. No invented impressions.",
  },
  {
    id: "floor-miss",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No certificate.`,
  },
] as const;

export function vaultCertificateCopyIsSafe(): boolean {
  const blob = [VAULT_CERTIFICATE_LEAD, ...VAULT_CERTIFICATE_FACTS.map((f) => f.text)].join(
    " ",
  );
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob)
  );
}
