-- Slice 12.8 — intent revision history (brand / trade / amount / art + timestamp).
-- Intent only; no capture columns.
CREATE TABLE IF NOT EXISTS "intent_revisions" (
  "id" text PRIMARY KEY NOT NULL,
  "bid_id" text NOT NULL,
  "brand_label" text NOT NULL,
  "trade_label" text NOT NULL,
  "standing_usd" integer NOT NULL,
  "artwork_url" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "intent_revisions_bid_id_idx"
  ON "intent_revisions" ("bid_id");
CREATE INDEX IF NOT EXISTS "intent_revisions_created_at_idx"
  ON "intent_revisions" ("created_at");
