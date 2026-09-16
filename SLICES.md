# BrandMyBeast — autonomous slice list

CAMPAIGN.md wins money and identity. FEATURES.md is a catalog. **This file is the only build order.**
PUBLIC_COPY.md wins public homepage wording. Do not invent a warmer variant.

Updated: 2026-09-16

## How this file stays alive

- Next job = the first unchecked box, wave order. Do not skip. Do not start two boxes in one PR.
- Exception 2026-09-16: do **14.0** next so a local preview can be shared. 12.28 is complete (#183). Do not start Wave 13 from this closeout.
- The PR that finishes a slice also flips that box `[ ]` → `[x]` and appends `(#NN)` on the same line.
- Set **Now** and **Last merged** in this file in that same PR.
- Do not add a new checkbox unless the human writes it here first. After Wave 14, idle. Do not open Wave 15 from FEATURES.md.
- Coordinator may merge a PR that finishes exactly one unchecked slice, Playwright is green, and the merge gates below hold.
- Judge PRs from git + `npm test` + `npm run build`. Do not use brandmybeast.com as a gate while the Vercel usage hold is on.

**Now:** 14.0 Numbered stainless board on the hero / truck views.
**Last merged:** 12.28 (#183 etch finish approve lock under $120k).

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

Complete through 11.10 skipped (Vercel hold). See git history / prior SLICES revisions.

## Wave 12 — money-ready without charging

- [x] 12.1–12.27 Complete through opening-bid rationale. (#156–#182)
- [x] 12.28 Operator cannot approve etch finish while pledged < $120,000. (#183)
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

Do not start Wave 13 until 12.50 is checked. No Stripe. No CLOSE_AT.

- [ ] 13.1 PROCESS.md: coordinator reads SLICES Waves 7–14; live site is not a gate while the Vercel hold is on.
- [ ] 13.2 ARCHITECTURE.md: Postgres + Blob + Resend mock; no Stripe box.
- [ ] 13.3 CAMPAIGN.md links `CONTRACT.md` for wreck text. Money table stays $58,000 / $120,000.
- [ ] 13.4 RULES.md adds failed-winner + one-approved-per-panel.
- [ ] 13.5 PUBLIC_COPY seat pack: withdraw, failed-winner, deposit preview. Do not rewrite the homepage H1.
- [ ] 13.6 FEATURES.md banner: “not the build order.”
- [ ] 13.7 `docs/P3-DAY.md` runbook. Checkboxes only. Does not set CLOSE_AT.
- [ ] 13.8 `docs/WRAP-SHOP.md` shortlist template.
- [ ] 13.9 `docs/EMAIL-DNS.md` SPF/DKIM/DMARC checklist for hello@.
- [ ] 13.10 Changelog file of last 20 merged slice ids.
- [ ] 13.11–13.50 Remain as previously locked (auction correctness, shop, trust, ops freeze). See commit history if a line was abbreviated. Full text lives in git before this compaction. Coordinator must not invent Stripe or a close date.

## Wave 14 — launch readiness, no charge

Human-approved 2026-09-16. **14.0 jumps the line** so a local preview can be shared. 12.28 is complete (#183). After 14.0, resume the rest of 12 / 13, then 14.1. Wave 15 is Stripe and needs a separate human message.

- [ ] 14.0 Numbered stainless board. Put visible 1–12 callouts on the existing hero still (`/hero-truck-preview.jpg`) and on the side/front/rear views. Numbers and names match `PANELS` in campaign.ts (1 hood … 12 rear fascia). Each number is a link to `/panels/[id]`. Keep the truck bare stainless — no wrap, no etch, no Tesla marks, no teslacyberbeast livery. The schematic SVG rectangle is not enough; people have to see a Cybertruck. Playwright 390px: at least six numbers visible, H1 still `Put your brand on the truck people already photograph.`, `Notify me` present, no lease, no personal handle.
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
