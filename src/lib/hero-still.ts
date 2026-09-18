/**
 * Slice 16.9 — local hero stills. 1280-wide and 640-wide. No Tesla CDN.
 * Default src stays the 1280 file so existing seat photos keep that path.
 */

export const HERO_STILL_WIDE = {
  src: "/hero-truck-preview.jpg",
  width: 1280,
  height: 720,
} as const;

export const HERO_STILL_NARROW = {
  src: "/hero-truck-preview-640.jpg",
  width: 640,
  height: 360,
} as const;

/** Phones under the hero CSS break get the 640 file. Wider viewports get 1280. */
export const HERO_STILL_NARROW_MEDIA = "(max-width: 720px)";

export const HERO_STILL_SIZES = `${HERO_STILL_NARROW_MEDIA} 640px, 1280px`;

export const HERO_STILL_SRCSET = `${HERO_STILL_NARROW.src} ${HERO_STILL_NARROW.width}w, ${HERO_STILL_WIDE.src} ${HERO_STILL_WIDE.width}w`;

const TESLA_CDN = /digitalassets\.tesla\.com|static-assets\.tesla\.com|(?:^|\/\/|\.)tesla\.com/i;

/** True when a hero URL is a same-origin path, not a Tesla CDN. */
export function isLocalHeroStillPath(src: string): boolean {
  if (!src.startsWith("/") || src.startsWith("//")) return false;
  return !TESLA_CDN.test(src);
}
