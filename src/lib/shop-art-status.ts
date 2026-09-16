/**
 * Slice 12.24 — partner art readiness marks.
 * `shop-ready` / `needs-fix`. Intent only — no card capture.
 */

export const SHOP_ART_STATUSES = [
  "unset",
  "shop-ready",
  "needs-fix",
] as const;

export type ShopArtStatus = (typeof SHOP_ART_STATUSES)[number];

export const SHOP_ART_STATUS_LABELS: Record<ShopArtStatus, string> = {
  unset: "Not marked",
  "shop-ready": "shop-ready",
  "needs-fix": "needs-fix",
};

export function isShopArtStatus(value: string): value is ShopArtStatus {
  return (SHOP_ART_STATUSES as readonly string[]).includes(value);
}

export function parseShopArtStatus(raw: unknown): ShopArtStatus | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!isShopArtStatus(trimmed)) return null;
  return trimmed;
}
