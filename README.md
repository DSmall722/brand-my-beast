# BrandMyBeast

Auction of 12 stainless panels on a Tesla Cybertruck Cyberbeast that is not ordered until the board clears.

Public: [@BrandMyBeast](https://x.com/brandmybeast) · hello@brandmybeast.com · https://brandmybeast.com

Not affiliated with Tesla, Inc.

## Source of truth (read these first)

| File | What it locks |
|---|---|
| [CAMPAIGN.md](./CAMPAIGN.md) | Money, identity, route, term |
| [RULES.md](./RULES.md) | Panels, increments, etch, refunds |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack and phases P0–P3 |
| [AGENTS.md](./AGENTS.md) | Stop rules for Cursor / pstack / Grok |
| [FEATURES.md](./FEATURES.md) | Ranked backlog. Not for the homepage |

If any file disagrees with `CAMPAIGN.md`, `CAMPAIGN.md` wins.

## Money

- Under **$58,000**: full refund. No order.
- **$58,000–$119,999**: order the Cyberbeast + wrap. Operator finances the rest. No etch.
- **$120,000**: campaign buys the truck. Charger. Etch unlocks on eight steel faces.

There is no lease product. There is no cheaper trim.

## This folder

Static prototype (`index.html` + `app.js` + `styles.css`). Bids are `localStorage`. That is not production. Production stack is in `ARCHITECTURE.md`.

```bash
npx serve .
```

Keep `assets/` next to `index.html`.

## Deploy

Do not deploy the prototype over brandmybeast.com until P1 (waitlist) exists. Domain is already on Vercel DNS. Mail to hello@ forwards via ImprovMX. Do not move nameservers.
