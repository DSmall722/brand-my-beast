# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-17

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- Exception 2026-09-17: **16.0** jumps the line (A+B whole-truck). Then resume 16.1.
- After Wave 16, do Wave 17. Do not start Wave 15 (Stripe) without a human message.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a merge gate.

**Now:** 16.0 Hide public whole-truck sign-in. Waitlist checkbox for whole-truck interest.
**Last merged:** 14.50 Stop line: Wave 15 is Stripe / CLOSE_AT / first tweet and needs a human message.

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null.
- No Stripe. No card capture. No 30-day clock. No tweet.
- No lease copy. No personal name, personal handle, or personal Gmail.
- Public `/` does not ask anyone to sign in to “buy the whole truck.” Whole-truck on the waitlist is a checkbox, not pledged dollars.
- Hero truck is a bare stainless preview. Do not show wrap or etch as if the truck exists.
- Visible copy on `/` must match PUBLIC_COPY.md. Do not rewrite the rewrite.
- One PR = one slice. Title: `slice(N): <name>`.

## Human-only (do not start)

- Stripe keys, SetupIntent, charging anyone
- Setting CLOSE_AT
- First campaign tweet from @BrandMyBeast
- LLC paperwork
- Moving Vercel nameservers / clearing the Vercel usage hold
- Wave 15 (money path)
- Flipping SEATS_OPEN to true on production (live-board day)
- Wiring AUTH_SECRET / AUTH_URL / RESEND_API_KEY / RESEND_FROM / DATABASE_URL on Vercel production (17.4 hides the env list; it does not set secrets)

## Merge gate (all must be true)

- `npm test` and `npm run build` pass
- src/lib/campaign.ts still FLOOR_USD=58000 GOAL_USD=120000 CLOSE_AT=null
- package.json has no stripe
- rendered HTML has no lease and no personal handle
- PR does not add a new public homepage section for P3–P5
- This file has the finished box checked in the same PR

## Waves 0–15

- [x] 0.1–14.50 Complete except as noted in git. 14.0 numbered board (#185). Wave 15 is Stripe STOP.

## Wave 16 — shareable board + freeze polish

- [ ] 16.0 A+B locked 2026-09-17. Hide `WholeTruckIntentForm` and “Sign in to list a whole-truck intent” from public `/` (HomeMoneySection). Vault still shows $120,000 as a number, not a button. Waitlist form gets optional checkbox “I want the whole truck” stored on the waitlist row. That row is demand, not pledged, not on the bar. Playwright: no `whole-truck-signin` / whole-truck form on `/`; checkbox present; H1 unchanged; `Notify me` present; no lease.
- [ ] 16.1 Homepage panel cards show the same 1–12 index as the hero callouts.
- [ ] 16.2 Seat page H1 includes the number (`3 · Driver door`).
- [ ] 16.3 Number map legend under the hero: `1 Hood … 12 Rear fascia` from PANELS only.
- [ ] 16.4 Playwright 390px: numbers 1, 3, 5, 9 visible and not clipped by the wordmark.
- [ ] 16.5 Playwright 1280px: all twelve numbers present in the DOM.
- [ ] 16.6 Front / side / rear views use the same number as the hero, not a second index.
- [ ] 16.7 Occupied seats keep the number and add `Held` — still no wrap art on the photo.
- [ ] 16.8 `docs/LOCAL-PREVIEW.md`: `npm i && npm run dev` is how friends see the real page while Vercel is on hold.
- [ ] 16.9 Hero still ships a 1280-wide and a 640-wide asset. No Tesla CDN.
- [ ] 16.10 Callout hit area ≥44px. Keyboard focus ring visible.
- [ ] 16.11–16.50 Remain as previously locked (docs, auction leftovers, share/ops, freeze). No Stripe. No CLOSE_AT.

## Wave 17 — phone + public-face correctness

Human-requested 2026-09-17 from production iPhone Safari shots.
Do not start until 16.50 unless the operator skip-aheads. No Stripe. No CLOSE_AT. No tweet.
No invented front/rear photos. No hometown-lane restyle. Do not rewrite the homepage H1.
Money stays `formatUsd(FLOOR_USD)` / `formatUsd(GOAL_USD)`.

- [ ] 17.1 `TRUCK_VIEWS_LEAD` is a buyer sentence. No “prototype”, “hotspot”, or “30X”.
- [ ] 17.2 `truckViewsCopyIsSafe()` requires floor + buyout + no lease / no CLOSE_AT.
- [ ] 17.3 Legend + aria: `Open seat` · `Held = standing intent`. Drop Raw 30X / Not a 360 from visible UI.
- [ ] 17.4 `/signin` live empty state + waitlist link. No env key names in public copy.
- [ ] 17.5 `PUBLIC_COPY.signIn.notOpenYet` + matching PUBLIC_COPY.md line.
- [ ] 17.6 `hero.css` ≤720px: stack caption / H1 / lead / CTAs under the photo.
- [ ] 17.7 `viewport-fit=cover` + safe-area insets on header, hero actions, page bottom.
- [ ] 17.8 Front / Rear: hide the side-body SVG schematic. Same preview photo. No new stills.
- [ ] 17.9 Playwright 390: hero H1 and callouts 2 / 3 / 5 / 7 do not overlap.
- [ ] 17.10 Homepage `.panel-face` is not an empty black rectangle.
- [ ] 17.11 After 17.10 continue 17.12. Wave 15 is still Stripe and needs a human message.

### Seat-page compositor (front-fascia review 2026-09-17)

- [ ] 17.12 `STAINLESS_COMPOSITOR_LEAD`, `FINISH_CONDITIONS_LEAD`, and `DIRTY_CLEAN_PAIR_LEAD` are buyer sentences. No “compositor”, “shader”, “VIN”, or “Dirty vs clean pair” as body copy. Floor / buyout from `formatUsd`. Update `stainlessCompositorCopyIsSafe` / `finishConditionsCopyIsSafe` / `dirtyCleanPairCopyIsSafe` so they no longer require shader / toggle / VIN jargon.
- [ ] 17.13 Wrap-only seats do not render the Etch tab. Etchable seats keep the locked tab until pledged ≥ `$120,000`. Copy stays “wrap only” / etch-lock sentence — not a disabled control on fascia / roof / bed.
- [ ] 17.14 Public `/panels/[id]` HTML does not contain “Stripe” or “No Stripe capture.” Intent-only line stays. Vendor name stays out of buyer copy.
- [ ] 17.15 Soft-close / extension block is hidden while `CLOSE_AT` is null and bidding is not open. Do not set a clock.
- [ ] 17.16 Compositor `.panel-mockup-face` is not a striped empty well. Reuse the hero still with a crop, or drop the well. No invented wrap or etch photo.
- [ ] 17.17 Seat-page board: the active polygon sits on the named panel (seat 2 on the front bumper), not floating off-frame. Complements 17.8. No new stills.
- [ ] 17.18 Playwright: `/panels/front-fascia` HTML has no prototype / 30X / hotspot / shader / reserved VIN / Stripe. Opening still `$1,200`. Deposit still 20% of opening, not charged. Floor `$58,000`. Buyout `$120,000`.
- [ ] 17.19 Stop line: after 17.18, idle on this wave. Wave 15 is still Stripe and needs a human message.

## After Wave 17

Idle. Wave 15 is Stripe / CLOSE_AT / first tweet and waits for an explicit human message.
Do not open Wave 18 from FEATURES.md.
