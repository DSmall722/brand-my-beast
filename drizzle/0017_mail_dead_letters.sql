-- Slice 12.12 — dead-letter for failed Resend sends. Operator can retry.
-- Intent / notify only — no capture columns.
CREATE TABLE IF NOT EXISTS "mail_dead_letters" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "from_address" text NOT NULL,
  "to_address" text NOT NULL,
  "subject" text NOT NULL,
  "body_text" text NOT NULL,
  "error" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "retried_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "mail_dead_letters_status_idx"
  ON "mail_dead_letters" ("status");
CREATE INDEX IF NOT EXISTS "mail_dead_letters_created_at_idx"
  ON "mail_dead_letters" ("created_at");
