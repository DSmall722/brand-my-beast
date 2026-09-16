-- Slice 13.31 — operator-editable waitlist disposable-domain blocklist.
CREATE TABLE IF NOT EXISTS "waitlist_domain_blocklist" (
  "id" text PRIMARY KEY NOT NULL,
  "domain" text NOT NULL UNIQUE,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
