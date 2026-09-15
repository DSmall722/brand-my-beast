-- Slice 9.3 — per-panel soft-close extension. Never a campaign close clock.
CREATE TABLE IF NOT EXISTS "panel_extensions" (
  "panel_id" text PRIMARY KEY NOT NULL,
  "extended_until" timestamptz
);
