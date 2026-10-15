import { resolveAuthMode, type AuthEnv } from "@/lib/auth/mode";

export function isShopPartnerEmail(
  email: string | null | undefined,
  env: AuthEnv = process.env,
): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  const allow = (env.SHOP_PARTNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allow.includes(normalized)) return true;
  if (resolveAuthMode(env) === "test" && normalized === "shop@example.com") {
    return true;
  }
  return false;
}
