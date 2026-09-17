-- Slice 16.0c — whole-truck interest on waitlist. Not pledged. Default false.
ALTER TABLE "waitlist_signups"
  ADD COLUMN IF NOT EXISTS "want_whole_truck" boolean NOT NULL DEFAULT false;
