/**
 * Content-rights catalog. Preference only — no tweet send, no capture.
 */

export const CONTENT_RIGHT_OPTIONS = [
  {
    id: "film-seat",
    label: "BrandMyBeast may film this seat on the truck.",
  },
  {
    id: "tag-handle",
    label:
      "BrandMyBeast may name the brand on @BrandMyBeast after install. No auto-tweet on this path.",
  },
  {
    id: "proof-stills",
    label: "Odometer and trip stills after the truck exists.",
  },
] as const;

export type ContentRightId = (typeof CONTENT_RIGHT_OPTIONS)[number]["id"];

export const CONTENT_RIGHTS_LOCKS = [
  {
    id: "no-impressions",
    text: "No invented impression counts or CPMs.",
  },
  {
    id: "no-tweet",
    text: "No auto-tweet. Tagged posts wait until the truck exists.",
  },
  {
    id: "no-clock",
    text: "No close clock on this path.",
  },
] as const;

export const DEFAULT_CONTENT_RIGHTS: readonly ContentRightId[] =
  CONTENT_RIGHT_OPTIONS.map((option) => option.id);

export function isContentRightId(value: string): value is ContentRightId {
  return CONTENT_RIGHT_OPTIONS.some((option) => option.id === value);
}

export function parseContentRightIds(
  raw: readonly string[],
): ContentRightId[] {
  return raw.filter(isContentRightId);
}

export function contentRightsCopyIsSafe(): boolean {
  const blob = [
    ...CONTENT_RIGHT_OPTIONS.map((option) => option.label),
    ...CONTENT_RIGHTS_LOCKS.map((lock) => lock.text),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle")
  );
}
