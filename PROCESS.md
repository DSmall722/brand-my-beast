# BrandMyBeast — autonomous process (the dock)

This is the operating system for Cursor Projects + pstack. Product lock is `CAMPAIGN.md`. Stack lock is `ARCHITECTURE.md`. Stop rules are `AGENTS.md`.

Updated: 2026-09-13

## What “dock” means here

Not Docker. **Cursor Projects** (left nav, launched Sep 2026).

- One Project named **BrandMyBeast**, attached to `DSmall722/brand-my-beast`.
- You talk to the **coordinator**. It does not write app code. It plans, delegates to cloud/local agents, and brings PRs back.
- **Project Context** (the pane on the right) is the shared folder every agent reads before it starts. That is the dock.
- Account-level Cursor plugins do **not** follow cloud VMs. Anything an agent must obey has to live **in this repo** (markdown + `.cursor/`).

## Stack (locked — do not reopen in a drive-by PR)

| Layer | Choice |
|---|---|
| App | Next.js App Router, TypeScript, Tailwind |
| Data | Postgres + Drizzle |
| Postgres host | **Vercel Postgres** (domain already on Vercel). Swap only with a PR that updates this line. |
| Money | Stripe SetupIntent. Capture after close if $58,000 hits. |
| Mail | Resend from `hello@brandmybeast.com` |
| Host | Vercel, `brandmybeast.com` |
| Tests | Playwright, then a project-local `verify-brandmybeast` skill |
| Agents | Cursor Projects coordinator + `/poteto-mode` |

Auth: **none on P1** (email capture only). Pick an auth vendor when P2 starts, in a dedicated PR, not in the waitlist scaffold.

Do not add Docker, a second framework, or a `localStorage` ledger.

## Dock load list (Project Context)

Pin these files in the Project Context pane. Coordinator reads them every turn.

| File | Why it is pinned |
|---|---|
| `AGENTS.md` | Stop rules. Read first. |
| `CAMPAIGN.md` | Money, identity, route. Wins conflicts. |
| `RULES.md` | Panels, 20% deposit, etch lock. |
| `ARCHITECTURE.md` | Stack and P0–P3. |
| `PROCESS.md` | This file. How work is delegated. |
| `FEATURES.md` | Backlog. Never render on the public site. |

Agents may write into a Project-only `notes.md` and `internal/`. Humans do not treat those as product lock.

## How a unit of work runs

1. Human (or subscription) tells the coordinator the goal in one sentence. Example: `P1 waitlist on brandmybeast.com. No Stripe. No close date.`
2. Coordinator reads the dock files. If the goal fights `CAMPAIGN.md`, it stops and says so.
3. Coordinator opens a cloud agent on a fresh clone.
4. Agent starts the prompt with `/poteto-mode` (or the vendored skill path once pstack is in `.cursor/skills`).
5. Agent implements against the locked stack. No new product numbers.
6. Agent verifies: `CAMPAIGN.md` money strings in the UI, no banned identity strings, no `lease`, no invented close date.
7. Agent opens a PR. Coordinator does not merge until you look.
8. After P1 exists: `/create-verification-skill` once. After that, “verify it in the app” is a step, not a conversation.

`/create-verification-skill` is **forbidden** until a Next.js app boots. The static `index.html` prototype is a brochure. Interviewing it would teach agents the wrong product.

## First coordinator jobs (in order)

1. **Vendor pstack** into `.cursor/skills/` from `https://github.com/cursor/plugins` (`pstack/skills`), plus `.cursor/PSTACK_UPSTREAM.md` with URL + SHA. Cloud agents can then see `/poteto-mode`.
2. **Push `FEATURES.md`** if it is still missing from GitHub (README already links it).
3. **Scaffold P1** — Next.js on `brandmybeast.com`: story, 12 panels, $58,000 / $120,000 bar, email capture to Resend + Postgres. No Stripe. `CLOSE_AT = null`.
4. **Deploy P1** over the Vercel 404. X website field stops being a dead end.
5. **`/create-verification-skill`** against that running app. Feature map must include: panel grid, floor math, etch locked under $120k, waitlist submit, no personal handle in HTML.
6. Schedule `/maintain-verification-skill` as a Project subscription (daily, after P1).
7. P2 only after waitlist is live. P3 (Stripe + 30-day clock) only after LLC + terms + wreck clause exist.

## Subscriptions (coordinator)

On:

- Watch PRs on `DSmall722/brand-my-beast`. Fix CI. Do not merge without a human.
- Daily: `/maintain-verification-skill` once a verify skill exists.

Off:

- Do not start the 30-day clock.
- Do not tweet from `@BrandMyBeast`.
- Do not capture cards.
- Do not move Vercel nameservers.

## Human clicks to stand the dock up (once)

1. Cursor → left nav → **Projects** → New Project → **BrandMyBeast**.
2. Attach GitHub repo `DSmall722/brand-my-beast`.
3. Project Context → add the six files in the table above.
4. In a local Cursor chat on that repo: `/add-plugin pstack` then `/setup-pstack`. That helps **you**. Cloud agents still need the vendor step in job 1.
5. First message to the coordinator:

> Read AGENTS.md and CAMPAIGN.md. Vendor pstack into `.cursor/skills` and open a PR. Do not scaffold the Next app in that PR. Do not invent money numbers.

## Done means

A cloud agent that has never been in this chat can clone the repo, read the dock, and refuse to put a lease tier or a personal handle on the site without being told.
