/**
 * Slice 13.22 — `shop-ready` requires a vector URL or artwork blob key.
 * Screenshot-only raster links (png/jpg/…) cannot be marked shop-ready.
 */

import { isArtworkBlobPath } from "./artwork-blob";

/** Shop cut vectors — matches wrap-shop checklist (AI / SVG / PDF) + EPS. */
const VECTOR_EXT = /\.(svg|ai|pdf|eps)(?:$|[?#])/i;

/** Low-res / screenshot raster — not enough for shop-ready. */
const RASTER_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?)(?:$|[?#])/i;

export const SHOP_READY_ARTWORK_ERROR =
  "Shop-ready needs a vector URL (.svg / .ai / .pdf / .eps) or an artwork blob key — not a screenshot-only raster.";

export function isShopReadyArtworkBlobKey(artworkUrl: string): boolean {
  return isArtworkBlobPath(artworkUrl.trim());
}

export function isShopReadyVectorUrl(artworkUrl: string): boolean {
  const trimmed = artworkUrl.trim();
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  ) {
    return false;
  }
  try {
    const path = new URL(trimmed).pathname;
    return VECTOR_EXT.test(path);
  } catch {
    return false;
  }
}

export function isScreenshotOnlyArtworkUrl(artworkUrl: string): boolean {
  const trimmed = artworkUrl.trim();
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  ) {
    return false;
  }
  try {
    const path = new URL(trimmed).pathname;
    return RASTER_EXT.test(path);
  } catch {
    return false;
  }
}

/**
 * True when art may be marked `shop-ready`: blob path or vector http(s) URL.
 */
export function artworkAllowsShopReady(
  artworkUrl: string | null | undefined,
): boolean {
  if (artworkUrl == null || artworkUrl.trim() === "") return false;
  const trimmed = artworkUrl.trim();
  if (isShopReadyArtworkBlobKey(trimmed)) return true;
  if (isShopReadyVectorUrl(trimmed)) return true;
  return false;
}

export function assertArtworkAllowsShopReady(
  artworkUrl: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (artworkAllowsShopReady(artworkUrl)) {
    return { ok: true };
  }
  return { ok: false, error: SHOP_READY_ARTWORK_ERROR };
}
