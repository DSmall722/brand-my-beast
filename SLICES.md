# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-15

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. After Wave 13, idle. Do not open Wave 14 from FEATURES.md.
- A FEATURES.md row is not scheduled until it has a checkbox in this file.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a gate while the Vercel usage hold is on.

**Now:** 10.1 Hero / hotspot links go to `/panels/[id]`, not only `#panels`.
**Last merged:** 9.10 (#135 Playwright: pledged dollars = sum of approved standing only).

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

- [x] 0.1 Hide every empty P3–P5 homepage section behind truckExists === false.
- [x] 0.2 Same hide on /account and /partner empty boards. (#53)
- [x] 0.3 Homepage copy audit. (#54)
- [x] 0.4 Playwright waitlist contract. (#55)
- [x] 0.5 prove-all.sh covers 0.1–0.4. (#56)
- [x] 0.6 GitHub Actions: Playwright on every PR. (#57)
- [x] 0.7 Hero truck preview (layout A). (#58)
- [x] 0.8 Ship PUBLIC_COPY.md onto `/`. (#62)
- [x] 0.9 Ship locked copy v2. H1 `Put your brand on the truck people already photograph.` (#95)

## Wave 1 — durable intent

- [x] 1.1–1.8 Complete. (#59–#67)

## Wave 2 — operator

- [x] 2.1–2.5 Complete. (#68–#72)

## Wave 3 — mockup and art

- [x] 3.1–3.7 Complete. (#73–#79)

## Wave 4 — board honesty

- [x] 4.1–4.6 Complete. (#80–#85)

## Wave 5 — accounts

- [x] 5.1–5.4 Complete. (#86–#89)

## Wave 6 — harden

- [x] 6.1–6.15 Complete through Vercel main-only deploys. (#90–#105)

## Wave 7 — code hygiene

- [x] 7.1–7.10 Complete. (#106–#115)

## Wave 8 — operator day

- [x] 8.1–8.10 Complete. (#116–#125)

## Wave 9 — auction mechanics, no capture

- [x] 9.1 Proxy max on an intent. (#126)
- [x] 9.2 Seat shows next minimum. (#127)
- [x] 9.3 `panelExtendedUntil` field. Do not set `CLOSE_AT`. (#128)
- [x] 9.4 Floor-save intent row. (#129)
- [x] 9.5 Hide whole-truck control when pledged >= $120,000. (#130)
- [x] 9.6 Failed-winner offer at last mark + one increment. No silent reopen. (#131)
- [x] 9.7 Withdraw intent while pending only. Approved needs operator. (#132)
- [x] 9.8 Edit brand / trade / art while pending only. (#133)
- [x] 9.9 Public seat log: amount + time. No bidder email. (#134)
- [x] 9.10 Playwright: pledged dollars = sum of approved standing only. (#135)

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
- [ ] 11.10 BLOCKED until the human clears the Vercel usage hold. Repo note only: “redeploy when the hold lifts.” No app change. No Stripe. No CLOSE_AT.

## Wave 12 — money-ready without charging

Do not start Wave 12 until 11.10 is checked or skipped by the human. Still no Stripe. Still no CLOSE_AT.

- [ ] 12.1 Place + outbid + approve in one DB transaction. No double standing on a panel.
- [ ] 12.2 Optimistic lock on `intent_bids.updatedAt`. Second writer gets a typed error.
- [ ] 12.3 Unique partial index: one `approved` row per `panelId`.
- [ ] 12.4 Idempotency key on intent POST. Replay does not double-list.
- [ ] 12.5 `depositUsd` always `round(standing * 0.20)` in one helper. Playwright lock.
- [ ] 12.6 Reject standing that is not an integer dollar.
- [ ] 12.7 Normalize trade strings before exclusivity check.
- [ ] 12.8 Intent revision table: brand/trade/amount/art changes with timestamps.
- [ ] 12.9 Soft-delete withdrawn rows. Never hard-delete an approved bid.
- [ ] 12.10 Seed script: 12 open panels, zero standing. CI only.
- [ ] 12.11 Email templates as files under `src/emails/`.
- [ ] 12.12 Dead-letter table for failed Resend sends. Operator can retry.
- [ ] 12.13 Unsubscribe + physical address line on every mail (CAN-SPAM stub).
- [ ] 12.14 Waitlist double-opt-in token.
- [ ] 12.15 Account export JSON. Auth-gated.
- [ ] 12.16 Account delete: anonymize user id on bids, keep public standing amounts.
- [ ] 12.17 Sign-in page copy from PUBLIC_COPY. No “test login” string in live mode.
- [ ] 12.18 Session max-age documented + idle timeout copy on `/account`.
- [ ] 12.19 Magic-link consumed-once test.
- [ ] 12.20 From/reply-to both `hello@brandmybeast.com`. Unit assert.
- [ ] 12.21 `/account/wins` lists only approved standing seats for that user.
- [ ] 12.22 Winner packet markdown: panel, brand, wrap vs etch, 12-month term.
- [ ] 12.23 Shop cut-file checklist as a form, not a card on `/`.
- [ ] 12.24 Partner can mark art `shop-ready` / `needs-fix`.
- [ ] 12.25 Contract markdown template from CAMPAIGN wreck rules. Not a signature product.
- [ ] 12.26 Deposit preview on the seat: “20% of this mark is $X. Not charged.”
- [ ] 12.27 Opening-bid rationale one-liner on the seat from RULES.md only.
- [ ] 12.28 Operator cannot approve etch finish while pledged < $120,000.
- [ ] 12.29 Whole-truck intent cannot stack on a panel that already has approved standing.
- [ ] 12.30 Ban-list match is logged with the rule id (ties to 8.8).
- [ ] 12.31 JSON-LD Organization + Offer on `/` from PUBLIC_COPY. No impression claims.
- [ ] 12.32 Canonical URL `https://brandmybeast.com`.
- [ ] 12.33 Print stylesheet for `/panels/[id]`.
- [ ] 12.34 Error boundary + branded 500 that is not a panel.
- [ ] 12.35 Strip `console.log` from `src/` except test helpers.
- [ ] 12.36 `globals.css` split: tokens / hero / board. No copy change.
- [ ] 12.37 Prefetch `/panels/*` from homepage cards.
- [ ] 12.38 Focus restore after waitlist submit.
- [ ] 12.39 `/signin/check-email` uses PUBLIC_COPY success line.
- [ ] 12.40 Remove dead vapor component imports when `TRUCK_EXISTS` is false.
- [ ] 12.41 Structured log line on waitlist insert + intent status change. No PII beyond email hash.
- [ ] 12.42 `/operator/health` last-migration name from Drizzle.
- [ ] 12.43 Drizzle migrate runbook in repo.
- [ ] 12.44 Backup restore drill doc (Neon PITR) next to 11.6.
- [ ] 12.45 Playwright: concurrent two bidders on hood, only one approved standing.
- [ ] 12.46 Playwright: reject without note fails; with note succeeds.
- [ ] 12.47 Verify-skill map for Wave 12.
- [ ] 12.48 `package.json` license + engines. No new runtime.
- [ ] 12.49 SECURITY.md: report to `hello@`. No personal inbox.
- [ ] 12.50 Pre-P3 freeze tag `intent-complete`. Does not set CLOSE_AT. Does not add Stripe.

## Wave 13 — docs freeze + auction correctness

Human-approved 2026-09-15. Do not start Wave 13 until 12.50 is checked. Do not skip 9.6–12.49 to jump here. No Stripe. No CLOSE_AT. No tweet. No live URL gate.

### Docs / legal freeze

- [ ] 13.1 PROCESS.md: coordinator reads SLICES Waves 7–13; live site is not a gate while the Vercel hold is on.
- [ ] 13.2 ARCHITECTURE.md: Postgres + Blob + Resend mock; no Stripe box.
- [ ] 13.3 CAMPAIGN.md links `CONTRACT.md` for wreck text. Money table stays $58,000 / $120,000.
- [ ] 13.4 RULES.md adds failed-winner + one-approved-per-panel (mirrors 9.6 / 12.3).
- [ ] 13.5 PUBLIC_COPY seat pack: withdraw, failed-winner, deposit preview. Do not rewrite the homepage H1.
- [ ] 13.6 FEATURES.md banner: “not the build order.”
- [ ] 13.7 `docs/P3-DAY.md` runbook: LLC, terms, Stripe keys later, tweet later. Checkboxes only. Does not set CLOSE_AT.
- [ ] 13.8 `docs/WRAP-SHOP.md` shortlist template. No shop named as contracted until the human picks one.
- [ ] 13.9 `docs/EMAIL-DNS.md` SPF/DKIM/DMARC checklist for hello@.
- [ ] 13.10 Changelog file of last 20 merged slice ids. No marketing copy.

### Auction correctness

- [ ] 13.11 Failed-winner timeout: offer expires; next compliant mark; no silent reopen.
- [ ] 13.12 Proxy max cannot exceed a hard cap published in CAMPAIGN.md in that same PR.
- [ ] 13.13 Floor-save cannot fire if pledged already >= $58,000.
- [ ] 13.14 Withdraw of the only pending mark does not leave a ghost standing.
- [ ] 13.15 Edit-while-pending increments the revision table (12.8).
- [ ] 13.16 Ban-list change re-runs pending intents; approved seats stay.
- [ ] 13.17 Whole-truck reject rolls back all twelve rows in one transaction.
- [ ] 13.18 Outbid email includes next minimum (9.2).
- [ ] 13.19 Operator cannot approve two brands on one panel even if they race.
- [ ] 13.20 Playwright: failed-winner accepts → old winner is `outbid`, not deleted.

### Shop / winner

- [ ] 13.21 Shop PDF embeds etch-lock state from pledged vs $120,000.
- [ ] 13.22 `shop-ready` requires vector URL or Blob key, not a screenshot only.
- [ ] 13.23 Winner packet includes wrap term start = install day, not close.
- [ ] 13.24 Partner cannot see bidder email — only brand + trade + art.
- [ ] 13.25 Operator print view for one seat (13.23 + 8.6).
- [ ] 13.26 Art size cap documented (max bytes in RULES.md).
- [ ] 13.27 Etch art rejected if linter fails; wrap art may still list.
- [ ] 13.28 `/account/wins` empty state from PUBLIC_COPY.
- [ ] 13.29 Certificate template exists as markdown only. No issued date until etch exists.
- [ ] 13.30 Remove Cabin plaque form from any authenticated nav while `TRUCK_EXISTS` is false.

### Trust / abuse

- [ ] 13.31 Waitlist email domain blocklist (disposable) — operator editable.
- [ ] 13.32 Same user cannot hold standing on all 12 panels unless whole-truck path.
- [ ] 13.33 Rate-limit operator approve/reject.
- [ ] 13.34 Magic-link request logs hashed email only (ties 12.41).
- [ ] 13.35 CSP `form-action` self + Resend callback host (builds on 11.1).
- [ ] 13.36 Download routes (CSV, PDF, PNG) require operator or owner. Playwright 401/403.
- [ ] 13.37 `robots.txt` still excludes `/account`, `/signin`, `/operator`.
- [ ] 13.38 Terms stub adds “intent is not a charge.”
- [ ] 13.39 Privacy stub adds waitlist retention: until seats open or user deletes.
- [ ] 13.40 No personal Gmail in `git grep` of `src/` + `*.md`.

### Ops freeze

- [ ] 13.41 `prove-all.sh` includes 9.6–9.10 and 12.45–12.46.
- [ ] 13.42 CI fails if `package.json` gains `stripe`.
- [ ] 13.43 CI fails if `CLOSE_AT` is non-null.
- [ ] 13.44 Drizzle journal checked in. No “push from laptop” as the only path.
- [ ] 13.45 Operator health shows waitlist count + pending count + last digest time.
- [ ] 13.46 Document how to run Playwright offline (memory mode).
- [ ] 13.47 Verify-skill map Waves 9–13.
- [ ] 13.48 Tag `wave-12-complete` after 12.50. Still no clock.
- [ ] 13.49 Slice 11.10 remains human: one-line runbook “redeploy when Vercel hold lifts.”
- [ ] 13.50 Stop line in SLICES: “Wave 14 is Stripe and needs a human message.”

## After Wave 13

Idle on polish / a11y / verify-skill. Do not open Wave 14 from FEATURES.md.
Wave 14 is Stripe / CLOSE_AT / first tweet and waits for an explicit human message.
