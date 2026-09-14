import { resolveAuthMode } from "@/lib/auth/mode";

/**
 * Wrap-shop partner gate for the read-only partner sheet.
 * Live: SHOP_PARTNER_EMAILS allow-list.
 * Test: only shop@example.com (operators stay on @example.com).
 */
export function isShopPartnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  const allow = (process.env.SHOP_PARTNER_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allow.includes(normalized)) return true;
  if (resolveAuthMode() === "test" && normalized === "shop@example.com") {
    return true;
  }
  return false;
}
