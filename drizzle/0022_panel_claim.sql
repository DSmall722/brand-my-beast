ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'bid' NOT NULL;

CREATE TABLE IF NOT EXISTS "panel_claim_state" (
  "panel_id" text PRIMARY KEY NOT NULL,
  "claim_price_usd" integer NOT NULL,
  "claim_status" text DEFAULT 'available' NOT NULL,
  "claimed_intent_id" uuid,
  "claimed_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "campaign_claim_state" (
  "id" text PRIMARY KEY NOT NULL,
  "committed_total_usd" integer DEFAULT 0 NOT NULL,
  "tier_locked" text DEFAULT 'none' NOT NULL,
  "purchase_triggered_at" timestamptz,
  "board_closed_reason" text
);

CREATE TABLE IF NOT EXISTS "campaign_claim_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event" text NOT NULL,
  "panel_id" text,
  "intent_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

INSERT INTO "campaign_claim_state" ("id", "committed_total_usd", "tier_locked")
VALUES ('default', 0, 'none')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "panel_claim_state" ("panel_id", "claim_price_usd", "claim_status")
VALUES
  ('hood', 13000, 'available'),
  ('front-fascia', 10000, 'available'),
  ('front-bumper', 4000, 'available'),
  ('driver-door', 22000, 'available'),
  ('driver-rear-quarter', 6000, 'available'),
  ('driver-bed', 10000, 'available'),
  ('passenger-door', 22000, 'available'),
  ('passenger-rear-quarter', 6000, 'available'),
  ('passenger-bed', 10000, 'available'),
  ('tailgate', 13000, 'available'),
  ('rear-bumper', 4000, 'available')
ON CONFLICT ("panel_id") DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS "intent_bids_one_paid_claim_per_panel_idx"
  ON "intent_bids" ("panel_id")
  WHERE "kind" = 'claim'
    AND "deposit_paid_at" IS NOT NULL
    AND "refund_status" = 'none'
    AND "deleted_at" IS NULL;
