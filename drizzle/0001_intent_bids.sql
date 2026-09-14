-- P2 intent ledger. Intent only — no Stripe / capture columns.
CREATE TABLE IF NOT EXISTS "intent_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"panel_id" text NOT NULL,
	"user_id" text NOT NULL,
	"brand_label" text NOT NULL,
	"standing_usd" integer NOT NULL,
	"deposit_usd" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "intent_bids_panel_id_idx" ON "intent_bids" ("panel_id");
CREATE INDEX IF NOT EXISTS "intent_bids_status_idx" ON "intent_bids" ("status");
