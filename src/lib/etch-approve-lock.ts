/**
 * Slice 12.28 — operator cannot approve etch finish while pledged < $120,000.
 */

import { GOAL_USD, formatUsd, isEtchUnlocked } from "./campaign";

export type OperatorFinish = "wrap" | "etch";

export function parseOperatorFinish(raw: unknown): OperatorFinish {
  return String(raw ?? "").trim() === "etch" ? "etch" : "wrap";
}

/**
 * Gate etch finish approvals / mockup queues under buyout.
 */
export function assertEtchFinishAllowed(input: {
  finish: OperatorFinish;
  pledgedUsd: number;
}): { ok: true } | { ok: false; error: string } {
  if (input.finish !== "etch") return { ok: true };
  if (isEtchUnlocked(input.pledgedUsd)) return { ok: true };
  return {
    ok: false,
    error: `Cannot approve etch finish while pledged is under ${formatUsd(GOAL_USD)}. Wrap only until buyout.`,
  };
}
