# Vercel usage hold — redeploy note

Slice **11.10** (skipped while the usage hold is still on).
Slice **13.49** restates that **11.10 remains human**.
Slice **14.48** refreshes this note’s date only. Do not buy credits.

**Updated:** 2026-09-17 (14.48 date bump only).

## Hold lifted (2026-09-17)

Human authorized the restore checklist below. `vercel.json` is main-only:

`"git": { "deploymentEnabled": { "*": false, "main": true } }`

The hold-lift merge does not auto-deploy while the old config is still
`deploymentEnabled: false`. Production is redeployed once after that merge.
Do not buy credits. No Stripe. Auction clock stays unset. Floor **$58,000** /
buyout **$120,000**.

The one-line runbook below is the 11.10 / 13.49 / 14.48 historical note.

## One-line runbook (human)

**Redeploy when the hold lifts.**

Same line as slice **11.10**, restated for Wave 13: redeploy when the Vercel hold lifts.
Agents do not clear the hold, buy credits, or flip `vercel.json`.
A human runs Production redeploy after the hold is gone.

Until then:

- Do not clear the hold from this repo.
- Do not buy credits or open extra Vercel projects from an agent.
- Do not add preview deploys. While the hold is on, `vercel.json`
  pauses **all** automatic Git deploys (`git.deploymentEnabled: false`)
  so merge traffic does not burn the shared Hobby day quota. Slices
  6.15 / 11.9 accept either full pause or main-only restore shape.
  Leave hold-mode alone from agent PRs (slice 13.49 / 14.48).
- Do not wire Stripe. Do not set a close clock. Do not tweet.
- Money fences stay floor **$58,000** / buyout **$120,000**.
- Do not staff husk + jadebear + brand-my-beast agent swarms in the
  same 24h if a Production redeploy still has to ship.

### Restore checklist (human, when hold lifts)

1. Set `vercel.json` back to main-only:
   `"git": { "deploymentEnabled": { "*": false, "main": true } }`
2. Redeploy `main` once to Production (existing 11.10 note).
3. Confirm `brandmybeast.com` is healthy.
4. Then continue Wave 12 / P3 human steps.

No app change in this slice. No Stripe. Auction clock stays unset.
