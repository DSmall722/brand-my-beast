/**
 * Slice 8.5 — artwork blob store (or equivalent).
 * Intent ledger `artwork_url` holds http(s) or `/api/artwork/{id}` only — never data: URLs.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { artworkBlobs } from "./db/schema";
import {
  ARTWORK_MAX_DATA_URL_CHARS,
  artworkIsUpload,
} from "./intent-artwork";

export const ARTWORK_BLOB_PATH_PREFIX = "/api/artwork/";

export type ArtworkBlobRecord = {
  id: string;
  contentType: string;
  /** Raw base64 payload (no data: prefix). */
  bodyBase64: string;
};

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbArtworkBlobs?: Map<string, ArtworkBlobRecord>;
};

function memoryBlobs(): Map<string, ArtworkBlobRecord> {
  if (!globalStore.__bmbArtworkBlobs) {
    globalStore.__bmbArtworkBlobs = new Map();
  }
  return globalStore.__bmbArtworkBlobs;
}

/** Same CI/local rule as intent ledger — no circular import. */
export function artworkBlobUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

export function isArtworkBlobPath(url: string): boolean {
  return url.startsWith(ARTWORK_BLOB_PATH_PREFIX);
}

export function artworkBlobIdFromPath(url: string): string | null {
  if (!isArtworkBlobPath(url)) return null;
  const id = url.slice(ARTWORK_BLOB_PATH_PREFIX.length).split(/[/?#]/)[0];
  return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

/** Ledger must never persist a data: URL in artwork_url. */
export function assertLedgerArtworkUrl(
  artworkUrl: string | null | undefined,
): void {
  if (artworkUrl == null || artworkUrl === "") return;
  if (artworkUrl.startsWith("data:")) {
    throw new Error("artwork_url must not store data: URLs — use blob storage");
  }
  if (
    artworkUrl.startsWith("http://") ||
    artworkUrl.startsWith("https://") ||
    isArtworkBlobPath(artworkUrl)
  ) {
    return;
  }
  throw new Error("artwork_url must be http(s) or /api/artwork/{id}");
}

function parseDataUrl(dataUrl: string): {
  contentType: string;
  bodyBase64: string;
} | null {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1].toLowerCase(), bodyBase64: match[2] };
}

export type PutArtworkResult =
  | { ok: true; url: string; id: string }
  | { ok: false; error: string };

/**
 * Store a validated data:image upload. Returns a short ledger URL.
 */
export async function putArtworkBlob(
  dataUrl: string,
): Promise<PutArtworkResult> {
  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Only data:image uploads go to blob storage." };
  }
  if (dataUrl.length > ARTWORK_MAX_DATA_URL_CHARS) {
    return {
      ok: false,
      error: "Artwork upload is too large (keep under ~90KB).",
    };
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return {
      ok: false,
      error: "Artwork upload must be PNG, JPEG, WebP, GIF, or SVG.",
    };
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  const record: ArtworkBlobRecord = {
    id,
    contentType: parsed.contentType,
    bodyBase64: parsed.bodyBase64,
  };

  if (artworkBlobUsesMemory()) {
    memoryBlobs().set(id, record);
  } else {
    const db = getDb();
    if (!db) {
      return { ok: false, error: "Artwork storage requires DATABASE_URL." };
    }
    await db.insert(artworkBlobs).values({
      id: record.id,
      contentType: record.contentType,
      bodyBase64: record.bodyBase64,
    });
  }

  return { ok: true, id, url: `${ARTWORK_BLOB_PATH_PREFIX}${id}` };
}

export async function getArtworkBlob(
  id: string,
): Promise<ArtworkBlobRecord | null> {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;

  if (artworkBlobUsesMemory()) {
    return memoryBlobs().get(id) ?? null;
  }

  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(artworkBlobs)
    .where(eq(artworkBlobs.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    contentType: row.contentType,
    bodyBase64: row.bodyBase64,
  };
}

/**
 * Turn a parseIntentArtwork result into a ledger-safe URL.
 * data: uploads → blob path; http(s) passes through; null stays null.
 */
export async function persistArtworkForLedger(
  artworkUrl: string | null,
): Promise<PutArtworkResult | { ok: true; url: null }> {
  if (artworkUrl == null) return { ok: true, url: null };
  if (artworkUrl.startsWith("data:")) {
    return putArtworkBlob(artworkUrl);
  }
  assertLedgerArtworkUrl(artworkUrl);
  return { ok: true, url: artworkUrl, id: "" };
}

export function ledgerArtworkIsStoredUpload(artworkUrl: string): boolean {
  return artworkIsUpload(artworkUrl) || isArtworkBlobPath(artworkUrl);
}

export function resetArtworkBlobStoreForTests(): void {
  memoryBlobs().clear();
}
