# BrandMyBeast

Auction of 12 stainless panels on a Tesla Cybertruck Cyberbeast that is not ordered until the board clears.

Public: [@BrandMyBeast](https://x.com/brandmybeast) · hello@brandmybeast.com · https://brandmybeast.com

Not affiliated with Tesla, Inc.

## Source of truth (read these first)

| File | What it locks |
|---|---|
| [AGENTS.md](./AGENTS.md) | Stop rules for Cursor / pstack / Grok |
| [CAMPAIGN.md](./CAMPAIGN.md) | Money, identity, route, term. Wins conflicts. |
| [RULES.md](./RULES.md) | Panels, increments, etch, refunds |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack and phases P0–P3 |
| [PROCESS.md](./PROCESS.md) | Cursor Projects dock + pstack loop |
| [FEATURES.md](./FEATURES.md) | Ranked backlog. Not for the homepage |
| [IDENTITY.md](./IDENTITY.md) | Public vs private surfaces |
| [STALE.md](./STALE.md) | Killed ideas. Do not revive |

If any file disagrees with `CAMPAIGN.md`, `CAMPAIGN.md` wins.

## Money

- Under **$58,000**: full refund. No order.
- **$58,000–$119,999**: order the Cyberbeast + wrap. Operator finances the rest. No etch.
- **$120,000**: campaign buys the truck. Charger. Etch unlocks on eight steel faces.

There is no lease product. There is no cheaper trim.

## Layout

- Root markdown = harness dock. Pin these in Cursor Project Context.
- `prototype/` = static HTML/JS/CSS look reference. Bids are `localStorage`. Not production.
- `campaign/` = email and X SOPs. No personal inboxes in those files.
- `.cursor/rules/` = always-on agent locks.

```bash
npx serve prototype
```

Do not deploy the prototype over brandmybeast.com. P1 is a Next.js waitlist. Domain is on Vercel DNS. hello@ forwards via ImprovMX. Do not move nameservers.
