# Drizzle migrate runbook — BrandMyBeast

Slice **12.43** (runbook) + **13.44** (checked-in journal). Repo-only path for
applying SQL under `drizzle/` to Neon.
**No dashboard clicks from agents or CI.** A human operator runs migrations
against Production when a new numbered `.sql` file lands on `main`.

Money fences (do not invent a third number):

- Floor **$58,000** — order + wrap reserve. Miss = refund.
- Buyout **$120,000** — etch unlock. `CLOSE_AT` stays null until P3.
- Deposit **20%** of standing is display math only until Stripe exists.
- No Stripe capture in this runbook. No lease. No personal operator Gmail.

## What lives where

- Schema source of truth: `src/lib/db/schema.ts`
- Numbered SQL migrations: `drizzle/0001_*.sql` … (see `/operator/health`)
- **Migration journal (slice 13.44):** `drizzle/meta/_journal.json` — checked
  into git. Every on-disk `drizzle/NNNN_*.sql` tag must appear here. This is
  what `drizzle-orm` `readMigrationFiles` / migrate needs. **`db:push` from a
  laptop is not the production path** and must not be the only way schema
  reaches Neon.
- Local scripts in `package.json`:
  - `npm run db:generate` — `drizzle-kit generate` (dev only; review the diff
    **and** commit the new `.sql` plus the updated `_journal.json`)
  - `npm run db:push` — `drizzle-kit push` (dev / empty branch only)
- Production applies the checked-in SQL files via the journal order. Do not
  rely on `db:push` for Production while waitlist or approved standing exist.

## Preconditions (human)

1. Confirm `DATABASE_URL` points at the Neon project that Production uses
   (not a throwaway preview branch) when you intend to migrate live data.
2. Confirm the new file is the next number after the last migration shown on
   `/operator/health` (or `ls drizzle/*.sql | sort | tail -1`).
3. Confirm `CLOSE_AT` is still unset unless a human already started P3.
4. Prefer a Neon branch or PITR-ready window before a risky DDL. See
   `docs/NEON-PITR.md` (slice 11.6) if you need a restore path.
5. Do **not** ask an agent to click the Neon or Vercel dashboards.

## Apply outline (human only)

These steps are documentation. They are not automation.

1. **Read the SQL** — open the new `drizzle/NNNN_*.sql` file. Confirm it is
   additive (`ADD COLUMN IF NOT EXISTS`, new tables) or that a rollback plan
   exists for destructive changes.
2. **Dry-run on a Neon branch** — copy Production into a branch, set a local
   `DATABASE_URL` to that branch, apply the SQL with `psql` or the Neon SQL
   editor. Smoke: waitlist count, approved standing count, `/operator/health`.
3. **Apply to Production** — run the same SQL against Production `DATABASE_URL`
   only after the branch check passes. Record the migration tag (filename
   without `.sql`) in the deploy notes.
4. **Verify** — reload `/operator/health` as an operator; last migration must
   match the file you applied. Spot-check pledged dollars still equal approved
   standing only. App constants stay `FLOOR_USD=58000` / `GOAL_USD=120000`.
5. **Redeploy** — when the Vercel usage hold is lifted, redeploy `main` so
   runtime matches the schema. Do not invent a close date. Do not wire Stripe.

## Agent / CI stop rules

- Do not open Neon or Vercel dashboards from this repo’s automation.
- Do not run `drizzle-kit push` or raw DDL against Production from Playwright.
- Do not set `CLOSE_AT`, wire Stripe, or tweet from a migrate.
- If a migration fails mid-apply, stop and follow `docs/NEON-PITR.md` — do not
  invent a third money number or a cheaper trim.

## Related

- `/operator/health` — last migration name (slice **12.42**)
- `drizzle/meta/_journal.json` — checked-in migrate order (slice **13.44**)
- `docs/NEON-PITR.md` — restore when a migration goes wrong (slice **11.6**)
- SLICES **12.44** — backup restore drill checklist next to PITR
- `ARCHITECTURE.md` — Postgres + Drizzle production stack
- `CAMPAIGN.md` / `RULES.md` — money and refund rules that survive a migrate
