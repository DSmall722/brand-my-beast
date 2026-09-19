# BrandMyBeast — status snapshot

Slice **14.9**. One-page status for agents and humans. Not a build order — **`SLICES.md`** is.

| Field | Value |
|---|---|
| Floor | **$58,000** |
| Buyout / goal | **$120,000** |
| `CLOSE_AT` | **null** (do not start the 30-day clock) |
| Stripe | **not wired** (Wave 15 needs a human message) |
| Vercel usage hold | **lifted** — `vercel.json` `git.deploymentEnabled` main-only (`*`: false, `main`: true). See `docs/VERCEL-HOLD.md`. |
| Last slice id | **17.3** — copied from `SLICES.md` **Now**. Money rows are not hand-edited. |

## Merge gate (hold lifted — main-only)

- Playwright green
- Floor / buyout / `CLOSE_AT=null` unchanged in `src/lib/campaign.ts`
- No `stripe` in `package.json`
- Public HTML has no banned CAMPAIGN product words (see CAMPAIGN.md / STALE.md)
- Git deploys are main-only (`deploymentEnabled` restore). Do not add preview deploys.

## Not this file

- Not permission to tweet from @BrandMyBeast
- Not Wave 15 / SetupIntent / card capture
- Not a close date
- Not FEATURES.md (catalog only)

Public: BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com · brandmybeast.com
