import { resolveAuthMode } from "@/lib/auth/mode";

/**
 * Operator gate for the intent approval thread.
 * Live: OPERATOR_EMAILS allow-list. Test: any @example.com address.
 */
export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allow.includes(email.toLowerCase())) return true;
  if (resolveAuthMode() === "test" && email.endsWith("@example.com")) {
    return true;
  }
  return false;
}
