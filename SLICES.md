# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-16

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- Exception 2026-09-16: **14.0** done for local preview. Resume Wave 12 from 12.29, then 13, then 14.1. No Wave 15 without a human message.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#216)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. After Wave 14, idle. Do not open Wave 15 from FEATURES.md.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a gate while the Vercel usage hold is on.

**Now:** 13.14 Withdraw of the only pending mark does not leave a ghost standing.
**Last merged:** 13.13 (#NN floor-save fire gate at $58,000).

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

Do not start Wave 13 until 12.50 is checked. No Stripe. No CLOSE_AT.

- [x] 13.1 PROCESS.md: coordinator reads SLICES Waves 7–14; live site is not a gate while the Vercel hold is on. (#208)
- [x] 13.2 ARCHITECTURE.md: Postgres + Blob + Resend mock; no Stripe box. (#209)
- [x] 13.3 CAMPAIGN.md links `CONTRACT.md` for wreck text. Money table stays $58,000 / $120,000. (#210)
- [x] 13.4 RULES.md adds failed-winner + one-approved-per-panel. (#211)
- [x] 13.5 PUBLIC_COPY seat pack: withdraw, failed-winner, deposit preview. Do not rewrite the homepage H1. (#212)
- [x] 13.6 FEATURES.md banner: “not the build order.” (#213)
- [x] 13.7 `docs/P3-DAY.md` runbook. Checkboxes only. Does not set CLOSE_AT. (#214)
- [x] 13.8 `docs/WRAP-SHOP.md` shortlist template. (#215)
- [x] 13.9 `docs/EMAIL-DNS.md` SPF/DKIM/DMARC checklist for hello@. (#216)
- [x] 13.10 Changelog file of last 20 merged slice ids. (#217)
- [x] 13.11 Failed-winner timeout: offer expires; next compliant mark; no silent reopen. (#218)
- [x] 13.12 Proxy max cannot exceed a hard cap published in CAMPAIGN.md in that same PR. (#219)
- [x] 13.13 Floor-save cannot fire if pledged already >= $58,000. (#NN)
- [ ] 13.14 Withdraw of the only pending mark does not leave a ghost standing.
- [ ] 13.15 Edit-while-pending increments the revision table (12.8).
- [ ] 13.16 Ban-list change re-runs pending intents; approved seats stay.
- [ ] 13.17 Whole-truck reject rolls back all twelve rows in one transaction.
- [ ] 13.18 Outbid email includes next minimum (9.2).
- [ ] 13.19 Operator cannot approve two brands on one panel even if they race.
- [ ] 13.20 Playwright: failed-winner accepts → old winner is `outbid`, not deleted.
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
- [ ] 13.41 `prove-all.sh` includes 9.6–9.10 and 12.45–12.46.
- [ ] 13.42 CI fails if `package.json` gains `stripe`.
- [ ] 13.43 CI fails if `CLOSE_AT` is non-null.
- [ ] 13.44 Drizzle journal checked in. No “push from laptop” as the only path.
- [ ] 13.45 Operator health shows waitlist count + pending count + last digest time.
- [ ] 13.46 Document how to run Playwright offline (memory mode).
- [ ] 13.47 Verify-skill map Waves 9–13.
- [ ] 13.48 Tag `wave-12-complete` after 12.50. Still no clock.
- [ ] 13.49 Slice 11.10 remains human: one-line runbook “redeploy when Vercel hold lifts.”
- [ ] 13.50 Stop line in SLICES: “Wave 15 is Stripe and needs a human message.”

## Wave 14 — launch readiness, no charge

Human-approved 2026-09-16. **14.0** shipped for local preview (#185). Resume the rest of 12 / 13, then 14.1. Wave 15 is Stripe and needs a separate human message.

- [x] 14.0 Numbered stainless board. Put visible 1–12 callouts on the existing hero still (`/hero-truck-preview.jpg`) and on the side/front/rear views. Numbers and names match `PANELS` in campaign.ts (1 hood … 12 rear fascia). Each number is a link to `/panels/[id]`. Keep the truck bare stainless — no wrap, no etch, no Tesla marks, no teslacyberbeast livery. The schematic SVG rectangle is not enough; people have to see a Cybertruck. Playwright 390px: at least six numbers visible, H1 still `Put your brand on the truck people already photograph.`, `Notify me` present, no lease, no personal handle. (#185)
- [ ] 14.1 FEATURES.md: shipped rows marked shipped with slice id; P3/P5 stay Catalog.
- [ ] 14.2 ARCHITECTURE.md: Postgres + Blob + Resend mock. Stripe box = “not wired.”
- [ ] 14.3 PROCESS.md: Now = first unchecked SLICES box; live URL is not a gate.
- [ ] 14.4 README one-pager: what the repo is, what it is not.
- [ ] 14.5 CAMPAIGN.md current-stack sentence matches ARCHITECTURE. Numbers unchanged.
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

## After Wave 14

Idle on polish / a11y / verify-skill. Do not open Wave 15 from FEATURES.md.
Wave 15 is Stripe / CLOSE_AT / first tweet and waits for an explicit human message.
