# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-20

## How this file stays alive

- Next job = the first unchecked box, wave order. One slice per PR.
- After 19.12, do Wave 20. After 20.12, idle. Do not start Wave 15 (Stripe) without a human message.
- Judge PRs from git + `npm test` + `npm run build`.

**Now:** 19.10 Homepage vault while pledged is $0: “No marks yet”.
**Last merged:** 19.9 Mobile header: wordmark and Join/Sign in do not wrap into two ragged rows.

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null. SEATS_OPEN stays false on production.
- No Stripe. No card capture. No 30-day clock. No tweet.
- Public `/` is a waitlist. Do not rewrite the homepage H1.
- Hero truck is bare stainless. No wrap or etch as delivered.
- Copy could be anywhere — no SC-pride hometown lane on public seats.
- One PR = one slice. Title: `slice(N): <name>`.

## Human-only

- Stripe / CLOSE_AT / first tweet / LLC / flipping SEATS_OPEN on production

## Merge gate

- `npm test` and `npm run build` pass
- campaign.ts still FLOOR_USD=58000 GOAL_USD=120000 CLOSE_AT=null
- package.json has no stripe
- rendered HTML has no lease and no personal handle
- This file checks the finished box in the same PR

## Waves 0–18

- [x] 0.1–18.7 Complete. Waitlist A+B shipped. Numbered board shipped. Phone stack shipped. Legal leftovers shipped.

## Wave 15 — Stripe (human only — STOP)

Do not start. See `docs/WAVE-15-STOP.md`.

## Wave 19 — waitlist-era visual + copy (human 2026-09-20)

Fix what is wrong on the live waitlist site. Do not flip SEATS_OPEN. Do not rewrite H1 `Put your brand on the truck people already photograph.`

- [x] 19.1 Public `/panels/[id]` while `SEATS_OPEN` is false: hide `IntentBidForm` and `intent-signin-needed`. Only waitlist CTA. Playwright: no “Sign in to list an intent” on `/panels/hood`. (#394)
- [x] 19.2 Remove `HometownLaneTags` from public seats. No SC / Charlotte / Atlanta / Panhandle on `/panels/*`. Playwright those strings absent. (#395)
- [x] 19.3 Seat lead: if no holder, do not print “Current standing $2,500”. Opening price only. Standing line only when a mark exists. (#396)
- [x] 19.4 Hide Day/Night/Wet/Dirty and etch preview toggles on public seats while `TRUCK_EXISTS` is false. Stainless still + numbers only. (#397)
- [x] 19.5 One disclaimer on the seat compositor, not floor/buyout stamped on every caption. (#398)
- [x] 19.6 Neighbor block: no “combo” heading. Neighbor openings may stay as `formatUsd`. (#399)
- [x] 19.7 Board-truck-seats overlay: hide the giant gray polygons on the photo. Keep numbered callouts 1–12. Playwright numbers still present. (#400)
- [x] 19.8 Desktop hero: numbered callouts must not sit on top of the H1 glyphs. Stack or mask so 2/3/5 do not collide with “Put your brand…”. H1 text unchanged. (#401)
- [x] 19.9 Mobile header: wordmark and Join/Sign in do not wrap into two ragged rows. Safe-area already 17.7. (#402)
- [ ] 19.10 Homepage vault while pledged is $0: “No marks yet” (or PUBLIC_COPY equivalent). Do not read like an empty auction.
- [ ] 19.11 Document title / 404 title use BrandMyBeast + locked idea. Drop leftover “advertise on a Cybertruck” if it is the chrome title.
- [ ] 19.12 Playwright pack: homepage H1 unchanged, `Notify me` present, no hometown cities on `/panels/hood`, no sign-in-to-list on `/panels/hood`, no lease, $58,000 / $120,000 stay.

## Wave 20 — leftover polish from the same pass (human 2026-09-20)

Do not start until 19.12 is checked. No Stripe. No CLOSE_AT. No SEATS_OPEN flip. Do not rewrite the homepage H1.

- [ ] 20.1 Homepage header: hide **Sign in** while sign-in is closed. **Join the list** only.
- [ ] 20.2 Public seat: hide **Sign in to download a seat PNG** while `SEATS_OPEN` is false.
- [ ] 20.3 Panel cards: do not print twelve identical **Open.** Use **Open seat** once, or drop the chorus.
- [ ] 20.4 Money block at pledged $0: do not print both **Floor $58,000** and **Short of floor $58,000**.
- [ ] 20.5 Same for **Short of buyout $120,000** when pledged is $0.
- [ ] 20.6 Replace **Open seat · Held = standing intent** with a buyer sentence from PUBLIC_COPY.
- [ ] 20.7 Homepage whole-truck block: one explanation sentence, not the 12-name package dump.
- [ ] 20.8 Wreck lead is a complete sentence, not a fragment.
- [ ] 20.9 Meta description waitlist-era. No **Bid on a panel** while seats are closed. No H1 change.
- [ ] 20.10 Partner / 404 uses branded back-to-board, not a shop tease.
- [ ] 20.11 Mobile board: numbers 1–12 do not stack on the cab glass. 19.8 is desktop H1 only.
- [ ] 20.12 Playwright: 20.1–20.11 + locked H1 + `Notify me` + $58,000 / $120,000 + no lease.

## After Wave 20

Idle. Wave 15 is Stripe and needs a human message.
