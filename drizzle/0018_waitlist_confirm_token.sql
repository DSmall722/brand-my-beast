-- Slice 12.14 — waitlist double-opt-in token + confirmed_at.
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "confirm_token" text;
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_signups_confirm_token_uidx"
  ON "waitlist_signups" ("confirm_token")
  WHERE "confirm_token" IS NOT NULL;
