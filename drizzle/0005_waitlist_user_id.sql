-- Slice 5.3: link waitlist email to an Auth.js user without dropping the row.
ALTER TABLE "waitlist_signups" ADD COLUMN IF NOT EXISTS "user_id" text;
