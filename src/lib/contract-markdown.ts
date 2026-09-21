/**
 * Slice 12.25 — contract markdown template from CAMPAIGN wreck rules.
 * Template only. Not a signature product. No card capture.
 */

import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  WRECK_REFUND_RULE_IDS,
  formatUsd,
} from "./campaign";

export const CONTRACT_NOT_SIGNATURE =
  "Not a signature product. This markdown is a draft template only — no e-sign, no wet-ink capture on this path.";

export type ContractWreckClause = {
  id: (typeof WRECK_REFUND_RULE_IDS)[number];
  title: string;
  body: string;
};

/** CAMPAIGN.md / RULES.md wreck outcomes — money locked to floor + buyout. */
export const CONTRACT_WRECK_CLAUSES: readonly ContractWreckClause[] = [
  {
    id: "campaign-miss",
    title: "Campaign miss",
    body: `If the board misses ${formatUsd(FLOOR_USD)}: full refund, including deposits. No order. No wrap. No etch.`,
  },
  {
    id: "wrap-pro-rata",
    title: "Wrap year cut short",
    body: "Wrap lasts 12 months from install day — not from close. If the truck is totaled or sold before month 12, wrap seats get a pro-rata refund for the months left.",
  },
  {
    id: "immortal-fragment",
    title: "Immortal etch already installed",
    body: `At ${formatUsd(GOAL_USD)} buyout only: Immortal etch may be cut. After install there is no cash refund of that finish. The record is a physical fragment of the etched panel plus a vault certificate.`,
  },
] as const;

/**
 * Markdown contract template. Pure builder. Intent / draft only.
 */
export function buildContractMarkdown(): string {
  const wreckLines = CONTRACT_WRECK_CLAUSES.flatMap((clause) => [
    `### ${clause.title}`,
    "",
    clause.body,
    "",
  ]);

  const lines = [
    `# ${BRAND.name} — seat contract template`,
    "",
    CONTRACT_NOT_SIGNATURE,
    "",
    "## Money fences",
    "",
    `- Floor ${formatUsd(FLOOR_USD)} — order the Cyberbeast + wrap reserve. Miss = full refund.`,
    `- Buyout ${formatUsd(GOAL_USD)} — campaign buys the truck; Immortal etch unlocks on nine steel faces.`,
    `- ${formatUsd(FLOOR_USD)}–${formatUsd(GOAL_USD - 1)} — ordered + wrapped. No etch.`,
    "- Deposit 20% to list. Remainder if that bid wins. Still no card capture on this path.",
    "",
    "## Term",
    "",
    "- Wrap: 12 months from install day — not from close.",
    "- Immortal etch: until that piece of steel is gone. Year two is a new buy, not a gift.",
    "",
    "## Wreck and refund",
    "",
    "Write these into the live contract before capture (CAMPAIGN.md / RULES.md).",
    "",
    ...wreckLines,
    "## Product locks",
    "",
    "- Cyberbeast only. No cheaper trim if the floor misses.",
    "- One brand per trade.",
    "- No reserved VIN before the floor clears.",
    "- No invented impression counts.",
    "",
    "## Contact",
    "",
    `- ${BRAND.email}`,
    `- ${BRAND.domain}`,
    `- ${BRAND.handle}`,
    `- Operator: ${BRAND.operator}`,
    "",
    `CLOSE_AT ${CLOSE_AT === null ? "unset" : CLOSE_AT}. Not Tesla.`,
    "",
  ];

  const body = lines.join("\n");
  if (/\blease\b/i.test(body)) {
    throw new Error("Contract template must not contain lease copy");
  }
  return body;
}
