# Vercel usage hold — redeploy note

Slice **11.10** (skipped while the usage hold is still on).

**Redeploy when the hold lifts.**

Until then:

- Do not clear the hold from this repo.
- Do not buy credits or open extra Vercel projects from an agent.
- Do not add preview deploys. While the hold is on, `vercel.json`
  pauses **all** automatic Git deploys (`git.deploymentEnabled: false`)
  so merge traffic does not burn the shared Hobby day quota. Slices
  6.15 / 11.9 accept either full pause or main-only restore shape.
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
