---
name: verify-brandmybeast
description: "Drive the BrandMyBeast Next.js app locally the way a user does. Use when proving campaign locks, panel grid, etch lock, waitlist signup, panel intent / approvals, banned-copy rules, or the Waves 0–5 / 7–10 / 12 feature maps after a change."
---

# Verify BrandMyBeast

Project-local verification skill for the waitlist + P2 intent surfaces. Agents read this cold. Prefer this over inventing new Playwright recipes mid-task.

**Feature map (Waves 0–5):** `.cursor/skills/verify-brandmybeast/features/README.md`
and `features/waves-0-5.md`. Slice 6.4 merge-gate: `tests/slice-6-4-verify-map.spec.ts`.

**Feature map (Waves 7–10):** `features/waves-7-10.md` plus per-wave files.
Slice 11.3 merge-gate: `tests/slice-11-3-verify-map.spec.ts`.

**Feature map (Wave 12):** `features/waves-12.md` plus `wave12-money-ready.md`.
Slice 12.47 merge-gate: `tests/slice-12-47-verify-map.spec.ts`.

## Launch

Use a disposable port so you do not collide with a human `npm run dev` on 3000.
Launch boots **`next start`** (production server) after ensuring `.next/BUILD_ID` exists
(Playwright/`next dev` alone is not enough — they leave `.next/dev` without a prod build).
Do not use a second `next dev` in this worktree. Next.js refuses it.

```bash
export BMB_VERIFY_PORT="${BMB_VERIFY_PORT:-3010}"
export BMB_VERIFY_URL="http://127.0.0.1:${BMB_VERIFY_PORT}"
export WAITLIST_MODE=memory
export INTENT_MODE=memory
export AUTH_MODE=test
export AUTH_SECRET="${AUTH_SECRET:-verify-brandmybeast-auth-secret-min-32!!}"
export AUTH_TEST_PASSWORD="${AUTH_TEST_PASSWORD:-test}"
.cursor/skills/verify-brandmybeast/scripts/launch.sh
```

Ready when doctor passes. Launch writes the PID under `.cursor/skills/verify-brandmybeast/artifacts/`.

## Doctor

```bash
.cursor/skills/verify-brandmybeast/scripts/doctor.sh
```

Pass criteria:

- `GET $BMB_VERIFY_URL` is 200
- Body contains `BrandMyBeast`, `$58,000`, `$120,000`
- Body does not match word-boundary `lease`
- Body does not contain `gmail.com`

## Drive

Primary harness: Playwright against the launched URL.

Stable handles:

| Handle | Role |
|---|---|
| `brand-wordmark` | Public brand |
| `floor-amount` | `$58,000` order+wrap floor |
| `goal-amount` | `$120,000` buy+etch buyout |
| `raised-amount` | Raised total (P1 is `$0`) |
| `close-copy` | Unset clock: `Auction clock starts when bidding opens.` |
| `panel-grid` | Twelve panel cards |
| `panel-<id>` | One panel |
| `etch-lock-<id>` | Etch locked under buyout |
| `waitlist-email` | Email input |
| `waitlist-submit` | Join button |
| `waitlist-status` | Status text |
| `waitlist-next` | Post-join CTA to panels / sign-in intent |
| `panel-intent-page` | P2 panel soft-auction page |
| `panel-mockup` | Steel-face mockup |
| `intent-only-banner` | No Stripe / no close clock |
| `operator-approvals` | Operator intent queue |

Feature recipes live in `features/`. Read `features/README.md` first.

Quick regression (Playwright config boots its own memory-mode server):

```bash
WAITLIST_MODE=memory INTENT_MODE=memory AUTH_MODE=test npm test
```

One-feature proofs with evidence:

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-wave0.sh
.cursor/skills/verify-brandmybeast/scripts/prove-campaign-board.sh
.cursor/skills/verify-brandmybeast/scripts/prove-panel-grid.sh
.cursor/skills/verify-brandmybeast/scripts/prove-waitlist-signup.sh
.cursor/skills/verify-brandmybeast/scripts/prove-identity-locks.sh
.cursor/skills/verify-brandmybeast/scripts/prove-panel-intent.sh
```

Full map (daily `/maintain-verification-skill` live pass):

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-all.sh
```

## Evidence

Proof artifacts go under `.cursor/skills/verify-brandmybeast/artifacts/<run-id>/`.

Minimum for a UI proof:

- Screenshot of the driven section
- Assertion log with expected strings/state
- For waitlist mutations: HTTP status from `/api/waitlist` plus visible `waitlist-status` text

Proof standards:

- Drive the real user path, not internal setters
- Capture action and resulting state
- Memory-mode waitlist is the allowed local boundary

## Cleanup

```bash
.cursor/skills/verify-brandmybeast/scripts/cleanup.sh
```

Stops only the PID recorded by launch. Leaves `artifacts/<run-id>/` in place.

## Helpers

| Script | Purpose |
|---|---|
| `scripts/launch.sh` | Start memory-mode Next on `BMB_VERIFY_PORT` |
| `scripts/doctor.sh` | Read-only readiness + campaign lock smoke |
| `scripts/prove-campaign-board.sh` | Drive campaign board; write evidence |
| `scripts/prove-panel-grid.sh` | Twelve panels + etch lock under buyout |
| `scripts/prove-waitlist-signup.sh` | Memory-mode create/exists + next-step CTA |
| `scripts/prove-identity-locks.sh` | Public strings only; no lease / gmail |
| `scripts/prove-panel-intent.sh` | Panel mockup + list intent + operator approve |
| `scripts/prove-all.sh` | Launch once; drive every feature; cleanup |
| `scripts/cleanup.sh` | Stop the PID recorded by launch |
