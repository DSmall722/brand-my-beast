# Neon PITR restore drill — BrandMyBeast

Slice **12.44**. Checklist that sits next to `docs/NEON-PITR.md` (slice **11.6**).
**No dashboard clicks from agents or CI.** A human operator ticks these boxes
during a scheduled restore drill (or a real incident). Leaving boxes unchecked
is fine until a human runs the drill.

Money fences (do not invent a third number):

- Floor **$58,000** — order + wrap reserve. Miss = refund.
- Buyout **$120,000** — etch unlock. `CLOSE_AT` stays null until P3.
- Deposit **20%** of standing is display math only until Stripe exists.
- No Stripe capture in this drill. No lease. No personal operator Gmail.

## Drill goal

Prove the operator can create a Neon restore branch from a known UTC time,
verify waitlist + approved standing on that branch, and decide cutover — without
an agent touching dashboards or inventing money numbers.

## Pre-drill (human)

- [ ] Read `docs/NEON-PITR.md` end to end.
- [ ] Confirm Production `DATABASE_URL` project id (paste into the incident note).
- [ ] Confirm PITR retention covers the drill timestamp.
- [ ] Confirm `CLOSE_AT` is still null unless a human already started P3.
- [ ] Confirm floor / buyout still read `$58,000` / `$120,000` in app code
      (`FLOOR_USD=58000`, `GOAL_USD=120000`) — do not edit them for the drill.

## Execute (human only)

- [ ] Pick a UTC restore timestamp (write it here: _______________).
- [ ] Create a Neon restore branch from that timestamp (console or CLI — human).
- [ ] Point a local / staging `DATABASE_URL` at the restore branch only.
- [ ] `SELECT count(*)` waitlist signups on the restore branch.
- [ ] `SELECT count(*)` approved intents on the restore branch.
- [ ] Confirm pledged dollars equal approved standing only (no pending inflation).
- [ ] Open `/operator/health` against a deploy that uses the restore URL (or skip
      if the Vercel hold blocks deploys — note “hold” and continue SQL checks).
- [ ] Decide: **abort** (drop restore branch) or **cut over** (human changes
      Production `DATABASE_URL` after verification).

## Post-drill

- [ ] Record outcome (abort / cut over) and timestamp in an issue or below.
- [ ] If cut over: keep the pre-restore branch until the next successful deploy
      health check.
- [ ] Do not set `CLOSE_AT`, wire Stripe, or tweet from the drill.
- [ ] Do not ask an agent to click Neon or Vercel dashboards.

## Last drill log (human paste)

| Date (UTC) | Restore time | Outcome | Notes |
| ---------- | ------------ | ------- | ----- |
|            |              |         |       |

## Agent / CI stop rules

- Do not open Neon or Vercel dashboards from this repo’s automation.
- Do not run destructive SQL against Production from Playwright.
- Do not invent a third money number, a cheaper trim, or a lease product.
- If the Vercel usage hold is on, document SQL verification only and wait for a
  human to finish any Production cutover.

## Related

- `docs/NEON-PITR.md` — full restore outline (slice **11.6**)
- `docs/DRIZZLE-MIGRATE.md` — migrate runbook (slice **12.43**)
- `/operator/health` — last migration name (slice **12.42**)
- `CAMPAIGN.md` / `RULES.md` — money and refund rules that survive a restore
