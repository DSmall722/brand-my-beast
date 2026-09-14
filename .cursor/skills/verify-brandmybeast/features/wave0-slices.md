# Wave 0 — public page is a waitlist

Maps SLICES **0.1–0.8**. Harness: `.cursor/skills/verify-brandmybeast/scripts/prove-wave0.sh`
(also first step of `prove-all.sh`). Money fences: floor `$58,000`, buyout `$120,000`,
`CLOSE_AT` null.

## Preconditions

- `WAITLIST_MODE=memory`, `INTENT_MODE=memory`, `AUTH_MODE=test`
- `TRUCK_EXISTS` unset/false
- Disposable port via `launch.sh`

## Slices

| Slice | Proof |
|---|---|
| 0.1 Hide empty P3–P5 behind `truckExists === false` | `prove-wave0.sh`; `/` has `home-main[data-truck-exists=false]` |
| 0.2 Same hide on `/account` and `/partner` empty boards | `prove-wave0.sh`; account/partner keep `data-truck-exists=false` |
| 0.3 Homepage copy audit (no process-memo / invented miles) | `prove-wave0.sh` + `tests/campaign.spec.ts` |
| 0.4 Waitlist created/exists; invalid email 400 | `prove-waitlist-signup.sh` + waitlist API contract |
| 0.5 `prove-all.sh` covers 0.1–0.4 | `.cursor/skills/verify-brandmybeast/scripts/prove-all.sh` |
| 0.6 GitHub Actions Playwright on every PR | `.github/workflows/` Playwright job |
| 0.7 Hero truck preview (bare stainless, no wrap/etch as delivered) | `tests/campaign.spec.ts` hero still |
| 0.8 `PUBLIC_COPY.md` on `/` verbatim (H1, etch section, Notify me) | `tests/campaign.spec.ts` / later 6.11 |

## Skip

Do not invent a VIN, close date, Stripe capture, or tweet during this recipe.
