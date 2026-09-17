# BrandMyBeast — status snapshot

Slice **14.9**. One-page status for agents and humans. Not a build order — **`SLICES.md`** is.

| Field | Value |
|---|---|
| Floor | **$58,000** |
| Buyout / goal | **$120,000** |
| `CLOSE_AT` | **null** (do not start the 30-day clock) |
| Stripe | **not wired** (Wave 15 needs a human message) |
| Vercel usage hold | **on** — `vercel.json` `git.deploymentEnabled: false`. Live URL is not a merge gate. See `docs/VERCEL-HOLD.md`. |
| Last slice id | **14.9** (this file). Check **`SLICES.md`** → **Last merged** / **Now** for the live queue. |

## Merge gate (while hold is on)

- Playwright green
- Floor / buyout / `CLOSE_AT=null` unchanged in `src/lib/campaign.ts`
- No `stripe` in `package.json`
- Public HTML has no banned CAMPAIGN product words (see CAMPAIGN.md / STALE.md)
- Do not clear the Vercel hold from an agent

## Not this file

- Not permission to tweet from @BrandMyBeast
- Not Wave 15 / SetupIntent / card capture
- Not a close date
- Not FEATURES.md (catalog only)

Public: BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com · brandmybeast.com
