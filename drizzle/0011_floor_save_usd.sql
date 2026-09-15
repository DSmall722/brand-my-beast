-- Slice 9.4 — floor-save raise-to Y on an intent. Stored, not charged.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "floor_save_usd" integer;
