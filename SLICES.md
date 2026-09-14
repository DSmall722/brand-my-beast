# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**

Updated: 2026-09-14

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. After Wave 6, idle on polish / a11y / verify-skill. Do not open Wave 7 from FEATURES.md.
- A FEATURES.md row is not scheduled until it has a checkbox in this file.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.

**Now:** 1.2 Signed-in user submits one intent per panel.
**Last merged:** 1.1 (#59 intent schema + Production push)

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null.
- No Stripe. No card capture. No 30-day clock. No tweet.
- No lease copy. No personal name, personal handle, or personal Gmail.
- Do not render FEATURES.md on the homepage.
- Empty P3–P5 boards stay hidden while truckExists === false.
- Intents and waitlist persist in Postgres in Production. Memory store is CI only.
- Hero truck is a bare stainless preview. Do not show wrap or etch as if the truck exists.
- One PR = one slice. Title: `slice(N): <name>`.

## Human-only (do not start)

- Stripe keys, SetupIntent, charging anyone
- Setting CLOSE_AT
- First campaign tweet from @BrandMyBeast
- LLC paperwork
- Moving Vercel nameservers

## Merge gate (all must be true)

- `npm test` and `npm run build` pass
- src/lib/campaign.ts still FLOOR_USD=58000 GOAL_USD=120000 CLOSE_AT=null
- package.json has no stripe
- rendered HTML has no lease and no personal handle
- PR does not add a new public homepage section for P3–P5
- This file has the finished box checked in the same PR

If any gate fails: leave the PR unmerged and stop that slice.

## Wave 0 — public page is a waitlist

- [x] 0.1 Hide every empty P3–P5 homepage section behind truckExists === false. Public / is hero, board, twelve panels, how-it-works, waitlist, footer.
- [x] 0.2 Same hide on /account and /partner empty boards. (#53)
- [x] 0.3 Homepage copy audit: no process-memo voice, no invented miles/scans/city hours. (#54)
- [x] 0.4 Playwright contract: waitlist created/exists; invalid email 400. Production already returns 201 — do not regress. (#55)
- [x] 0.5 prove-all.sh covers 0.1–0.4. CI red = merge nothing else. (#56)
- [x] 0.6 GitHub Actions: Playwright on every PR. (#57)
- [x] 0.7 Hero truck preview (layout A). Fill the empty mobile hero well with a bare stainless Cyberbeast still (side or 3-quarter). Keep the full-bleed dark hero. Wordmark + one lead line + two CTAs overlay the lower third (over bed/ground, not the cab). Truck is the first thing on a phone. Tap/click the truck goes to `#panels`. Do not show wrap or etch as delivered. Do not use Tesla marks, teslacyberbeast livery, a 48-state map, or a 3D configurator. Label it a preview of the board. No new homepage sections. Asset lives in the repo (`public/` or `src/app`), not a hotlinked Tesla CDN. After this ships, 6.9 is only residual clip-check. (#58)

## Wave 1 — durable intent

- [x] 1.1 Intent schema in Drizzle + push on Production. No memory in Production. (#59)
- [ ] 1.2 Signed-in user submits one intent per panel (brand, trade, amount >= opening).
- [ ] 1.3 Amount is intent only. Page says it does not charge.
- [ ] 1.4 One brand per trade. Challenger fights the same panel only.
- [ ] 1.5 Increment: next intent >= standing + max($250, 10%).
- [ ] 1.6 Outbid → previous status outbid + waitlist handoff.
- [ ] 1.7 /panels/[id] is the seat. Homepage cards link there.
- [ ] 1.8 Public standing: brand + trade + amount. No bidder email public.

## Wave 2 — operator

- [ ] 2.1 /operator lists pending intents. Operator email allowlist from env.
- [ ] 2.2 Approve lists the intent. Reject requires a note.
- [ ] 2.3 Banned trades hard-reject (porn, hate, scams, school-lot fail).
- [ ] 2.4 Approval thread on /account.
- [ ] 2.5 Operator UI cannot edit FLOOR_USD / GOAL_USD / CLOSE_AT.

## Wave 3 — mockup and art

- [ ] 3.1 Stainless compositor on the seat. Preview only.
- [ ] 3.2 Etch controls disabled while raised < $120,000.
- [ ] 3.3 Highway-legibility checker.
- [ ] 3.4 Etch linter from RULES.md.
- [ ] 3.5 Artwork URL or upload on the intent.
- [ ] 3.6 Day/night/wet/dirty as toggles. Not proof photos of a truck that does not exist.
- [ ] 3.7 Side / front / rear views + SVG hotspots on the hero/seat truck (the old static prototype pattern). 360 later. Empty seats stay raw 30X.

## Wave 4 — board honesty

- [ ] 4.1 Public “standing” = sum of approved intents. Label it pledged intent, not cash raised, until P3.
- [ ] 4.2 Shortfall ticker: dollars to floor, open seats. No impressions.
- [ ] 4.3 Vault marks at $58,000 and $120,000 on the bar only.
- [ ] 4.4 Wreck / refund FAQ copy from CAMPAIGN.md only.
- [ ] 4.5 Whole-truck $120,000 intent. Hide if field already at $120,000.
- [ ] 4.6 Category exclusivity copy on the seat. No public taxonomy list.

## Wave 5 — accounts

- [ ] 5.1 Auth.js email magic link in Production via Resend. Test login is CI-only.
- [ ] 5.2 /account shows my intents only.
- [ ] 5.3 Waitlist email can become an account without losing the row.
- [ ] 5.4 Partner shop view read-only. No header link on the public page.

## Wave 6 — harden

- [ ] 6.1 Playwright: floor, buyout, etch lock, no lease, no personal handle.
- [ ] 6.2 Playwright: intent create / outbid / exclusivity / increment.
- [ ] 6.3 Playwright: operator approve / reject-with-note.
- [ ] 6.4 verify-brandmybeast feature map matches Waves 0–5.
- [ ] 6.5 Failure copy when DB is down. Never say joined if the write failed.
- [ ] 6.6 Rate-limit waitlist + intent POSTs.
- [ ] 6.7 No in-memory stores in Production.
- [ ] 6.8 Keyboard / labels / contrast on /, seat, operator.
- [ ] 6.9 Hero wordmark and truck still not clipped on mobile.
- [ ] 6.10 OG image and favicon, public brand only.

## After Wave 6

If you finish early: copy polish, a11y, test gaps, maintain the verify skill. Loop those.
Do not open a Wave 7 from FEATURES.md. P3 (Stripe, clock, terms) waits for the human.
