-- Slice 12.3 — at most one approved standing row per panel. Intent only; no capture columns.
CREATE UNIQUE INDEX IF NOT EXISTS "intent_bids_one_approved_per_panel_idx"
  ON "intent_bids" ("panel_id")
  WHERE "status" = 'approved';
