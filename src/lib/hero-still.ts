/**
 * Slice 16.9 — local hero stills. 1728-wide master and 640-wide phone.
 * No Tesla CDN. Wide file is the concept master cropped to the 16:9 well.
 * Default src stays `/hero-truck-preview.jpg`.
 */

export const HERO_STILL_WIDE = {
  src: "/hero-truck-preview.jpg",
  width: 1728,
  height: 972,
} as const;

export const HERO_STILL_NARROW = {
  src: "/hero-truck-preview-640.jpg",
  width: 640,
  height: 360,
} as const;

/** Phones under the hero CSS break get the 640 file. Wider viewports get 1728. */
export const HERO_STILL_NARROW_MEDIA = "(max-width: 720px)";

export const HERO_STILL_SIZES = `${HERO_STILL_NARROW_MEDIA} 640px, 1728px`;

export const HERO_STILL_SRCSET = `${HERO_STILL_NARROW.src} ${HERO_STILL_NARROW.width}w, ${HERO_STILL_WIDE.src} ${HERO_STILL_WIDE.width}w`;

const TESLA_CDN = /digitalassets\.tesla\.com|static-assets\.tesla\.com|(?:^|\/\/|\.)tesla\.com/i;

/** True when a hero URL is a same-origin path, not a Tesla CDN. */
export function isLocalHeroStillPath(src: string): boolean {
  if (!src.startsWith("/") || src.startsWith("//")) return false;
  return !TESLA_CDN.test(src);
}
