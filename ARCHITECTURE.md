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
| Stripe | **not wired.** No SetupIntent, no capture, no `stripe` package. Wave 15 needs a human message. |
| Host | Vercel, domain already on Vercel DNS (usage hold: live URL is not a merge gate — `docs/VERCEL-HOLD.md`) |
| Tests | Playwright, driven by pstack verification skills |
| Agents | Cursor Projects coordinator + `/poteto-mode` after skills exist |
| Auth (P2) | **Auth.js** (`next-auth` v5). Test login for CI; Resend magic link in live. See `P2.md`. |

Do not build a second framework. Do not put the auction ledger in `localStorage` or a client JSON file.

The Stripe box above stays **not wired** until a human opens Wave 15. `package.json` has no `stripe` dependency. `CLOSE_AT` stays null until a human starts P3. Do not start the 30-day clock from this file.

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
    2 Front fascia (stainless)
    3 Driver doors
    4 Passenger doors
    5 Driver bed
    6 Passenger bed
    7 Driver rear quarter
    8 Passenger rear quarter
    9 Tailgate
    10 Front bumper
    11 Rear bumper
```

## Do not build yet

- Impression dashboards
- 48-state live map as a pre-truck promise
- Dual Motor / lease checkout
- Public FEATURES.md page
- Connecting the personal X account as the campaign voice
