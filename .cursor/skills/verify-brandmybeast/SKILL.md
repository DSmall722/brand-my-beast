---
name: verify-brandmybeast
description: "Drive the BrandMyBeast Next.js waitlist locally the way a user does. Use when proving campaign locks, panel grid, etch lock, waitlist signup, or banned-copy rules after a change."
---

# Verify BrandMyBeast

Project-local verification skill for the P1 waitlist app. Agents read this cold. Prefer this over inventing new Playwright recipes mid-task.

## Launch

Use a disposable port so you do not collide with a human `npm run dev` on 3000.
Launch boots **`next start`** (production server) after ensuring `.next/BUILD_ID` exists
(Playwright/`next dev` alone is not enough — they leave `.next/dev` without a prod build).
Do not use a second `next dev` in this worktree. Next.js refuses it.

```bash
export BMB_VERIFY_PORT="${BMB_VERIFY_PORT:-3010}"
export BMB_VERIFY_URL="http://127.0.0.1:${BMB_VERIFY_PORT}"
export WAITLIST_MODE=memory
.cursor/skills/verify-brandmybeast/scripts/launch.sh
```

Ready when doctor passes. Launch writes the PID to `.cursor/skills/verify-brandmybeast/artifacts/dev.pid`.

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

Feature recipes live in `features/`. Read `features/README.md` first.

Quick regression (Playwright config boots its own memory-mode server):

```bash
WAITLIST_MODE=memory npm test
```

One-feature proofs with evidence:

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-campaign-board.sh
.cursor/skills/verify-brandmybeast/scripts/prove-panel-grid.sh
.cursor/skills/verify-brandmybeast/scripts/prove-waitlist-signup.sh
.cursor/skills/verify-brandmybeast/scripts/prove-identity-locks.sh
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
| `scripts/prove-waitlist-signup.sh` | Memory-mode create/exists + UI status |
| `scripts/prove-identity-locks.sh` | Public strings only; no lease / gmail |
| `scripts/prove-all.sh` | Launch once; drive every feature; cleanup |
| `scripts/cleanup.sh` | Stop the PID recorded by launch |
