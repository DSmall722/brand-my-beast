/**
 * Slice 12.16 — account delete anonymizes bid user ids.
 * Public standing amounts stay on the board.
 */

import { createHash } from "node:crypto";

/** Opaque prefix for deleted-account owners on intent rows. */
export const DELETED_USER_PREFIX = "deleted:";

export function isAnonymizedUserId(userId: string): boolean {
  return userId.startsWith(DELETED_USER_PREFIX);
}

/**
 * Deterministic anonymized id. Re-running delete on the same account
 * converges to the same opaque token (idempotent).
 */
export function anonymizedUserId(userId: string): string {
  if (isAnonymizedUserId(userId)) return userId;
  const digest = createHash("sha256")
    .update(`bmb-account-delete:${userId}`)
    .digest("hex")
    .slice(0, 24);
  return `${DELETED_USER_PREFIX}${digest}`;
}
