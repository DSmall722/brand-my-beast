-- Slice 12.9 — soft-delete withdrawn rows via deleted_at.
-- Never hard-delete an approved bid in app code.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
CREATE INDEX IF NOT EXISTS "intent_bids_deleted_at_idx"
  ON "intent_bids" ("deleted_at");
