# BrandMyBeast verification map

Maintained source for verifying user-facing waitlist + intent behavior across
**Waves 0–5** and **Waves 7–10** (SLICES.md). Read this index before driving
the app, then open the matching feature file.

Slice **6.4** requires this map to name every Wave 0–5 surface and point at
the skill recipe and/or Playwright suite that proves it. Slice **11.3** extends
the same map to every Wave 7–10 surface. Money fences stay
`FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`.

## Baseline preconditions

- Launch with `WAITLIST_MODE=memory`, `INTENT_MODE=memory`, and `AUTH_MODE=test`
  on a disposable port (`BMB_VERIFY_PORT`, default `3010`).
- Prefer `.cursor/skills/verify-brandmybeast/scripts/launch.sh`.
- Run `.cursor/skills/verify-brandmybeast/scripts/doctor.sh` and require pass.
- Never drive production. Never invent a close date, Stripe capture, or lease.

## Driving conventions

- Start every recipe from `/` unless the feature file says otherwise.
- Prefer `data-testid` handles listed in the skill body.
- Treat money strings as literals from `src/lib/campaign.ts`.
- Use Playwright or the skill scripts. Do not click by pixel coordinates.

## Waves 0–5 map

Canonical id → file index: [waves-0-5.md](./waves-0-5.md) (every `0.1`…`5.4`, including `0.9`).

| Wave | Feature file | Live lever |
|---|---|---|
| 0 — waitlist public page | [wave0-slices.md](./wave0-slices.md) | `prove-wave0.sh` + `tests/campaign.spec.ts` |
| 0 board / identity / grid | [campaign-board.md](./campaign-board.md), [panel-grid.md](./panel-grid.md), [waitlist-signup.md](./waitlist-signup.md), [identity-locks.md](./identity-locks.md) | `prove-campaign-board.sh`, `prove-panel-grid.sh`, `prove-waitlist-signup.sh`, `prove-identity-locks.sh` |
| 1 — durable intent | [wave1-durable-intent.md](./wave1-durable-intent.md) | `prove-panel-intent.sh` + `tests/intent.spec.ts` / `tests/intent-ui.spec.ts` / `tests/slice-6-2-intents.spec.ts` |
| 2 — operator | [wave2-operator.md](./wave2-operator.md) | `prove-panel-intent.sh` (approve) + `tests/intent-ui.spec.ts` / `tests/slice-6-3-operator.spec.ts` |
| 3 — mockup and art | [wave3-mockup-art.md](./wave3-mockup-art.md) | `tests/intent-ui.spec.ts` (compositor / etch lock / views) |
| 4 — board honesty | [wave4-board-honesty.md](./wave4-board-honesty.md) | `tests/campaign.spec.ts` + `tests/intent.spec.ts` |
| 5 — accounts | [wave5-accounts.md](./wave5-accounts.md) | `tests/auth.spec.ts` / `tests/intent-ui.spec.ts` / `tests/waitlist-account.spec.ts` |

Hardening gates already named in Wave 6 Playwright:

- Floor / buyout / etch lock / no lease / no personal handle → `tests/slice-6-1-locks.spec.ts`
- Intent create / outbid / exclusivity / increment → `tests/slice-6-2-intents.spec.ts`
- Operator approve / reject-with-note → `tests/slice-6-3-operator.spec.ts`
- This map ↔ Waves 0–5 → `tests/slice-6-4-verify-map.spec.ts`

## Waves 7–10 map

Canonical id → file index: [waves-7-10.md](./waves-7-10.md) (every `7.1`…`10.10`).

| Wave | Feature file | Live lever |
|---|---|---|
| 7 — code hygiene | [wave7-hygiene.md](./wave7-hygiene.md) | `tests/slice-7-*.spec.ts` |
| 8 — operator day | [wave8-operator-day.md](./wave8-operator-day.md) | `tests/slice-8-*.spec.ts` |
| 9 — auction mechanics | [wave9-auction-mechanics.md](./wave9-auction-mechanics.md) | `tests/slice-9-*.spec.ts` |
| 10 — compositor trust | [wave10-compositor.md](./wave10-compositor.md) | `tests/slice-10-*.spec.ts` |

Hardening gate for this extension:

- This map ↔ Waves 7–10 → `tests/slice-11-3-verify-map.spec.ts`

## Features (detail)

- [Waves 0–5 id index](./waves-0-5.md)
- [Waves 7–10 id index](./waves-7-10.md)
- [Wave 0 slices 0.1–0.9](./wave0-slices.md)
- [Campaign board](./campaign-board.md)
- [Panel grid](./panel-grid.md)
- [Waitlist signup](./waitlist-signup.md)
- [Identity locks](./identity-locks.md)
- [Wave 1 durable intent](./wave1-durable-intent.md)
- [Wave 2 operator](./wave2-operator.md)
- [Wave 3 mockup and art](./wave3-mockup-art.md)
- [Wave 4 board honesty](./wave4-board-honesty.md)
- [Wave 5 accounts](./wave5-accounts.md)
- [Wave 7 code hygiene](./wave7-hygiene.md)
- [Wave 8 operator day](./wave8-operator-day.md)
- [Wave 9 auction mechanics](./wave9-auction-mechanics.md)
- [Wave 10 compositor](./wave10-compositor.md)
- [Panel intent (P2 soft auction)](./panel-intent.md)

## Maintain hook

Daily Project subscription runs `/maintain-verification-skill` against this map.
Live pass lever: `.cursor/skills/verify-brandmybeast/scripts/prove-all.sh`
(Wave 0 + board/grid/waitlist/identity/panel-intent). Waves 1–5 and 7–10 detail
lives in the feature files above and the Playwright suites they name.
