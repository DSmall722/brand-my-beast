# Wave 1 — durable intent

Maps SLICES **1.1–1.8**. Intent is pledged standing only — no Stripe capture,
no `CLOSE_AT`.

## Slices

| Slice | Proof |
|---|---|
| 1.1 Intent schema / no memory in Production | `src/lib/intent-store.ts` + Drizzle; CI uses `INTENT_MODE=memory` only |
| 1.2 Signed-in user lists one intent per panel | `tests/intent-ui.spec.ts` create path; `prove-panel-intent.sh` |
| 1.3 Amount is intent only (“not charged”) | Seat success copy; `intent-only-banner` |
| 1.4 One brand per trade | `tests/intent.spec.ts` / `tests/slice-6-2-intents.spec.ts` exclusivity |
| 1.5 Increment ≥ standing + max($250, 10%) | `minIncrementUsd` + seat UI low-bid reject |
| 1.6 Outbid → prior status outbid + waitlist handoff | `prove-panel-intent.sh` failed-winner waitlist; intent-ui outbid |
| 1.7 `/panels/[id]` is the seat; homepage cards link | `tests/campaign.spec.ts` panel links |
| 1.8 Public standing: brand + trade + amount (no bidder email) | Seat public standing testids |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- No lease copy. No personal gmail.

## Live lever

`.cursor/skills/verify-brandmybeast/scripts/prove-panel-intent.sh`
plus Playwright suites named above.
