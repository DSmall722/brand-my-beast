# BrandMyBeast

Auction of 12 stainless panels on a Tesla Cybertruck Cyberbeast that is not ordered until the board clears.

Public: [@BrandMyBeast](https://x.com/brandmybeast) · hello@brandmybeast.com · https://brandmybeast.com

Not affiliated with Tesla, Inc.

## Source of truth (read these first)

| File | What it locks |
|---|---|
| [AGENTS.md](./AGENTS.md) | Stop rules for Cursor / pstack / Grok |
| [CAMPAIGN.md](./CAMPAIGN.md) | Money, identity, route, term. Wins conflicts. |
| [SLICES.md](./SLICES.md) | **What to build next.** Living queue. Not FEATURES.md. |
| [RULES.md](./RULES.md) | Panels, increments, etch, refunds |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack and phases P0–P3 |
| [PROCESS.md](./PROCESS.md) | Cursor Projects dock + pstack loop |
| [FEATURES.md](./FEATURES.md) | Idea catalog. Not a build order. Not for the homepage |
| [IDENTITY.md](./IDENTITY.md) | Public vs private surfaces |
| [STALE.md](./STALE.md) | Killed ideas. Do not revive |

If any file disagrees with `CAMPAIGN.md` on money or identity, `CAMPAIGN.md` wins. If a file disagrees with `SLICES.md` on what to build this week, `SLICES.md` wins.

## Money

- Under **$58,000**: full refund. No order.
- **$58,000–$119,999**: order the Cyberbeast + wrap. Operator finances the rest. No etch.
- **$120,000**: campaign buys the truck. Charger. Etch unlocks on eight steel faces.

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
