# Wave 14 — launch readiness, no charge

Maps SLICES **14.0–14.50**. Launch readiness only — do not set `CLOSE_AT`,
do not wire Stripe, leave `vercel.json` hold-mode alone. Wave 15 waits for a
human message (`docs/WAVE-15-STOP.md`).

## Slices

| Slice | Title | Proof |
|---|---|---|
| 14.0 | Numbered stainless board | `tests/slice-14-0-numbered-stainless-board.spec.ts` |
| 14.1 | FEATURES.md shipped rows + Catalog P3/P5 | `tests/slice-14-1-features-shipped.spec.ts` |
| 14.2 | ARCHITECTURE.md stack; Stripe not wired | `tests/slice-14-2-architecture-stripe.spec.ts` |
| 14.3 | PROCESS.md Now = first unchecked; live URL not a gate | `tests/slice-14-3-process-now.spec.ts` |
| 14.4 | README one-pager | `tests/slice-14-4-readme-one-pager.spec.ts` |
| 14.5 | CAMPAIGN.md stack sentence matches ARCHITECTURE | `tests/slice-14-5-campaign-stack.spec.ts` |
| 14.6 | RULES.md status table | `tests/slice-14-6-rules-statuses.spec.ts` |
| 14.7 | PUBLIC_COPY seat rationale only | `tests/slice-14-7-public-copy-seat.spec.ts` |
| 14.8 | Delete FEATURES rows that contradict CAMPAIGN | `tests/slice-14-8-features-contradict.spec.ts` |
| 14.9 | docs/STATUS.md floor / buyout / CLOSE_AT null | `tests/slice-14-9-status-md.spec.ts` |
| 14.10 | Kill leftover chat-ops lines in .md (history note only) | `tests/slice-14-10-*.spec.ts` |
| 14.11 | TRUCK_EXISTS=false import gate | `tests/slice-14-11-truck-exists-imports.spec.ts` |
| 14.12 | /account nav hides Cabin plaque | `tests/slice-14-12-account-plaque-nav.spec.ts` |
| 14.13 | /partner has no mileage / heatmap cards | `tests/slice-14-13-partner-no-mileage.spec.ts` |
| 14.14 | Homepage bans Season 2 / Clemson / 48-state | `tests/slice-14-14-homepage-banned-phrases.spec.ts` |
| 14.15 | Drop unused card components | `tests/slice-14-15-drop-unused-cards.spec.ts` |
| 14.16 | Per-panel Open Graph title | `tests/slice-14-16-panel-og-title.spec.ts` |
| 14.17 | SEATS_OPEN=false flag (separate from CLOSE_AT) | `tests/slice-14-17-seats-open.spec.ts` |
| 14.18 | Operator SEATS_OPEN toggle does not set a date | `tests/slice-14-18-operator-seats-open.spec.ts` |
| 14.19 | Seats-open email template (do not send) | `tests/slice-14-19-seats-open-email.spec.ts` |
| 14.20 | Press kit folder | `tests/slice-14-20-press-kit.spec.ts` |
| 14.21 | /llms.txt PUBLIC_COPY facts only | `tests/slice-14-21-llms-txt.spec.ts` |
| 14.22 | Sitemap lastmod from git time | `tests/slice-14-22-sitemap-lastmod.spec.ts` |
| 14.23 | Favicon 32/180 | `tests/slice-14-23-favicon-32-180.spec.ts` |
| 14.24 | 404 and 500 share footer strings | `tests/slice-14-24-error-footer-share.spec.ts` |
| 14.25 | Sign-out on /account uses PUBLIC_COPY | `tests/slice-14-25-account-signout.spec.ts` |
| 14.26 | Failed-winner offer cannot target banned trade | `tests/slice-14-26-failed-winner-ban.spec.ts` |
| 14.27 | Proxy max ignored after withdraw | `tests/slice-14-27-proxy-max-withdraw.spec.ts` |
| 14.28 | Floor-save does not raise a rejected mark | `tests/slice-14-28-floor-save-rejected.spec.ts` |
| 14.29 | Whole-truck pending blocks single-panel intents | `tests/slice-14-29-whole-truck-pending.spec.ts` |
| 14.30 | Operator note required on forced withdraw | `tests/slice-14-30-operator-force-withdraw-note.spec.ts` |
| 14.31 | Standing brand change after approve forbidden | `tests/slice-14-31-standing-brand-locked.spec.ts` |
| 14.32 | SEATS_OPEN=false → intent 403, waitlist 201 | `tests/slice-14-32-seats-open-false.spec.ts` |
| 14.33 | Deposit preview uses 12.5 helper | `tests/slice-14-33-deposit-preview-helper.spec.ts` |
| 14.34 | Next-minimum display integer dollars only | `tests/slice-14-34-next-min-integer.spec.ts` |
| 14.35 | Public log timestamps America/New_York ET | `tests/slice-14-35-public-log-et.spec.ts` |
| 14.36 | engines + license in package.json | `tests/slice-14-36-engines-license.spec.ts` |
| 14.37 | Pinned npm audit script | `tests/slice-14-37-npm-audit.spec.ts` |
| 14.38 | Human-sensitive doc for CAMPAIGN/SLICES/campaign.ts | `tests/slice-14-38-human-sensitive.spec.ts` + `docs/HUMAN-SENSITIVE.md` |
| 14.39 | Resend bounce webhook → dead-letter | `tests/slice-14-39-resend-bounce-webhook.spec.ts` |
| 14.40 | List-Unsubscribe header on waitlist mail | `tests/slice-14-40-list-unsubscribe.spec.ts` |
| 14.41 | Maintenance flag keeps / up, blocks intent | `tests/slice-14-41-maintenance-flag.spec.ts` |
| 14.42 | Counsel export ZIP; no emails in ZIP | `tests/slice-14-42-counsel-zip.spec.ts` |
| 14.43 | Playwright journey waitlist → wins | `tests/slice-14-43-journey-wins.spec.ts` |
| 14.44 | CI grep personal Gmail + personal handle | `tests/slice-14-44-personal-identity-grep.spec.ts` + `npm run grep:identity` |
| 14.45 | CI grep fail on stripe in package.json | `tests/slice-14-45-stripe-package-grep.spec.ts` + `npm run grep:stripe` |
| 14.46 | Verify-skill map Wave 14 | `tests/slice-14-46-verify-map.spec.ts` |
| 14.47 | Tag wave-13-complete after 13.50 | `tests/slice-14-47-wave-13-complete.spec.ts` + `docs/WAVE-13-COMPLETE.md` |
| 14.48 | Refresh docs/VERCEL-HOLD.md date only | `tests/slice-14-48-vercel-hold.spec.ts` + `docs/VERCEL-HOLD.md` |
| 14.49 | Local demo seed: 3 pending, 1 approved, 1 outbid | `tests/slice-14-49-demo-seed.spec.ts` |
| 14.50 | Stop line: Wave 15 needs human message | `tests/slice-14-50-wave-15-stop.spec.ts` + `docs/WAVE-15-STOP.md` |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- Floor **$58,000**. Buyout **$120,000**. No third number.
- No lease. No personal Gmail / personal handle.

## Live lever

Playwright suites named above (`tests/slice-14-*.spec.ts`) plus this map’s
gate `tests/slice-14-46-verify-map.spec.ts`. Offline memory-mode runbook:
`docs/PLAYWRIGHT-OFFLINE.md`.
