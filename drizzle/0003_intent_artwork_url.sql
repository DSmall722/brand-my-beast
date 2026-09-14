-- Artwork URL or small data-URL upload on the intent. Intent only — no capture.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "artwork_url" text;
