# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-16

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- After 13.50, do 14.1–14.50, then Wave 16. Do not start Wave 15 (Stripe) without a human message.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. After Wave 16, idle.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a gate while the Vercel usage hold is on.

**Now:** 14.6 RULES.md table of statuses: pending / approved / rejected / outbid / withdrawn.
**Last merged:** 14.5 (#PENDING CAMPAIGN stack matches ARCHITECTURE).

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null.
- No Stripe. No card capture. No 30-day clock. No tweet.
- No lease copy. No personal name, personal handle, or personal Gmail.
- Do not render FEATURES.md on the homepage.
- Empty P3–P5 boards stay hidden while truckExists === false.
- Hero truck is a bare stainless preview. Do not show wrap or etch as if the truck exists.
- Visible copy on `/` must match PUBLIC_COPY.md. Do not rewrite the rewrite.
- Vercel usage hold: do not add preview deploys, extra Vercel projects, or slices that only exist to inspect the live URL.
- One PR = one slice. Title: `slice(N): <name>`.

## Human-only (do not start)

- Stripe keys, SetupIntent, charging anyone
- Setting CLOSE_AT
- First campaign tweet from @BrandMyBeast
- LLC paperwork
- Moving Vercel nameservers
- Clearing the Vercel usage hold / buying more credits
- Wave 15 (money path)

## Merge gate (all must be true)

- `npm test` and `npm run build` pass
- src/lib/campaign.ts still FLOOR_USD=58000 GOAL_USD=120000 CLOSE_AT=null
- package.json has no stripe
- rendered HTML has no lease and no personal handle
- PR does not add a new public homepage section for P3–P5
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

14.0 shipped (#185). Do 14.1 after 13.50. Wave 15 is Stripe. Wave 16 is next after 14.50.

- [x] 14.0 Numbered stainless board. (#185)
- [x] 14.1 FEATURES.md: shipped rows marked shipped with slice id; P3/P5 stay Catalog. (#259)
- [x] 14.2 ARCHITECTURE.md: Postgres + Blob + Resend mock. Stripe box = “not wired.” (#260)
- [x] 14.3 PROCESS.md: Now = first unchecked SLICES box; live URL is not a gate. (#261)
- [x] 14.4 README one-pager: what the repo is, what it is not. (#262)
- [x] 14.5 CAMPAIGN.md current-stack sentence matches ARCHITECTURE. Numbers unchanged. (#PENDING)
- [ ] 14.6 RULES.md table of statuses: pending / approved / rejected / outbid / withdrawn.
- [ ] 14.7 PUBLIC_COPY seat rationale only. No H1 rewrite.
- [ ] 14.8 Delete FEATURES rows that contradict CAMPAIGN (lease, $40k, cheaper trim).
- [ ] 14.9 `docs/STATUS.md`: floor, buyout, CLOSE_AT null, Vercel hold, last slice id.
- [ ] 14.10 Kill leftover telegram lines in `.md` except a history note.
- [ ] 14.11 `TRUCK_EXISTS=false` must not import plaque / sighting / circuit / Season 2 modules.
- [ ] 14.12 `/account` nav has no Cabin plaque while the truck does not exist.
- [ ] 14.13 `/partner` has no mileage / heatmap cards.
- [ ] 14.14 Playwright: homepage HTML has no “Season 2”, “Clemson Saturday”, or “48-state.”
- [ ] 14.15 Drop unused card components if unreferenced.
- [ ] 14.16 Per-panel Open Graph title `{Panel} — BrandMyBeast`.
- [ ] 14.17 `SEATS_OPEN=false` flag, separate from `CLOSE_AT`. When false, intent form says waitlist only.
- [ ] 14.18 Operator toggle for `SEATS_OPEN` does not set a date.
- [ ] 14.19 “Seats open” email template exists. Do not send it from the agent.
- [ ] 14.20 Press kit folder: avi, header, one stainless still, one-paragraph fact sheet. No wrap-as-delivered.
- [ ] 14.21 `/llms.txt` with PUBLIC_COPY facts only.
- [ ] 14.22 Sitemap lastmod from git time, not a fake clock.
- [ ] 14.23 Favicon 32/180 only if missing.
- [ ] 14.24 404 and 500 share footer strings.
- [ ] 14.25 Sign-out on `/account` uses PUBLIC_COPY.
- [ ] 14.26 Failed-winner offer cannot target a banned trade.
- [ ] 14.27 Proxy max ignored after the bidder withdraws.
- [ ] 14.28 Floor-save does not raise a rejected mark.
- [ ] 14.29 Whole-truck pending blocks new single-panel intents on those seats until decided.
- [ ] 14.30 Operator note required when forcing a withdraw of an approved seat.
- [ ] 14.31 Standing brand change after approve is forbidden.
- [ ] 14.32 Playwright: `SEATS_OPEN=false` → intent POST 403, waitlist still 201.
- [ ] 14.33 Deposit preview uses the same helper as 12.5.
- [ ] 14.34 Next-minimum display uses integer dollars only.
- [ ] 14.35 Public log timestamps are America/New_York, labeled ET.
- [ ] 14.36 `engines` + license in package.json if 12.48 did not land.
- [ ] 14.37 Pinned `npm audit` script. No new runtime.
- [ ] 14.38 CODEOWNERS or a doc: CAMPAIGN.md, SLICES.md, campaign.ts are human-sensitive.
- [ ] 14.39 Resend webhook route for bounces → dead-letter. No live hook required to merge.
- [ ] 14.40 `List-Unsubscribe` header on waitlist mail.
- [ ] 14.41 Maintenance flag: `/` stays up, intent POST returns “not taking marks.”
- [ ] 14.42 Counsel export ZIP of CONTRACT + standing table. No emails in the ZIP.
- [ ] 14.43 Playwright journey: waitlist → sign-in (test) → hood intent → approve → `/account/wins`.
- [ ] 14.44 CI grep: fail on personal Gmail and personal handle.
- [ ] 14.45 CI grep: fail on `stripe` in package.json.
- [ ] 14.46 Verify-skill map Wave 14.
- [ ] 14.47 Tag `wave-13-complete` after 13.50. No clock.
- [ ] 14.48 Refresh `docs/VERCEL-HOLD.md` date only. Do not buy credits.
- [ ] 14.49 Local demo seed: 3 pending, 1 approved, 1 outbid. CI only.
- [ ] 14.50 Stop line: Wave 15 is Stripe / CLOSE_AT / first tweet and needs a human message.

## Wave 15 — Stripe / money path (human only — STOP)

**Stop line (slice 13.50):** Wave 15 is Stripe and needs a human message.

Do not start Wave 15. Do not wire Stripe. Do not set `CLOSE_AT`. Do not tweet
from @BrandMyBeast. Do not capture cards. See `docs/WAVE-15-STOP.md`.

After Wave 13, agents continue **14.1–14.50**, then Wave **16**. Wave 15 waits
for an explicit human message. Floor **$58,000**. Buyout **$120,000**. Clock unset.

## Wave 16 — shareable board + freeze polish

Human-approved 2026-09-16. Do not start until 14.50 is checked. No Stripe. No CLOSE_AT. No tweet. No live-URL gate. Wave 15 stays human-only money.

### Numbered board people can send

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

### Copy / docs that still drift

- [ ] 16.11 README “How to look at this” points at 16.8. No brandmybeast.com as the demo.
- [ ] 16.12 PUBLIC_COPY panel lead mentions “numbers on the truck match the cards.” No H1 rewrite.
- [ ] 16.13 RULES.md lists the 1–12 order next to panel ids.
- [ ] 16.14 CAMPAIGN.md inventory table includes the number column. Dollars unchanged.
- [ ] 16.15 FEATURES.md “numbered board” row marked shipped with 14.0 / 16.x.
- [ ] 16.16 `docs/STATUS.md` last-slice line updates from SLICES Now (no hand edit of money).
- [ ] 16.17 Kill any leftover “Wave 6 idle” sentence in PROCESS.md.
- [ ] 16.18 ARCHITECTURE.md diagram includes numbered overlay, not only the schematic SVG.
- [ ] 16.19 Press-kit fact sheet (14.20) includes the 1–12 list.
- [ ] 16.20 `/llms.txt` includes floor, buyout, twelve numbered seats, no close date.

### Auction leftovers

- [ ] 16.21 Seat log shows panel number + amount + ET time.
- [ ] 16.22 Operator list columns: #, panel, brand, trade, amount, status.
- [ ] 16.23 CSV export includes panel number.
- [ ] 16.24 Shop PDF title is `Seat 03 — Driver door` not only the slug.
- [ ] 16.25 Whole-truck intent copy lists 1–12 as the package.
- [ ] 16.26 Failed-winner email subject includes panel number.
- [ ] 16.27 Ban-list UI shows which panel numbers were blocked in the last run.
- [ ] 16.28 Playwright: card `#3` and hero callout `3` both go to `/panels/driver-door`.
- [ ] 16.29 Opening prices on cards stay `formatUsd` from campaign.ts.
- [ ] 16.30 Etch badge still `Can etch at $120k` from PUBLIC_COPY. No new money number.

### Share / ops

- [ ] 16.31 `npm run preview:share` script prints the local URL and “not the live domain.”
- [ ] 16.32 OG image for `/` includes the wordmark + stainless still. No wrap.
- [ ] 16.33 OG image for `/panels/[id]` includes the number + name.
- [ ] 16.34 `robots.txt` comment: production may be stale while Vercel hold is on. No app behavior change.
- [ ] 16.35 Health panel shows `SEATS_OPEN` once 14.17 exists, else `unset`.
- [ ] 16.36 Screenshot fixture: 390 and 1280 hero stored under `tests/fixtures/board/` for visual diff.
- [ ] 16.37 Visual diff fails CI only if numbers disappear, not on font kerning.
- [ ] 16.38 Reduce-motion: callouts stay visible with no animation.
- [ ] 16.39 Contrast: number badge vs stainless still meets 4.5:1.
- [ ] 16.40 No personal Gmail / @NardLion regression grep (ties 14.44).

### Freeze

- [ ] 16.41 Verify-skill map Wave 16.
- [ ] 16.42 `prove-all.sh` includes 16.4, 16.5, 16.28.
- [ ] 16.43 Tag `wave-14-complete` after 14.50. No clock.
- [ ] 16.44 Tag `wave-16-complete` after 16.43. No clock.
- [ ] 16.45 CI still fails on `stripe` in package.json.
- [ ] 16.46 CI still fails if CLOSE_AT is non-null.
- [ ] 16.47 docs/VERCEL-HOLD.md date bump only.
- [ ] 16.48 Local seed includes numbered standing on seat 1 and 9.
- [ ] 16.49 Counsel ZIP lists seats by number.
- [ ] 16.50 Stop line: after Wave 16, idle. Wave 15 is still Stripe and needs a human message.

## After Wave 16

Idle on polish / a11y / verify-skill.
Wave 15 is Stripe / CLOSE_AT / first tweet and waits for an explicit human message.
Do not open Wave 17 from FEATURES.md.
