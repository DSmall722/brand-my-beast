-- Slice 8.8 — operator ban-list patterns (hard-reject matching intents).
CREATE TABLE IF NOT EXISTS "operator_ban_list" (
  "id" text PRIMARY KEY NOT NULL,
  "pattern" text NOT NULL UNIQUE,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
