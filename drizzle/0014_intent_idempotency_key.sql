-- Slice 12.4 — idempotency key on intent list. Replay does not double-list.
-- Intent only; no capture columns.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "intent_bids_idempotency_key_uidx"
  ON "intent_bids" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
