-- Slice 8.9 — audit log on approve / reject (who, when, note id).
CREATE TABLE IF NOT EXISTS "operator_audit_log" (
  "id" text PRIMARY KEY NOT NULL,
  "bid_id" text NOT NULL,
  "decision" text NOT NULL,
  "actor_email" text NOT NULL,
  "actor_user_id" text,
  "note_id" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "operator_audit_log_created_at_idx"
  ON "operator_audit_log" ("created_at");
