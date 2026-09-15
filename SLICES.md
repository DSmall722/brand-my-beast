# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-15

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. Waves 7–12 are scheduled below. Do not open Wave 13 from FEATURES.md.
- A FEATURES.md row is not scheduled until it has a checkbox in this file.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a gate while the Vercel usage hold is on.

**Now:** 8.8 Operator ban-list table + hard-reject matching intents.
**Last merged:** 8.7 (#122 Partner shop: approved seats + art only).

## Standing orders

- Floor $58,000. Buyout $120,000. CLOSE_AT = null.
- No Stripe. No card capture. No 30-day clock. No tweet.
- No lease copy. No personal name, personal handle, or personal Gmail.
- Do not render FEATURES.md on the homepage.
- Empty P3–P5 boards stay hidden while truckExists === false.
- Intents and waitlist persist in Postgres in Production. Memory store is CI only.
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
- [x] 0.7 Hero truck preview (layout A). (#58)
- [x] 0.8 Ship PUBLIC_COPY.md onto `/` verbatim. (#62)
- [x] 0.9 Ship locked copy v2 from PUBLIC_COPY.md verbatim. H1 `Put your brand on the truck people already photograph.` (#95)

## Wave 1 — durable intent

- [x] 1.1 Intent schema in Drizzle + push on Production. (#59)
- [x] 1.2 Signed-in user submits one intent per panel. (#60)
- [x] 1.3 Amount is intent only. Page says it does not charge. (#61)
- [x] 1.4 One brand per trade. (#63)
- [x] 1.5 Increment: next intent >= standing + max($250, 10%). (#64)
- [x] 1.6 Outbid → previous status outbid + waitlist handoff. (#65)
- [x] 1.7 /panels/[id] is the seat. (#66)
- [x] 1.8 Public standing: brand + trade + amount. No bidder email public. (#67)

## Wave 2 — operator

- [x] 2.1 /operator lists pending intents. (#68)
- [x] 2.2 Approve lists the intent. Reject requires a note. (#69)
- [x] 2.3 Banned trades hard-reject. (#70)
- [x] 2.4 Approval thread on /account. (#71)
- [x] 2.5 Operator UI cannot edit FLOOR_USD / GOAL_USD / CLOSE_AT. (#72)

## Wave 3 — mockup and art

- [x] 3.1 Stainless compositor on the seat. (#73)
- [x] 3.2 Etch controls disabled while raised < $120,000. (#74)
- [x] 3.3 Highway-legibility checker. (#75)
- [x] 3.4 Etch linter from RULES.md. (#76)
- [x] 3.5 Artwork URL or upload on the intent. (#77)
- [x] 3.6 Day/night/wet/dirty as toggles. (#78)
- [x] 3.7 Side / front / rear views + SVG hotspots. (#79)

## Wave 4 — board honesty

- [x] 4.1 Public standing = sum of approved intents. (#80)
- [x] 4.2 Shortfall ticker. (#81)
- [x] 4.3 Vault marks at $58,000 and $120,000. (#82)
- [x] 4.4 Wreck / refund FAQ. (#83)
- [x] 4.5 Whole-truck $120,000 intent. (#84)
- [x] 4.6 Category exclusivity copy on the seat. (#85)

## Wave 5 — accounts

- [x] 5.1 Auth.js email magic link. (#86)
- [x] 5.2 /account shows my intents only. (#87)
- [x] 5.3 Waitlist email can become an account. (#88)
- [x] 5.4 Partner shop view read-only. (#89)

## Wave 6 — harden

- [x] 6.1–6.15 Complete through Vercel main-only deploys. (#90–#105)

## Wave 7 — code hygiene (Vercel hold: git + tests only)

- [x] 7.1 Split `src/app/page.tsx` into section components. Visible strings stay in PUBLIC_COPY / `@/lib/public-copy`. Do not change H1, lead, money numbers, or add a homepage section. Playwright: H1 from 0.9, `Notify me`, no lease, no personal handle. (#106)
- [x] 7.2 `/api/plaque`, `/api/sighting`, `/api/event-request`, `/api/circuit-story` return 404 while `TRUCK_EXISTS` is false. Playwright covers 404. (#107)
- [x] 7.3 `/api/test/*` returns 404 when `VERCEL_ENV=production` or `NODE_ENV=production`. Test-mode still works in CI. (#108)
- [x] 7.4 Delete or Postgres-back leftover memory stores (plaque, sighting, circuit, content-rights). Production has no in-memory store. Same rule as 6.7. (#109)
- [x] 7.5 `/operator/waitlist` lists `waitlist_signups`. Auth + `OPERATOR_EMAILS`. No public header link. No export to X. (#110)
- [x] 7.6 Waitlist Resend path in code: notify `hello@` on insert. Tests mock Resend. Do not send live mail from the agent. Failure does not claim the visitor joined if the row write failed. (#111)
- [x] 7.7 Magic-link From is `BrandMyBeast <hello@brandmybeast.com>` in auth config. Playwright or unit assert on the from string. (#112)
- [x] 7.8 `/robots.txt` + `/sitemap.ts` include `/` and `/panels/*` only. `/operator` is not listed. (#113)
- [x] 7.9 `/privacy` and `/terms` stubs from CAMPAIGN.md + PUBLIC_COPY.md only. No invented legal terms. Footer links them. (#114)
- [x] 7.10 `layout.tsx` title and description match PUBLIC_COPY meta. Do not use the live tab as a gate. (#115)

## Wave 8 — operator day

- [x] 8.1 Intent status emails: listed / outbid / approved / rejected+note. Tests mock Resend. (#116)
- [x] 8.2 Operator digest function + cron *route* in repo. Do not register a Vercel cron until the hold lifts. (#117)
- [x] 8.3 Operator filters: pending / approved / rejected / outbid. (#118)
- [x] 8.4 Operator CSV of waitlist + standing intents. Auth-gated. (#119)
- [x] 8.5 Artwork in Blob storage (or equivalent), not a data-URL column in Postgres. (#120)
- [x] 8.6 Shop PDF builder for an approved seat (panel, brand, wrap vs etch, art). No Imagine API call. (#121)
- [x] 8.7 Partner shop: approved seats + art only. Still no public header link. (#122)
- [ ] 8.8 Operator ban-list table + hard-reject matching intents.
- [ ] 8.9 Audit log rows on approve / reject (who, when, note id).
- [ ] 8.10 Boot assert: `AUTH_ENABLE_TEST_LOGIN` cannot be on when `VERCEL_ENV=production`.

## Wave 9 — auction mechanics, no capture

- [ ] 9.1 Proxy max on an intent. Agent steps `$250` or `10%`. Still no card.
- [ ] 9.2 Seat shows next minimum from standing + increment.
- [ ] 9.3 `panelExtendedUntil` field + PUBLIC_COPY-safe copy. Do not set `CLOSE_AT`.
- [ ] 9.4 Floor-save intent row: if short of $58,000, raise this seat to Y. Stored, not charged.
- [ ] 9.5 Hide whole-truck control when pledged >= $120,000. Unit + Playwright lock.
- [ ] 9.6 Failed-winner offer at last mark + one increment. No silent reopen.
- [ ] 9.7 Withdraw intent while pending only. Approved needs operator.
- [ ] 9.8 Edit brand / trade / art while pending only.
- [ ] 9.9 Public seat log: amount + time. No bidder email.
- [ ] 9.10 Playwright: pledged dollars = sum of approved standing only.

## Wave 10 — compositor people will trust

- [ ] 10.1 Hero / hotspot links go to `/panels/[id]`, not only `#panels`.
- [ ] 10.2 Seat compositor renders the standing brand, not only a typed preview.
- [ ] 10.3 Etch toggle disabled unless pledged >= $120,000. Playwright on the seat.
- [ ] 10.4 Mockup queue row. No billable Imagine call.
- [ ] 10.5 Wrap vs etch labels from PUBLIC_COPY only. No “permanent vinyl.”
- [ ] 10.6 Export one PNG per seat (auth-gated server route).
- [ ] 10.7 Mobile compositor: one view at a time. Playwright 390px, wordmark not clipped.
- [ ] 10.8 Every truck `<img>` alt comes from PUBLIC_COPY.
- [ ] 10.9 Panel cards show standing brand or “Open.”
- [ ] 10.10 Neighbor combo is display only. Test there is no invented combo price.

## Wave 11 — harden in repo

- [ ] 11.1 CSP / security headers in `next.config`.
- [ ] 11.2 Rate-limit magic-link POST.
- [ ] 11.3 verify-brandmybeast feature map covers Waves 7–10.
- [ ] 11.4 Playwright: 50 unique waitlist inserts in memory mode, no 500s.
- [ ] 11.5 Operator status panel: DB ping + waitlist count. No public URL.
- [ ] 11.6 Neon PITR runbook markdown in repo. No dashboard clicks.
- [ ] 11.7 a11y: reject-note required announced; waitlist errors linked to the field.
- [ ] 11.8 Pre-P3 checklist component on `/operator` (LLC, terms, Resend, Stripe not wired). Checkboxes do not set CLOSE_AT.
- [ ] 11.9 `vercel.json` stays main-only. Do not add preview deploys or extra projects.
- [ ] 11.10 BLOCKED until the human clears the Vercel usage hold. Slice is a repo note only: “redeploy when the hold lifts.” No app change. No Stripe. No CLOSE_AT.

## Wave 12 — money-ready without charging

Do not start Wave 12 until 11.10 is checked. Still no Stripe. Still no CLOSE_AT.

### Ledger / races

- [ ] 12.1 Place + outbid + approve in one DB transaction. No double standing on a panel.
- [ ] 12.2 Optimistic lock on `intent_bids.updatedAt`. Second writer gets a typed error.
- [ ] 12.3 Unique partial index: one `approved` row per `panelId`.
- [ ] 12.4 Idempotency key on intent POST. Replay does not double-list.
- [ ] 12.5 `depositUsd` always `round(standing * 0.20)` in one helper. Playwright lock.
- [ ] 12.6 Reject standing that is not an integer dollar.
- [ ] 12.7 Normalize trade strings (trim, collapse space, casefold) before exclusivity check.
- [ ] 12.8 Intent revision table: brand/trade/amount/art changes with timestamps.
- [ ] 12.9 Soft-delete withdrawn rows. Never hard-delete an approved bid.
- [ ] 12.10 Seed script: 12 open panels, zero standing. CI only.

### Mail / identity

- [ ] 12.11 Email templates as files under `src/emails/`. No inline HTML in actions.
- [ ] 12.12 Dead-letter table for failed Resend sends. Operator can retry.
- [ ] 12.13 Unsubscribe + physical address line on every mail (CAN-SPAM stub).
- [ ] 12.14 Waitlist double-opt-in token. List stays “intent to be notified.”
- [ ] 12.15 Account export JSON (my intents + waitlist row). Auth-gated.
- [ ] 12.16 Account delete: anonymize user id on bids, keep public standing amounts.
- [ ] 12.17 Sign-in page copy from PUBLIC_COPY. No “test login” string in live mode.
- [ ] 12.18 Session max-age documented + idle timeout copy on `/account`.
- [ ] 12.19 Magic-link consumed-once test.
- [ ] 12.20 From/reply-to both `hello@brandmybeast.com`. Unit assert.

### Winner + shop, still no VIN

- [ ] 12.21 `/account/wins` lists only *approved* standing seats for that user.
- [ ] 12.22 Winner packet markdown: panel, brand, wrap vs etch, 12-month term.
- [ ] 12.23 Shop cut-file checklist (vector, bleed, etch 1-color) as a form, not a card on `/`.
- [ ] 12.24 Partner can mark art `shop-ready` / `needs-fix`. Bidder sees it on `/account`.
- [ ] 12.25 Contract markdown template from CAMPAIGN wreck rules. Not a signature product.
- [ ] 12.26 Deposit preview on the seat: “20% of this mark is $X. Not charged.”
- [ ] 12.27 Opening-bid rationale one-liner on the seat from RULES.md only.
- [ ] 12.28 Operator cannot approve etch finish while pledged < $120,000.
- [ ] 12.29 Whole-truck intent cannot stack on a panel that already has approved standing.
- [ ] 12.30 Ban-list match is logged with the rule id (ties to 8.8).

### Public surface

- [ ] 12.31 JSON-LD `Organization` + `Offer` on `/` from PUBLIC_COPY. No impression claims.
- [ ] 12.32 Canonical URL `https://brandmybeast.com`.
- [ ] 12.33 Print stylesheet for `/panels/[id]` (shop packet).
- [ ] 12.34 Error boundary + branded 500 that is not a panel.
- [ ] 12.35 Strip `console.log` from `src/` except test helpers.
- [ ] 12.36 `globals.css` split: tokens / hero / board. No copy change.
- [ ] 12.37 Prefetch `/panels/*` from homepage cards.
- [ ] 12.38 Focus restore after waitlist submit.
- [ ] 12.39 `/signin/check-email` uses PUBLIC_COPY success line.
- [ ] 12.40 Remove dead vapor components from the production bundle if `TRUCK_EXISTS` is false (tree-shake or do not import).

### Ops

- [ ] 12.41 Structured log line on waitlist insert + intent status change. No PII beyond email hash.
- [ ] 12.42 `/operator/health` already in 11.5 — add last-migration name from Drizzle.
- [ ] 12.43 Drizzle migrate runbook in repo (`drizzle/` + command). No dashboard.
- [ ] 12.44 Backup restore drill doc (Neon PITR) next to 11.6.
- [ ] 12.45 Playwright: concurrent two bidders on hood, only one approved standing.
- [ ] 12.46 Playwright: reject without note fails; with note succeeds.
- [ ] 12.47 Verify-skill map for Wave 12.
- [ ] 12.48 `package.json` license + engines. No new runtime.
- [ ] 12.49 SECURITY.md: report to `hello@`. No personal inbox.
- [ ] 12.50 Pre-P3 freeze tag `intent-complete`. Does not set `CLOSE_AT`. Does not add Stripe.

## After Wave 12

Idle on polish / a11y / verify-skill. Do not open Wave 13 from FEATURES.md.
P3 (Stripe, clock, terms signed, first tweet) waits for the human.
