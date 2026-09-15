-- Slice 8.5 — artwork blobs (or equivalent). Intent artwork_url stores path only.
CREATE TABLE IF NOT EXISTS "artwork_blobs" (
  "id" text PRIMARY KEY NOT NULL,
  "content_type" text NOT NULL,
  "body_base64" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
