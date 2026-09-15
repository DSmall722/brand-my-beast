/**
 * Artwork attachment on an intent mark — URL or small image upload.
 * Parsed at the action boundary. Ledger stores http(s) or blob path only (slice 8.5).
 */

/** ~90KB binary ceiling once base64-expanded. */
export const ARTWORK_MAX_DATA_URL_CHARS = 120_000;
export const ARTWORK_MAX_URL_CHARS = 2_000;

const DATA_IMAGE =
  /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,/i;

export type ParseArtworkResult =
  | { ok: true; artworkUrl: string | null }
  | { ok: false; error: string };

/**
 * Accept https/http URL, or a data:image upload. Empty → null.
 * URL and upload together → error (one channel).
 */
export function parseIntentArtwork(input: {
  artworkUrl?: string;
  artworkUpload?: string;
}): ParseArtworkResult {
  const url = (input.artworkUrl ?? "").trim();
  const upload = (input.artworkUpload ?? "").trim();

  if (url && upload) {
    return {
      ok: false,
      error: "Provide an artwork URL or an upload, not both.",
    };
  }

  if (!url && !upload) {
    return { ok: true, artworkUrl: null };
  }

  const value = upload || url;

  if (value.startsWith("data:")) {
    if (!DATA_IMAGE.test(value)) {
      return {
        ok: false,
        error: "Artwork upload must be PNG, JPEG, WebP, GIF, or SVG.",
      };
    }
    if (value.length > ARTWORK_MAX_DATA_URL_CHARS) {
      return {
        ok: false,
        error: "Artwork upload is too large (keep under ~90KB).",
      };
    }
    return { ok: true, artworkUrl: value };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "Artwork URL must be a valid http(s) link." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Artwork URL must be http(s)." };
  }
  if (value.length > ARTWORK_MAX_URL_CHARS) {
    return { ok: false, error: "Artwork URL is too long." };
  }
  return { ok: true, artworkUrl: value };
}

export function artworkIsUpload(artworkUrl: string): boolean {
  return (
    artworkUrl.startsWith("data:image/") ||
    artworkUrl.startsWith("/api/artwork/")
  );
}
