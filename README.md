# BrandMyBeast

Slice **14.4** — one-pager. What this repo is, and what it is not.

Public: [@BrandMyBeast](https://x.com/brandmybeast) · hello@brandmybeast.com · https://brandmybeast.com

Not affiliated with Tesla, Inc.

## How to look at this

See [docs/LOCAL-PREVIEW.md](./docs/LOCAL-PREVIEW.md) (slice 16.8). `npm i && npm run dev` is how friends see the real page while Vercel is on hold. Not brandmybeast.com as the demo.

## What this repo is

- The **harness + Next.js app** for an all-or-nothing auction of **12 stainless panels** on a **Cyberbeast** that does not exist until the board clears the floor.
- **`SLICES.md`** is the only build order. **Now** = the first unchecked box.
- Product lock: **`CAMPAIGN.md`**. Stack lock: **`ARCHITECTURE.md`**. Stop rules: **`AGENTS.md`**.
- Intent-only soft auction today: waitlist, Auth.js magic link, panel intents, operator approvals. Playwright is the merge gate.
- Money fences: floor **$58,000**, buyout **$120,000**. `CLOSE_AT` is **null**. Stripe is **not wired**.

## What this repo is not

- Not a live card-capture auction. No Stripe SetupIntent until Wave 15 (human message).
- Not a countdown with a close date. Do not start the 30-day clock from an agent.
- Not a lease product. Not Dual Motor / Premium fallback. Cyberbeast or refund.
- Not a place to put `FEATURES.md` on the homepage. FEATURES is a catalog only.
- Not proof the truck exists. Hero is the bare stainless still; wrap/etch are not “as delivered.”
- Not a live-URL merge gate while the Vercel usage hold is on (`docs/VERCEL-HOLD.md`).

## Source of truth (read these first)

| File | What it locks |
|---|---|
| [AGENTS.md](./AGENTS.md) | Stop rules for Cursor / pstack / Grok |
| [CAMPAIGN.md](./CAMPAIGN.md) | Money, identity, route, term. Wins conflicts. |
| [SLICES.md](./SLICES.md) | **What to build next.** Living queue. Not FEATURES.md. |
| [RULES.md](./RULES.md) | Panels, increments, etch, refunds |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack and phases P0–P3 (Stripe = not wired) |
| [PROCESS.md](./PROCESS.md) | Cursor Projects dock + pstack loop |
| [FEATURES.md](./FEATURES.md) | Idea catalog. Not a build order. Not for the homepage |
| [IDENTITY.md](./IDENTITY.md) | Public vs private surfaces |
| [STALE.md](./STALE.md) | Killed ideas. Do not revive |

If any file disagrees with `CAMPAIGN.md` on money or identity, `CAMPAIGN.md` wins. If a file disagrees with `SLICES.md` on what to build this week, `SLICES.md` wins.

## Money

- Under **$58,000**: full refund. No order.
- **$58,000–$119,999**: order the Cyberbeast + wrap. Operator finances the rest. No etch.
- **$120,000**: campaign buys the truck. Charger. Etch unlocks on nine steel faces.

There is no cheaper trim. Cyberbeast or refund.

## Layout

- Root markdown = harness dock. Pin these in Cursor Project Context, including `SLICES.md`.
- `src/` = Next.js App Router production app.
- `prototype/` = static HTML/JS/CSS look reference. Bids are `localStorage`. Not production.
- `campaign/` = email and X SOPs. No personal inboxes in those files.
- `.cursor/rules/` = always-on agent locks. `.cursor/skills/` = vendored pstack.

## App

```bash
cp .env.example .env.local
npm install
npm run dev
npm test
```

Set `DATABASE_URL` (Neon / Vercel Postgres) and optional `RESEND_API_KEY` in Vercel before production traffic. Local Playwright sets `WAITLIST_MODE=memory`.

Do not deploy the prototype over brandmybeast.com. Domain is on Vercel DNS. hello@ forwards via ImprovMX. Do not move nameservers.
