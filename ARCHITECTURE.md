# BrandMyBeast — build stack

CAMPAIGN.md and RULES.md are the product. This file is how we build it.

Updated: 2026-09-16

## Current tree (do not confuse with production)

`artifacts/brandmybeast/` is a **static prototype**: `index.html`, `app.js`, `styles.css`, `assets/`. Bids live in `localStorage`. That is not an auction.

GitHub `DSmall722/brand-my-beast` is the harness source of truth. Seed it with these markdown files before generating verification skills.

## Production stack (locked) — slices 13.2 / 14.2

| Layer | Choice |
|---|---|
| App | Next.js App Router, TypeScript, Tailwind |
| Data | **Postgres + Drizzle** (`DATABASE_URL` / Neon). Memory mode for CI only. |
| Blobs | **Vercel Blob** (or compatible) for artwork bytes — see artwork blob store. |
| Mail | **Resend** from `hello@brandmybeast.com`. CI uses an injected **Resend mock** / mailer double — never send live mail from agents. |
| Stripe | Checkout for the 20% deposit. Live charges stay off until `LIVE_BIDDING` is set. The webhook sets the paid time. |
| Host | Vercel, domain already on Vercel DNS (usage hold: live URL is not a merge gate — `docs/VERCEL-HOLD.md`) |
| Tests | Playwright, driven by pstack verification skills |
| Agents | Cursor Projects coordinator + `/poteto-mode` after skills exist |
| Auth (P2) | **Auth.js** (`next-auth` v5). Test login for CI; Resend magic link in live. See `P2.md`. |
| Analytics | Vercel Web Analytics (cookieless, same-origin `/_vercel/insights`), mounted only on Vercel builds. Pageview URLs keep only `utm_*` params (`src/lib/analytics-url.ts`). Custom events `bid_start` and `deposit_checkout` carry no personal data. |

Do not build a second framework. Do not put the auction ledger in `localStorage` or a client JSON file.

Wave 14 recorded the Stripe box as not wired. That sentence is history. Wave 15 is the human flip of `LIVE_BIDDING`. `CLOSE_AT` is the locked Nov 2 2026 close. Do not start the 30-day clock from this file.

Money fences: floor **$58,000**, buyout **$120,000**. No lease. No cheaper trim.

## Phases

**P0 — planning.** Copy, LLC path, wrap-shop quote, dock markdown. **Done** (shipped P1).

**P1 — waitlist (live).** `brandmybeast.com` is a real page: story, 11 panels, floor/goal, email capture to Resend/Postgres. No Stripe. No countdown with a fake date. Local prove: `.cursor/skills/verify-brandmybeast/`.

**P2 — soft auction (in progress).** Auth.js with `AUTH_MODE=test` for CI; Resend magic link for live. Panel intent UI, operator approvals, durable/memory intent ledger, waitlist→intent CTAs, and failed-winner waitlist handoff are in. Still no capture.

**P3 — live money (human-gated).** Stripe SetupIntent, terms, wreck clause, 30-day clock — **only after a human opens Wave 15 / sets CLOSE_AT**. Soft close. Close-night capture or release. Not in the locked stack table above until that human message.

Do not start the 30-day clock on P1 or P2.

## What pstack / Cursor Projects must see

- `CAMPAIGN.md` — money, identity, route
- `RULES.md` — panels, increments, refunds
- `FEATURES.md` — ranked backlog. Not the homepage.
- `AGENTS.md` — stop rules for harnesses

Verification skills should hit: panel hotspots, min increment, floor/goal math, deposit 20%, etch locked under $120k, no personal handle in rendered HTML.

## Board diagram

Homepage board views are baked JPEGs (`truck-view-*.jpg`) with 1–11 marks. Seat pages keep schematic SVG hotspots plus `PanelBoardCallouts` from `PANEL_BOARD_MARKS` (same order as `PANELS`). This diagram is both layers — not only the schematic SVG.

```text
baked still / stainless still
  schematic SVG (seat pages)
  numbered overlay (seat pages) or baked numbers (homepage)
    1 Hood
    2 Front Fascia
    3 Front Bumper
    4 Driver Side Doors
    5 Driver Rear Sail
    6 Driver Side Bed
    7 Passenger Side Doors
    8 Passenger Rear Sail
    9 Passenger Side Bed
    10 Tailgate
    11 Rear Bumper
```

## Do not build yet

- Impression dashboards
- 48-state live map as a pre-truck promise
- Dual Motor / lease checkout
- Public FEATURES.md page
- Connecting the personal X account as the campaign voice
