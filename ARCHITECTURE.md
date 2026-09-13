# BrandMyBeast — build stack

CAMPAIGN.md and RULES.md are the product. This file is how we build it.

Updated: 2026-09-13

## Current tree (do not confuse with production)

`artifacts/brandmybeast/` is a **static prototype**: `index.html`, `app.js`, `styles.css`, `assets/`. Bids live in `localStorage`. That is not an auction.

GitHub `DSmall722/brand-my-beast` is the harness source of truth. Seed it with these markdown files before generating verification skills.

## Production stack (locked)

| Layer | Choice |
|---|---|
| App | Next.js App Router, TypeScript, Tailwind |
| Data | Postgres + Drizzle |
| Money | Stripe SetupIntent (save card, capture after close if floor hits) |
| Mail | Resend from `hello@brandmybeast.com` |
| Host | Vercel, domain already on Vercel DNS |
| Tests | Playwright, driven by pstack verification skills |
| Agents | Cursor Projects coordinator + `/poteto-mode` after skills exist |

Do not build a second framework. Do not put the auction ledger in `localStorage` or a client JSON file.

## Phases

**P0 — planning, still here.** Lock copy, LLC path, wrap-shop quote, this markdown. No GitHub app code required.

**P1 — waitlist.** `brandmybeast.com` is a real page: story, 12 panels, floor/goal, email capture to Resend/Postgres. No Stripe. No countdown with a fake date. This is the first deploy over the Vercel 404.

**P2 — soft auction.** Accounts, panel pages, standing bids as **intent** (no capture). Operator approval thread. Mockup compositor can start here.

**P3 — live money.** Stripe SetupIntent, terms, wreck clause, 30-day clock starts the morning this ships. Soft close. Close-night capture or release.

Do not start the 30-day clock on P1 or P2.

## What pstack / Cursor Projects must see

- `CAMPAIGN.md` — money, identity, route
- `RULES.md` — panels, increments, refunds
- `FEATURES.md` — ranked backlog. Not the homepage.
- `AGENTS.md` — stop rules for harnesses

Verification skills should hit: panel hotspots, min increment, floor/goal math, deposit 20%, etch locked under $120k, no personal handle in rendered HTML.

## Do not build yet

- Impression dashboards
- 48-state live map as a pre-truck promise
- Dual Motor / lease checkout
- Public FEATURES.md page
- Connecting the personal X account as the campaign voice
