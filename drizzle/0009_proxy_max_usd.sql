-- Slice 9.1 — optional proxy ceiling on an intent. Agent steps max($250, 10%).
-- Intent only — never a capture column.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "proxy_max_usd" integer;
