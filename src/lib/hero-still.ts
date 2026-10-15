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

export const HERO_STILL_NARROW_MEDIA = "(max-width: 720px)";

export const HERO_STILL_SIZES = `${HERO_STILL_NARROW_MEDIA} 640px, 1728px`;

export const HERO_STILL_SRCSET = `${HERO_STILL_NARROW.src} ${HERO_STILL_NARROW.width}w, ${HERO_STILL_WIDE.src} ${HERO_STILL_WIDE.width}w`;

const TESLA_CDN = /digitalassets\.tesla\.com|static-assets\.tesla\.com|(?:^|\/\/|\.)tesla\.com/i;

export function isLocalHeroStillPath(src: string): boolean {
  if (!src.startsWith("/") || src.startsWith("//")) return false;
  return !TESLA_CDN.test(src);
}
