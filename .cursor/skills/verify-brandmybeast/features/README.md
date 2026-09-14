# BrandMyBeast verification map

Maintained source for verifying user-facing P1 waitlist behavior. Read this index before driving the app, then open the matching feature file.

## Baseline preconditions

- Launch the app with `WAITLIST_MODE=memory` on a disposable port (`BMB_VERIFY_PORT`, default `3010`).
- Prefer `.cursor/skills/verify-brandmybeast/scripts/launch.sh`.
- Run `.cursor/skills/verify-brandmybeast/scripts/doctor.sh` and require pass.
- Never drive `brandmybeast.com` or any shared production instance from this skill.
- Never invent a close date, Stripe flow, or lease tier during verification.

## Driving conventions

- Start every recipe from `/` unless the feature file says otherwise.
- Prefer `data-testid` handles listed in the skill body.
- Treat money strings as literals from `src/lib/campaign.ts` (`FLOOR_USD=58000`, `GOAL_USD=120000`).
- Use Playwright or the skill scripts. Do not click by pixel coordinates.

## Proof and skip reporting

- Capture the user action and the resulting state.
- UI proof includes a screenshot under `artifacts/<run-id>/` plus asserted text.
- API/waitlist proof includes status code and visible status copy.
- Report unreachable paths with the unmet precondition. Do not claim a skipped entry as verified via a different path.

## Features

- [Campaign board](./campaign-board.md) — brand, floor, buyout, unset close date
- [Panel grid](./panel-grid.md) — twelve panels, etch locked under buyout
- [Waitlist signup](./waitlist-signup.md) — email capture create/exists
- [Identity locks](./identity-locks.md) — public strings only, no lease, no personal gmail
