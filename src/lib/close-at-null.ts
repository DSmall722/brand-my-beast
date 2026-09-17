/**
 * Slice 13.43 — CI fails if CLOSE_AT is non-null.
 * Checks the exported runtime value and the campaign.ts source assignment.
 * Does not set CLOSE_AT. Does not wire Stripe.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLOSE_AT } from "./campaign";

/** Matches `export const CLOSE_AT: … = <rhs>;` in campaign.ts. */
export const CLOSE_AT_ASSIGNMENT_RE =
  /export\s+const\s+CLOSE_AT\s*:\s*[^=]+=\s*([^;]+);/;

export type CloseAtSourceCheck = {
  found: boolean;
  rhs: string | null;
  isNullLiteral: boolean;
};

/** Parse the RHS of the CLOSE_AT export in campaign.ts source text. */
export function parseCloseAtAssignment(source: string): CloseAtSourceCheck {
  const match = source.match(CLOSE_AT_ASSIGNMENT_RE);
  if (!match?.[1]) {
    return { found: false, rhs: null, isNullLiteral: false };
  }
  const rhs = match[1].trim();
  return {
    found: true,
    rhs,
    isNullLiteral: rhs === "null",
  };
}

export function readCampaignSource(root: string = process.cwd()): string {
  return readFileSync(join(root, "src/lib/campaign.ts"), "utf8");
}

/**
 * Empty array = gate passes.
 * Non-empty strings describe why CI must fail.
 */
export function findCloseAtViolations(
  root: string = process.cwd(),
  runtimeCloseAt: string | null = CLOSE_AT,
): string[] {
  const violations: string[] = [];
  if (runtimeCloseAt !== null) {
    violations.push(`runtime CLOSE_AT is ${JSON.stringify(runtimeCloseAt)}`);
  }
  const parsed = parseCloseAtAssignment(readCampaignSource(root));
  if (!parsed.found) {
    violations.push("campaign.ts missing export const CLOSE_AT assignment");
  } else if (!parsed.isNullLiteral) {
    violations.push(
      `campaign.ts CLOSE_AT RHS is ${JSON.stringify(parsed.rhs)}, expected null`,
    );
  }
  return violations;
}
