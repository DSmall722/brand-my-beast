# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
Public homepage strings come from PUBLIC_COPY.md. Do not invent a warmer variant.

Updated: 2026-09-14

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. After Wave 6, idle on polish / a11y / verify-skill. Do not open Wave 7 from FEATURES.md.
- A FEATURES.md row is not scheduled until it has a checkbox in this file.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.

**Now:** 6.10 OG image and favicon, public brand only.
**Last merged:** 6.9 (#99 Hero wordmark and truck still not clipped on mobile.)

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null.
- No Stripe. No card capture. No 30-day clock. No tweet.
- No lease copy. No personal name, personal handle, or personal Gmail.
- Do not render FEATURES.md on the homepage.
- Empty P3–P5 boards stay hidden while truckExists === false.
- Intents and waitlist persist in Postgres in Production. Memory store is CI only.
- Hero truck is a bare stainless preview. Do not show wrap or etch as if the truck exists.
- Visible copy on `/` must match PUBLIC_COPY.md. Do not rewrite the rewrite.
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
- [x] 0.8 Ship PUBLIC_COPY.md onto `/` verbatim. Replace telegram hero lines. Section order: hero, The numbers, The twelve panels, How it works, What etch actually is, Questions people actually ask, Get on the list, footer. Keep the 0.7 stainless still. Keep $58,000 / $120,000 / 20% / CLOSE_AT null / hello@brandmybeast.com. Do not invent a per-panel etch dollar. Do not add Cabin plaque or FEATURES boards. Playwright asserts H1 `Put your brand on a Cybertruck.`, etch section present, no lease, no close date. After merge, resume Wave 1 at 1.3. (#62)
- [x] 0.9 Ship locked copy v2 from PUBLIC_COPY.md verbatim. H1 must be `Put your brand on the truck people already photograph.` Lead must be the three-beat line (twelve companies / one Cyberbeast / $58,000 or nobody pays). Kill public use of P3, pledged intent, and operator-finances. Keep stainless hero, $58,000 / $120,000 / 20% / CLOSE_AT null / hello@. No invented etch price. Playwright asserts the new H1 and `Notify me`. After merge, resume 6.6. (#95)

## Wave 1 — durable intent

- [x] 1.1 Intent schema in Drizzle + push on Production. No memory in Production. (#59)
- [x] 1.2 Signed-in user submits one intent per panel (brand, trade, amount >= opening). (#60)
- [x] 1.3 Amount is intent only. Page says it does not charge. (#61)
- [x] 1.4 One brand per trade. Challenger fights the same panel only. (#63)
- [x] 1.5 Increment: next intent >= standing + max($250, 10%). (#64)
- [x] 1.6 Outbid → previous status outbid + waitlist handoff. (#65)
- [x] 1.7 /panels/[id] is the seat. Homepage cards link there. (#66)
- [x] 1.8 Public standing: brand + trade + amount. No bidder email public. (#67)

## Wave 2 — operator

- [x] 2.1 /operator lists pending intents. Operator email allowlist from env. (#68)
- [x] 2.2 Approve lists the intent. Reject requires a note. (#69)
- [x] 2.3 Banned trades hard-reject (porn, hate, scams, school-lot fail). (#70)
- [x] 2.4 Approval thread on /account. (#71)
- [x] 2.5 Operator UI cannot edit FLOOR_USD / GOAL_USD / CLOSE_AT. (#72)

## Wave 3 — mockup and art

- [x] 3.1 Stainless compositor on the seat. Preview only. (#73)
- [x] 3.2 Etch controls disabled while raised < $120,000. (#74)
- [x] 3.3 Highway-legibility checker. (#75)
- [x] 3.4 Etch linter from RULES.md. (#76)
- [x] 3.5 Artwork URL or upload on the intent. (#77)
- [x] 3.6 Day/night/wet/dirty as toggles. Not proof photos of a truck that does not exist. (#78)
- [x] 3.7 Side / front / rear views + SVG hotspots on the hero/seat truck (the old static prototype pattern). 360 later. Empty seats stay raw 30X. (#79)

## Wave 4 — board honesty

- [x] 4.1 Public “standing” = sum of approved intents. Label it pledged so far, not cash raised, until cards exist. (#80)
- [x] 4.2 Shortfall ticker: dollars to floor, open seats. No impressions. (#81)
- [x] 4.3 Vault marks at $58,000 and $120,000 on the bar only. (#82)
- [x] 4.4 Wreck / refund FAQ uses PUBLIC_COPY.md + CAMPAIGN.md only. No invented legal terms. (#83)
- [x] 4.5 Whole-truck $120,000 intent. Hide if field already at $120,000. (#84)
- [x] 4.6 Category exclusivity copy on the seat. No public taxonomy list. (#85)

## Wave 5 — accounts

- [x] 5.1 Auth.js email magic link in Production via Resend. Test login is CI-only. (#86)
- [x] 5.2 /account shows my intents only. (#87)
- [x] 5.3 Waitlist email can become an account without losing the row. (#88)
- [x] 5.4 Partner shop view read-only. No header link on the public page. (#89)

## Wave 6 — harden

- [x] 6.1 Playwright: floor, buyout, etch lock, no lease, no personal handle. (#90)
- [x] 6.2 Playwright: intent create / outbid / exclusivity / increment. (#91)
- [x] 6.3 Playwright: operator approve / reject-with-note. (#92)
- [x] 6.4 verify-brandmybeast feature map matches Waves 0–5. (#93)
- [x] 6.5 Failure copy when DB is down. Never say joined if the write failed. (#94)
- [x] 6.6 Rate-limit waitlist + intent POSTs. (#96)
- [x] 6.7 No in-memory stores in Production. (#97)
- [x] 6.8 Keyboard / labels / contrast on /, seat, operator. (#98)
- [x] 6.9 Hero wordmark and truck still not clipped on mobile. (#99)
- [ ] 6.10 OG image and favicon, public brand only.
- [ ] 6.11 Playwright: homepage matches PUBLIC_COPY.md H1 `Put your brand on the truck people already photograph.` and waitlist button `Notify me`.
- [ ] 6.12 One ObsidianUI block on the hero primary CTA only. Init shadcn `components.json` if missing. Add exactly `arrow-fill-button` (`npx shadcn@latest add "https://www.obsidianui.dev/r/arrow-fill-button.json"`). Replace the hero `<a className="btn btn-signal" href="#waitlist">` with that component. Visible string stays `Get on the list` from PUBLIC_COPY.md. href stays `#waitlist`. Waitlist submit stays the existing form button `Notify me`. Convert the registry `.jsx` to `.tsx`. Restyle CSS tokens to current `globals.css` stainless / black — no purple kit palette. `prefers-reduced-motion: reduce` = no fill animation; the control stays a real link with a visible focus ring. Abort the PR if the JSON adds gsap, three, @react-three/*, or Lenis. Ban for this PR: hover-img, magnetic-image-trail, fractal-glass, book-flip, rope-cursor, butterfly-trail-cursor, colorful-cursor-aura, mask-cursor-effect, apple-spotlight, cursor trails. Do not add a homepage section. Do not rewrite PUBLIC_COPY, H1, lead, secondary CTA, panel cards, waitlist form, operator, or intent. Playwright: H1 from 0.9, `Notify me`, hero primary CTA text + href `#waitlist`, no lease, no personal handle. Title: `slice(6.12): obsidianui signal button`.
- [ ] 6.13 Branded not-found page. Add `src/app/not-found.tsx`. Study 404s.design for layout only — do not clone a gallery page or steal type. Dark stainless chrome, wordmark BrandMyBeast, one line `This page is not a panel.`, links Home (`/`) and `Get on the list` (`/#waitlist`). Footer strings from PUBLIC_COPY.md. Independent. Not Tesla. No lease, no close date, no personal handle, no street address, no wrap-as-delivered truck. No GSAP/Three/Lenis. Playwright: 404 status, those two links, no lease / no personal handle. Title: `slice(6.13): branded 404`.
- [ ] 6.14 Footer layout only. Study footer.design for stacking, not copy. Keep exact PUBLIC_COPY.md footer strings (`BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com` and `Independent. Not Tesla.`). Mobile-stack the existing footer. No street address, no social grid, no sitemap dump, no new homepage section. Do not rewrite hero, waitlist, or panels. Depends on 6.8 contrast. Playwright: footer strings unchanged, no lease / no personal handle. Title: `slice(6.14): footer layout`.

## After Wave 6

If you finish early: copy polish, a11y, test gaps, maintain the verify skill. Loop those.
Do not open a Wave 7 from FEATURES.md. P3 (Stripe, clock, terms) waits for the human.
