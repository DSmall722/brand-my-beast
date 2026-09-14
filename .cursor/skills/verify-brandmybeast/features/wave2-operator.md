# Wave 2 — operator

Maps SLICES **2.1–2.5**. Operator email allow-list. Still no capture.

## Slices

| Slice | Proof |
|---|---|
| 2.1 `/operator` lists pending intents | `tests/intent-ui.spec.ts` slice 2.1; operator allow-list unit tests |
| 2.2 Approve lists; reject requires a note | `tests/slice-6-3-operator.spec.ts` + intent-ui 2.2 |
| 2.3 Banned trades hard-reject | `tests/intent-ui.spec.ts` / banned-trades unit |
| 2.4 Approval thread on `/account` | intent-ui slice 2.4 account reject/approve notes |
| 2.5 Operator UI cannot edit `FLOOR_USD` / `GOAL_USD` / `CLOSE_AT` | intent-ui slice 2.5; `operator-campaign-locks` |

## Money fences

- Floor `$58,000`, buyout `$120,000`, `CLOSE_AT` null on operator HTML.
- No lease. No Stripe capture controls on `/operator`.

## Live lever

`prove-panel-intent.sh` (approve path) and `tests/slice-6-3-operator.spec.ts`.
