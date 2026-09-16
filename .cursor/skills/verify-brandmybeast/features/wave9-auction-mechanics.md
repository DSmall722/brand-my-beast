# Wave 9 — auction mechanics, no capture

Maps SLICES **9.1–9.10**. Soft-auction mechanics only — pledged standing, no
Stripe charge, do not set `CLOSE_AT`.

## Slices

| Slice | Proof |
|---|---|
| 9.1 Proxy max on an intent | `tests/slice-9-1-proxy-max.spec.ts` |
| 9.2 Seat shows next minimum | `tests/slice-9-2-seat-next-min.spec.ts` |
| 9.3 `panelExtendedUntil` field (never sets `CLOSE_AT`) | `tests/slice-9-3-panel-extended-until.spec.ts` |
| 9.4 Floor-save intent row | `tests/slice-9-4-floor-save.spec.ts` |
| 9.5 Hide whole-truck control when pledged >= `$120,000` | `tests/slice-9-5-hide-whole-truck.spec.ts` |
| 9.6 Failed-winner offer at last mark + one increment | `tests/slice-9-6-failed-winner-offer.spec.ts` |
| 9.7 Withdraw intent while pending only | `tests/slice-9-7-withdraw-pending.spec.ts` |
| 9.8 Edit brand / trade / art while pending only | `tests/slice-9-8-edit-pending.spec.ts` |
| 9.9 Public seat log: amount + time (no bidder email) | `tests/slice-9-9-public-seat-log.spec.ts` |
| 9.10 Pledged dollars = sum of approved standing only | `tests/slice-9-10-pledged-approved-only.spec.ts` |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- Buyout hide / etch unlock still keyed to `$120,000` only.
- No lease. No silent reopen after a failed winner.

## Live lever

Playwright suites named above (`tests/slice-9-*.spec.ts`).
