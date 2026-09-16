-- Slice 12.2 — optimistic lock token on intent rows. Intent only; no capture columns.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
