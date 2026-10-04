-- Deposit capture. deposit_paid_at is set by the Stripe webhook, not the client.
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "deposit_paid_at" timestamptz;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "stripe_payment_id" text;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "refund_status" text DEFAULT 'none' NOT NULL;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "deposit_captured_usd" integer DEFAULT 0 NOT NULL;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "deposit_credit_usd" integer DEFAULT 0 NOT NULL;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" text;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "remainder_due_at" timestamptz;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "remainder_paid_at" timestamptz;
ALTER TABLE "intent_bids" ADD COLUMN IF NOT EXISTS "invoice_credited_at" timestamptz;

CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" text PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "processed_at" timestamptz DEFAULT now() NOT NULL
);
