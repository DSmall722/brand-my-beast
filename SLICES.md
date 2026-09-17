# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-17

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- Exception 2026-09-17: **16.0a–g** jump the line (waitlist A+B). Then resume 16.1.
- After Wave 16, do Wave 17. Do not start Wave 15 (Stripe) without a human message.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a merge gate.

**Now:** 16.0b PUBLIC_COPY waitlist checkbox strings: label `I want the whole truck`, hint `This is interest, not a $120,000 bid. Nothing is charged.` Add to PUBLIC_COPY.md. No H1 rewrite.
**Last merged:** 16.0a Hide whole-truck sign-in and form from public `/`.

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null. SEATS_OPEN stays false on production.
- No Stripe. No card capture. No 30-day clock. No tweet.
- Public `/` is a waitlist. Do not ask anyone to sign in to buy the truck or list a mark from the homepage.
- Whole-truck interest is a waitlist checkbox. Not pledged. Not on the vault bar.
- Hero truck is a bare stainless preview. Do not show wrap or etch as if the truck exists.
- Visible copy on `/` must match PUBLIC_COPY.md. Do not rewrite the homepage H1.
- One PR = one slice. Title: `slice(N): <name>`.

## Human-only (do not start)

- Stripe keys, SetupIntent, charging anyone
- Setting CLOSE_AT
- First campaign tweet from @BrandMyBeast
- LLC paperwork / Vercel hold / Wave 15
- Flipping SEATS_OPEN to true on production

## Merge gate (all must be true)

- `npm test` and `npm run build` pass
- src/lib/campaign.ts still FLOOR_USD=58000 GOAL_USD=120000 CLOSE_AT=null
- package.json has no stripe
- rendered HTML has no lease and no personal handle
- This file has the finished box checked in the same PR

## Waves 0–15

- [x] 0.1–14.50 Complete except as noted in git. Wave 15 is Stripe STOP.

## Wave 16 — waitlist A+B first, then numbered board polish

Waitlist stays the public product. Do not flip SEATS_OPEN.

- [x] 16.0a Hide `WholeTruckIntentForm` and the `whole-truck-signin` link from `HomeMoneySection`. Keep the $120,000 buyout cell and vault marks. Keep a short whole-truck *explanation* from PUBLIC_COPY (heading + lead only). No button. No `/signin?callbackUrl=/#money`. Playwright: `/` has no `whole-truck-signin`, no `whole-truck-intent-form`, H1 unchanged, `Notify me` present.
- [ ] 16.0b PUBLIC_COPY waitlist checkbox strings: label `I want the whole truck`, hint `This is interest, not a $120,000 bid. Nothing is charged.` Add to PUBLIC_COPY.md. No H1 rewrite.
- [ ] 16.0c Drizzle: `waitlist_signups.want_whole_truck` boolean default false. Memory store in CI gets the same field. No pledged math change.
- [ ] 16.0d `POST /api/waitlist` accepts optional `wantWholeTruck`. Invalid email still 400. Created/exists still 201. Field does not flow into `loadBoardIntentStats`.
- [ ] 16.0e `WaitlistForm` renders the checkbox. POST body includes it. Playwright: checkbox + submit still 201; pledged on `/` stays `$0`.
- [ ] 16.0f `/operator/waitlist` shows a Whole-truck column. Filter optional. No public header link.
- [ ] 16.0g Drop the post-submit line `sign in to list an intent` on the waitlist form (`waitlist-signin-intent`). Next link is browse panels and/or stay on the list. Playwright: that testid is gone from `/`.
- [ ] 16.1 Homepage panel cards show the same 1–12 index as the hero callouts.
- [ ] 16.2–16.50 Remain as previously locked (numbered board, docs, freeze). No Stripe. No CLOSE_AT. No SEATS_OPEN flip.

## Wave 17 — phone + public-face correctness

Do not start until 16.50 unless skip-ahead. No Stripe. No CLOSE_AT.

- [ ] 17.1–17.11 Phone / legend / signin empty state as previously locked.
- [ ] 17.12–17.19 Seat compositor buyer copy as previously locked.

## After Wave 17

Idle. Wave 15 is Stripe / CLOSE_AT / first tweet and waits for an explicit human message.
