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

**Now:** 17.19 Stop line: after 17.18, idle on this wave. Wave 15 is still Stripe and needs a human message.
**Last merged:** 17.18 Playwright: `/panels/front-fascia` HTML has no prototype / 30X / hotspot / shader / reserved VIN / Stripe. Opening still `$1,200`. Deposit still 20% of opening, not charged. Floor `$58,000`. Buyout `$120,000`.

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

## Waves 0–11

Complete through 11.10 skipped (Vercel hold). Condensed ranges keep verify-map parsers honest; full text lives in git history.

- [x] 0.1–0.9 Complete.
- [x] 1.1–1.8 Complete.
- [x] 2.1–2.5 Complete.
- [x] 3.1–3.7 Complete.
- [x] 4.1–4.6 Complete.
- [x] 5.1–5.4 Complete.
- [x] 6.1–6.15 Complete.
- [x] 7.1–7.10 Complete.
- [x] 8.1–8.10 Complete.
- [x] 9.1–9.10 Complete.
- [x] 10.1–10.10 Complete.
- [x] 11.1–11.10 Complete.

## Wave 12 — money-ready without charging

- [x] 12.1–12.27 Complete through opening-bid rationale. (#156–#182)
- [x] 12.28 Operator cannot approve etch finish while pledged < $120,000. (#183)
- [x] 12.29 Whole-truck intent cannot stack on a panel that already has approved standing. (#186)
- [x] 12.30 Ban-list match is logged with the rule id (ties to 8.8). (#187)
- [x] 12.31 JSON-LD Organization + Offer on `/` from PUBLIC_COPY. No impression claims. (#188)
- [x] 12.32 Canonical URL `https://brandmybeast.com`. (#189)
- [x] 12.33 Print stylesheet for `/panels/[id]`. (#190)
- [x] 12.34 Error boundary + branded 500 that is not a panel. (#191)
- [x] 12.35 Strip `console.log` from `src/` except test helpers. (#192)
- [x] 12.36 `globals.css` split: tokens / hero / board. No copy change. (#193)
- [x] 12.37 Prefetch `/panels/*` from homepage cards. (#194)
- [x] 12.38 Focus restore after waitlist submit. (#195)
- [x] 12.39 `/signin/check-email` uses PUBLIC_COPY success line. (#196)
- [x] 12.40 Remove dead vapor component imports when `TRUCK_EXISTS` is false. (#197)
- [x] 12.41 Structured log line on waitlist insert + intent status change. No PII beyond email hash. (#198)
- [x] 12.42 `/operator/health` last-migration name from Drizzle. (#199)
- [x] 12.43 Drizzle migrate runbook in repo. (#200)
- [x] 12.44 Backup restore drill doc (Neon PITR) next to 11.6. (#201)
- [x] 12.45 Playwright: concurrent two bidders on hood, only one approved standing. (#202)
- [x] 12.46 Playwright: reject without note fails; with note succeeds. (#203)
- [x] 12.47 Verify-skill map for Wave 12. (#204)
- [x] 12.48 `package.json` license + engines. No new runtime. (#205)
- [x] 12.49 SECURITY.md: report to `hello@`. No personal inbox. (#206)
- [x] 12.50 Pre-P3 freeze tag `intent-complete`. Does not set CLOSE_AT. Does not add Stripe. (#207)

## Wave 13 — docs freeze + auction correctness

- [x] 13.1–13.44 Complete. (#208–#252)
- [x] 13.45 Operator health shows waitlist count + pending count + last digest time. (#253)
- [x] 13.46 Document how to run Playwright offline (memory mode). (#254)
- [x] 13.47 Verify-skill map Waves 9–13. (#255)
- [x] 13.48 Tag `wave-12-complete` after 12.50. Still no clock. (#256)
- [x] 13.49 Slice 11.10 remains human: one-line runbook “redeploy when Vercel hold lifts.” (#257)
- [x] 13.50 Stop line in SLICES: Wave 15 is Stripe and needs a human message. (#258)

## Wave 14 — launch readiness, no charge

14.0 shipped (#185). Wave 15 is Stripe. Wave 16 is next after 14.50.

- [x] 14.0 Numbered stainless board. (#185)
- [x] 14.1 FEATURES.md: shipped rows marked shipped with slice id; P3/P5 stay Catalog. (#259)
- [x] 14.2 ARCHITECTURE.md: Postgres + Blob + Resend mock. Stripe box = “not wired.” (#260)
- [x] 14.3 PROCESS.md: Now = first unchecked SLICES box; live URL is not a gate. (#261)
- [x] 14.4 README one-pager: what the repo is, what it is not. (#262)
- [x] 14.5 CAMPAIGN.md current-stack sentence matches ARCHITECTURE. Numbers unchanged. (#263)
- [x] 14.6 RULES.md table of statuses: pending / approved / rejected / outbid / withdrawn. (#264)
- [x] 14.7 PUBLIC_COPY seat rationale only. No H1 rewrite. (#265)
- [x] 14.8 Delete FEATURES rows that contradict CAMPAIGN (lease, $40k, cheaper trim). (#266)
- [x] 14.9 `docs/STATUS.md`: floor, buyout, CLOSE_AT null, Vercel hold, last slice id. (#267)
- [x] 14.10 Kill leftover telegram lines in `.md` except a history note. (#268)
- [x] 14.11 `TRUCK_EXISTS=false` must not import plaque / sighting / circuit / Season 2 modules. (#269)
- [x] 14.12 `/account` nav has no Cabin plaque while the truck does not exist. (#270)
- [x] 14.13 `/partner` has no mileage / heatmap cards. (#271)
- [x] 14.14 Playwright: homepage HTML has no “Season 2”, “Clemson Saturday”, or “48-state.” (#272)
- [x] 14.15 Drop unused card components if unreferenced. (#273)
- [x] 14.16 Per-panel Open Graph title `{Panel} — BrandMyBeast`. (#274)
- [x] 14.17 `SEATS_OPEN=false` flag, separate from `CLOSE_AT`. When false, intent form says waitlist only. (#275)
- [x] 14.18 Operator toggle for `SEATS_OPEN` does not set a date. (#276)
- [x] 14.19 “Seats open” email template exists. Do not send it from the agent. (#277)
- [x] 14.20 Press kit folder: avi, header, one stainless still, one-paragraph fact sheet. No wrap-as-delivered. (#278)
- [x] 14.21 `/llms.txt` with PUBLIC_COPY facts only. (#279)
- [x] 14.22 Sitemap lastmod from git time, not a fake clock. (#280)
- [x] 14.23 Favicon 32/180 only if missing. (#281)
- [x] 14.24 404 and 500 share footer strings. (#282)
- [x] 14.25 Sign-out on `/account` uses PUBLIC_COPY. (#283)
- [x] 14.26 Failed-winner offer cannot target a banned trade. (#284)
- [x] 14.27 Proxy max ignored after the bidder withdraws. (#285)
- [x] 14.28 Floor-save does not raise a rejected mark. (#286)
- [x] 14.29 Whole-truck pending blocks new single-panel intents on those seats until decided. (#287)
- [x] 14.30 Operator note required when forcing a withdraw of an approved seat. (#288)
- [x] 14.31 Standing brand change after approve is forbidden. (#289)
- [x] 14.32 Playwright: `SEATS_OPEN=false` → intent POST 403, waitlist still 201. (#290)
- [x] 14.33 Deposit preview uses the same helper as 12.5. (#291)
- [x] 14.34 Next-minimum display uses integer dollars only. (#292)
- [x] 14.35 Public log timestamps are America/New_York, labeled ET. (#293)
- [x] 14.36 `engines` + license in package.json if 12.48 did not land. (12.48 already landed #205) (#294)
- [x] 14.37 Pinned `npm audit` script. No new runtime. (#295)
- [x] 14.38 CODEOWNERS or a doc: CAMPAIGN.md, SLICES.md, campaign.ts are human-sensitive. (#296)
- [x] 14.39 Resend webhook route for bounces → dead-letter. No live hook required to merge. (#297)
- [x] 14.40 `List-Unsubscribe` header on waitlist mail. (#298)
- [x] 14.41 Maintenance flag: `/` stays up, intent POST returns “not taking marks.” (#299)
- [x] 14.42 Counsel export ZIP of CONTRACT + standing table. No emails in the ZIP. (#300)
- [x] 14.43 Playwright journey: waitlist → sign-in (test) → hood intent → approve → `/account/wins`. (#301)
- [x] 14.44 CI grep: fail on personal Gmail and personal handle. (#302)
- [x] 14.45 CI grep: fail on `stripe` in package.json. (#303)
- [x] 14.46 Verify-skill map Wave 14. (#304)
- [x] 14.47 Tag `wave-13-complete` after 13.50. No clock. (#305)
- [x] 14.48 Refresh `docs/VERCEL-HOLD.md` date only. Do not buy credits. (#306)
- [x] 14.49 Local demo seed: 3 pending, 1 approved, 1 outbid. CI only. (#307)
- [x] 14.50 Stop line: Wave 15 is Stripe / CLOSE_AT / first tweet and needs a human message. (#308)

## Wave 15 — Stripe / money path (human only — STOP)

**Stop line (slices 13.50 / 14.50):** Wave 15 is Stripe and needs a human message.

Do not start Wave 15. Do not wire Stripe. Do not set `CLOSE_AT`. Do not tweet
from @BrandMyBeast. Do not capture cards. See `docs/WAVE-15-STOP.md`.

After Wave 14, agents continue Wave **16** (16.0a–g jump the line, then 16.1+).
Wave 15 waits for an explicit human message. Floor **$58,000**. Buyout **$120,000**.
Clock unset.

## Wave 16 — waitlist A+B first, then numbered board polish

Waitlist stays the public product. Do not flip SEATS_OPEN.

- [x] 16.0a Hide `WholeTruckIntentForm` and the `whole-truck-signin` link from `HomeMoneySection`. Keep the $120,000 buyout cell and vault marks. Keep a short whole-truck *explanation* from PUBLIC_COPY (heading + lead only). No button. No `/signin?callbackUrl=/#money`. Playwright: `/` has no `whole-truck-signin`, no `whole-truck-intent-form`, H1 unchanged, `Notify me` present.
- [x] 16.0b PUBLIC_COPY waitlist checkbox strings: label `I want the whole truck`, hint `This is interest, not a $120,000 bid. Nothing is charged.` Add to PUBLIC_COPY.md. No H1 rewrite. (#311)
- [x] 16.0c Drizzle: `waitlist_signups.want_whole_truck` boolean default false. Memory store in CI gets the same field. No pledged math change. (#312)
- [x] 16.0d `POST /api/waitlist` accepts optional `wantWholeTruck`. Invalid email still 400. Created/exists still 201. Field does not flow into `loadBoardIntentStats`. (#313)
- [x] 16.0e `WaitlistForm` renders the checkbox. POST body includes it. Playwright: checkbox + submit still 201; pledged on `/` stays `$0`. (#314)
- [x] 16.0f `/operator/waitlist` shows a Whole-truck column. Filter optional. No public header link. (#315)
- [x] 16.0g Drop the post-submit line `sign in to list an intent` on the waitlist form (`waitlist-signin-intent`). Next link is browse panels and/or stay on the list. Playwright: that testid is gone from `/`.
- [x] 16.1 Homepage panel cards show the same 1–12 index as the hero callouts. (#317)
- [x] 16.2 Seat page H1 includes the number (`3 · Driver door`). (#318)
- [x] 16.3 Number map legend under the hero: `1 Hood … 12 Rear fascia` from PANELS only. (#319)
- [x] 16.4 Playwright 390px: numbers 1, 3, 5, 9 visible and not clipped by the wordmark. (#320)
- [x] 16.5 Playwright 1280px: all twelve numbers present in the DOM. (#321)
- [x] 16.6 Front / side / rear views use the same number as the hero, not a second index. (#322)
- [x] 16.7 Occupied seats keep the number and add `Held` — still no wrap art on the photo. (#323)
- [x] 16.8 `docs/LOCAL-PREVIEW.md`: `npm i && npm run dev` is how friends see the real page while Vercel is on hold. (#324)
- [x] 16.9 Hero still ships a 1280-wide and a 640-wide asset. No Tesla CDN. (#325)
- [x] 16.10 Callout hit area ≥44px. Keyboard focus ring visible. (#326)
- [x] 16.11 README “How to look at this” points at 16.8. No brandmybeast.com as the demo. (#327)
- [x] 16.12 PUBLIC_COPY panel lead mentions “numbers on the truck match the cards.” No H1 rewrite. (#328)
- [x] 16.13 RULES.md lists the 1–12 order next to panel ids. (#329)
- [x] 16.14 CAMPAIGN.md inventory table includes the number column. Dollars unchanged. (#330)
- [x] 16.15 FEATURES.md “numbered board” row marked shipped with 14.0 / 16.x. (#331)
- [x] 16.16 `docs/STATUS.md` last-slice line updates from SLICES Now (no hand edit of money). (#332)
- [x] 16.17 Kill any leftover “Wave 6 idle” sentence in PROCESS.md. (#333)
- [x] 16.18 ARCHITECTURE.md diagram includes numbered overlay, not only the schematic SVG. (#334)
- [x] 16.19 Press-kit fact sheet (14.20) includes the 1–12 list. (#335)
- [x] 16.20 `/llms.txt` includes floor, buyout, twelve numbered seats, no close date. (#336)
- [x] 16.21 Seat log shows panel number + amount + ET time. (#337)
- [x] 16.22 Operator list columns: #, panel, brand, trade, amount, status. (#338)
- [x] 16.23 CSV export includes panel number. (#339)
- [x] 16.24 Shop PDF title is `Seat 03 — Driver door` not only the slug. (#340)
- [x] 16.25 Whole-truck intent copy lists 1–12 as the package. (#341)
- [x] 16.26 Failed-winner email subject includes panel number. (#342)
- [x] 16.27 Ban-list UI shows which panel numbers were blocked in the last run. (#343)
- [x] 16.28 Playwright: card `#3` and hero callout `3` both go to `/panels/driver-door`. (#344)
- [x] 16.29 Opening prices on cards stay `formatUsd` from campaign.ts. (#345)
- [x] 16.30 Etch badge still `Can etch at $120k` from PUBLIC_COPY. No new money number. (#346)
- [x] 16.31 `npm run preview:share` script prints the local URL and “not the live domain.” (#347)
- [x] 16.32 OG image for `/` includes the wordmark + stainless still. No wrap. (#348)
- [x] 16.33 OG image for `/panels/[id]` includes the number + name. (#349)
- [x] 16.34 `robots.txt` comment: production may be stale while Vercel hold is on. No app behavior change. (#351)
- [x] 16.35 Health panel shows `SEATS_OPEN` once 14.17 exists, else `unset`. (#352)
- [x] 16.36 Screenshot fixture: 390 and 1280 hero stored under `tests/fixtures/board/` for visual diff. (#353)
- [x] 16.37 Visual diff fails CI only if numbers disappear, not on font kerning. (#354)
- [x] 16.38 Reduce-motion: callouts stay visible with no animation. (#355)
- [x] 16.39 Contrast: number badge vs stainless still meets 4.5:1. (#356)
- [x] 16.40 No personal Gmail / @NardLion regression grep (ties 14.44). (#357)
- [x] 16.41 Verify-skill map Wave 16. (#358)
- [x] 16.42 `prove-all.sh` includes 16.4, 16.5, 16.28. (#359)
- [x] 16.43 Tag `wave-14-complete` after 14.50. No clock. (#360)
- [x] 16.44 Tag `wave-16-complete` after 16.43. No clock. (#361)
- [x] 16.45 CI still fails on `stripe` in package.json. (#362)
- [x] 16.46 CI still fails if CLOSE_AT is non-null. (#363)
- [x] 16.47 docs/VERCEL-HOLD.md date bump only. (#364)
- [x] 16.48 Local seed includes numbered standing on seat 1 and 9. (#365)
- [x] 16.49 Counsel ZIP lists seats by number. (#366)
- [x] 16.50 Stop line: after Wave 16, idle. Wave 15 is still Stripe and needs a human message. (#367)

## Wave 17 — phone + public-face correctness

Do not start until 16.50 unless skip-ahead. No Stripe. No CLOSE_AT.

- [x] 17.1 `TRUCK_VIEWS_LEAD` is a buyer sentence. No “prototype”, “hotspot”, or “30X”. (#368)
- [x] 17.2 `truckViewsCopyIsSafe()` requires floor + buyout + no lease / no CLOSE_AT. (#369)
- [x] 17.3 Legend + aria: `Open seat` · `Held = standing intent`. Drop Raw 30X / Not a 360 from visible UI. (#370)
- [x] 17.4 `/signin` live empty state + waitlist link. No env key names in public copy. (#371)
- [x] 17.5 `PUBLIC_COPY.signIn.notOpenYet` + matching PUBLIC_COPY.md line. (#372)
- [x] 17.6 `hero.css` ≤720px: stack caption / H1 / lead / CTAs under the photo. (#373)
- [x] 17.7 `viewport-fit=cover` + safe-area insets on header, hero actions, page bottom. (#374)
- [x] 17.8 Front / Rear: hide the side-body SVG schematic. Same preview photo. No new stills. (#375)
- [x] 17.9 Playwright 390: hero H1 and callouts 2 / 3 / 5 / 7 do not overlap. (#376)
- [x] 17.10 Homepage `.panel-face` is not an empty black rectangle. (#377)
- [x] 17.11 After 17.10 continue 17.12. Wave 15 is still Stripe and needs a human message. (#378)
- [x] 17.12 `STAINLESS_COMPOSITOR_LEAD`, `FINISH_CONDITIONS_LEAD`, and `DIRTY_CLEAN_PAIR_LEAD` are buyer sentences. No “compositor”, “shader”, “VIN”, or “Dirty vs clean pair” as body copy. Floor / buyout from `formatUsd`. Update `stainlessCompositorCopyIsSafe` / `finishConditionsCopyIsSafe` / `dirtyCleanPairCopyIsSafe` so they no longer require shader / toggle / VIN jargon. (#379)
- [x] 17.13 Wrap-only seats do not render the Etch tab. Etchable seats keep the locked tab until pledged ≥ `$120,000`. Copy stays “wrap only” / etch-lock sentence — not a disabled control on fascia / roof / bed. (#380)
- [x] 17.14 Public `/panels/[id]` HTML does not contain “Stripe” or “No Stripe capture.” Intent-only line stays. Vendor name stays out of buyer copy. (#381)
- [x] 17.15 Soft-close / extension block is hidden while `CLOSE_AT` is null and bidding is not open. Do not set a clock. (#382)
- [x] 17.16 Compositor `.panel-mockup-face` is not a striped empty well. Reuse the hero still with a crop, or drop the well. No invented wrap or etch photo. (#383)
- [x] 17.17 Seat-page board: the active polygon sits on the named panel (seat 2 on the front bumper), not floating off-frame. Complements 17.8. No new stills. (#384)
- [x] 17.18 Playwright: `/panels/front-fascia` HTML has no prototype / 30X / hotspot / shader / reserved VIN / Stripe. Opening still `$1,200`. Deposit still 20% of opening, not charged. Floor `$58,000`. Buyout `$120,000`.
- [ ] 17.19 Stop line: after 17.18, idle on this wave. Wave 15 is still Stripe and needs a human message.

## After Wave 17

Idle. Wave 15 is Stripe / CLOSE_AT / first tweet and waits for an explicit human message.
