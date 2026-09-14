# Wave 0 slices (0.1–0.4)

Harness: `.cursor/skills/verify-brandmybeast/scripts/prove-wave0.sh` (also first step of `prove-all.sh`).

## Preconditions

- `WAITLIST_MODE=memory`, `INTENT_MODE=memory`, `AUTH_MODE=test`
- `TRUCK_EXISTS` unset/false
- Disposable port via `launch.sh`

## Assertions

| Slice | Proof |
|---|---|
| 0.1 | `/` has `home-main[data-truck-exists=false]`; empty P3–P5 board testids absent; floor `$58,000` / buyout `$120,000` |
| 0.2 | `/account`, `/account/wins`, `/partner/shop` (shop@example.com) keep `data-truck-exists=false` and hide empty boards/facts |
| 0.3 | Public HTML has no lease, gmail, process-memo voice, or invented miles/scans/city hours |
| 0.4 | `POST /api/waitlist` → created 201, exists 200, invalid 400; UI first join still 201 |

## Skip

Do not invent a VIN, close date, Stripe capture, or tweet during this recipe.
