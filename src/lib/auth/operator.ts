import { resolveAuthMode } from "@/lib/auth/mode";

export function isOperatorEmail(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  const allow = (env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allow.includes(email.toLowerCase())) return true;
  if (
    resolveAuthMode(env) === "test" &&
    email.endsWith("@example.com")
  ) {
    return true;
  }
  return false;
}
