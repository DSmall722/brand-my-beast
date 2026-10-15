import { createHash } from "node:crypto";

export const DELETED_USER_PREFIX = "deleted:";

export function isAnonymizedUserId(userId: string): boolean {
  return userId.startsWith(DELETED_USER_PREFIX);
}

export function anonymizedUserId(userId: string): string {
  if (isAnonymizedUserId(userId)) return userId;
  const digest = createHash("sha256")
    .update(`bmb-account-delete:${userId}`)
    .digest("hex")
    .slice(0, 24);
  return `${DELETED_USER_PREFIX}${digest}`;
}
