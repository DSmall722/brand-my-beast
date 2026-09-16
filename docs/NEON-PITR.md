# Neon PITR runbook — BrandMyBeast

Slice **11.6**. Repo-only runbook. **No dashboard clicks from agents or CI.**
A human operator follows this when Production Postgres needs point-in-time
recovery. Slice **12.44** will add a restore-drill checklist beside this file.

Money fences (do not invent a third number):

- Floor **$58,000** — order + wrap reserve. Miss = refund.
- Buyout **$120,000** — etch unlock. `CLOSE_AT` stays null until P3.
- Deposit **20%** of standing is display math only until Stripe exists.
- No Stripe capture in this runbook. No lease. No personal operator Gmail.

## What this protects

Production waitlist + intent ledger live in Neon Postgres (`DATABASE_URL`).
Memory mode is CI only. Restoring the wrong branch or time window can wipe
approved standing or waitlist emails — treat PITR as a deliberate human act.

## Preconditions (human)

1. Confirm Vercel Production is pointed at the Neon project that holds live
   waitlist / intent tables (not a preview branch).
2. Confirm retention window covers the desired restore time (Neon plan PITR
   history). If the window has expired, stop — do not invent a backup.
3. Confirm `CLOSE_AT` is still unset unless a human already started P3.
4. Do **not** ask an agent to click the Neon or Vercel dashboards. Paste
   outcomes back into an issue or this file’s checklist when done.

## Restore outline (human only)

These steps are documentation. They are not automation.

1. **Freeze writes** — pause or scale down Production deploys that write
   waitlist / intents if an incident is still in progress.
2. **Pick restore time** — choose the UTC timestamp just before the bad write
   (failed migration, bad approve batch, accidental wipe).
3. **Create a restore branch** in the Neon console (or CLI) from that
   timestamp. Do not overwrite Production until the branch is verified.
4. **Verify on the restore branch** — `SELECT count(*)` on waitlist and
   approved intents; spot-check pledged dollars still equal approved standing
   only; floor / buyout constants are app code (`FLOOR_USD=58000`,
   `GOAL_USD=120000`) and must not be edited as part of restore.
5. **Cut over** — point Production `DATABASE_URL` at the restored branch / role
   only after verification. Keep the pre-restore branch until the next
   successful deploy health check.
6. **Redeploy** — when the Vercel usage hold is lifted, redeploy main so
   runtime picks up the new connection string. Do not invent a close date.

## Agent / CI stop rules

- Do not open Neon or Vercel dashboards from this repo’s automation.
- Do not run destructive SQL against Production from Playwright.
- Do not set `CLOSE_AT`, wire Stripe, or tweet from a restore.
- If restore is needed during the Vercel hold, document the chosen timestamp
  here or in an issue and wait for a human to finish cutover.

## Related

- `ARCHITECTURE.md` — Postgres + Drizzle production stack
- `CAMPAIGN.md` / `RULES.md` — money and refund rules that survive a restore
- SLICES **12.44** — backup restore drill doc next to this file
- SLICES **11.10** — redeploy when the Vercel hold lifts (human)
