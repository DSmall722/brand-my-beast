import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLOSE_AT } from "./campaign";

export const LOCKED_CLOSE_AT = "2026-12-31T17:00:00.000Z";

export const CLOSE_AT_ASSIGNMENT_RE =
  /export\s+const\s+CLOSE_AT\s*:\s*[^=]+=\s*([^;]+);/;

export type CloseAtSourceCheck = {
  found: boolean;
  rhs: string | null;
  isNullLiteral: boolean;
};

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

export function findCloseAtViolations(
  root: string = process.cwd(),
  runtimeCloseAt: string | null = CLOSE_AT,
): string[] {
  const violations: string[] = [];
  if (runtimeCloseAt !== LOCKED_CLOSE_AT) {
    violations.push(`runtime CLOSE_AT is ${JSON.stringify(runtimeCloseAt)}`);
  }
  const parsed = parseCloseAtAssignment(readCampaignSource(root));
  const expectedRhs = `"${LOCKED_CLOSE_AT}"`;
  if (!parsed.found) {
    violations.push("campaign.ts missing export const CLOSE_AT assignment");
  } else if (parsed.rhs !== expectedRhs) {
    violations.push(
      `campaign.ts CLOSE_AT RHS is ${JSON.stringify(parsed.rhs)}, expected ${expectedRhs}`,
    );
  }
  return violations;
}
