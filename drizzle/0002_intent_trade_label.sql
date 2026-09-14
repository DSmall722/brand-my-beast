-- One brand per trade (CAMPAIGN). Free-text trade label; no payment columns.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "trade_label" text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS "intent_bids_trade_label_idx" ON "intent_bids" ("trade_label");
