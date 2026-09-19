# Wave 16 — numbered board, docs, freeze

Maps SLICES **16.0a–16.0g** and **16.1–16.50**. Shareable numbered board and
docs freeze only — do not set `CLOSE_AT`, do not wire Stripe, do not flip
`SEATS_OPEN`. Wave 15 waits for a human message (`docs/WAVE-15-STOP.md`).

## Slices

| Slice | Title | Proof |
|---|---|---|
| 16.0a | Hide whole-truck sign-in from the money section | `tests/slice-16-0a-hide-whole-truck-signin.spec.ts` |
| 16.0b | PUBLIC_COPY waitlist checkbox strings | `tests/slice-16-0b-waitlist-checkbox-copy.spec.ts` |
| 16.0c | waitlist_signups.want_whole_truck boolean | `tests/slice-16-0c-want-whole-truck-schema.spec.ts` |
| 16.0d | POST /api/waitlist accepts wantWholeTruck | `tests/slice-16-0d-waitlist-want-whole-truck-api.spec.ts` |
| 16.0e | WaitlistForm checkbox still 201 | `tests/slice-16-0e-waitlist-form-checkbox.spec.ts` |
| 16.0f | Operator waitlist Whole-truck column | `tests/slice-16-0f-operator-waitlist-whole-truck.spec.ts` |
| 16.0g | Drop waitlist-signin-intent line | `tests/slice-16-0g-drop-waitlist-signin-intent.spec.ts` |
| 16.1 | Homepage panel cards show 1–12 | `tests/slice-16-1-panel-card-indexes.spec.ts` |
| 16.2 | Seat page H1 includes the number | `tests/slice-16-2-seat-h1-number.spec.ts` |
| 16.3 | Number map legend under the hero | `tests/slice-16-3-number-map-legend.spec.ts` |
| 16.4 | Playwright 390px: numbers 1, 3, 5, 9 not clipped | `tests/slice-16-4-callout-wordmark.spec.ts` |
| 16.5 | Playwright 1280px: all twelve numbers in the DOM | `tests/slice-16-5-twelve-numbers-dom.spec.ts` |
| 16.6 | Front / side / rear views share the hero index | `tests/slice-16-6-shared-view-index.spec.ts` |
| 16.7 | Occupied seats keep the number and add Held | `tests/slice-16-7-held-keeps-number.spec.ts` |
| 16.8 | docs/LOCAL-PREVIEW.md npm run dev | `tests/slice-16-8-local-preview.spec.ts` |
| 16.9 | Hero still 1280-wide and 640-wide; no Tesla CDN | `tests/slice-16-9-hero-assets.spec.ts` |
| 16.10 | Callout hit area ≥44px; focus ring visible | `tests/slice-16-10-callout-hit.spec.ts` |
| 16.11 | README how to look points at 16.8 | `tests/slice-16-11-readme-look.spec.ts` |
| 16.12 | PUBLIC_COPY panel lead matches card numbers | `tests/slice-16-12-panel-lead.spec.ts` |
| 16.13 | RULES.md lists 1–12 next to panel ids | `tests/slice-16-13-rules-panel-ids.spec.ts` |
| 16.14 | CAMPAIGN.md inventory number column | `tests/slice-16-14-campaign-number-column.spec.ts` |
| 16.15 | FEATURES.md numbered board row shipped | `tests/slice-16-15-features-numbered-board.spec.ts` |
| 16.16 | docs/STATUS.md last-slice follows SLICES Now | `tests/slice-16-16-status-now.spec.ts` |
| 16.17 | PROCESS.md has no Wave 6 idle sentence | `tests/slice-16-17-process-wave-6-idle.spec.ts` |
| 16.18 | ARCHITECTURE.md numbered overlay | `tests/slice-16-18-architecture-overlay.spec.ts` |
| 16.19 | Press-kit fact sheet includes 1–12 | `tests/slice-16-19-press-kit-list.spec.ts` |
| 16.20 | /llms.txt floor, buyout, twelve numbered seats | `tests/slice-16-20-llms-numbered-seats.spec.ts` |
| 16.21 | Seat log shows panel number + amount + ET | `tests/slice-16-21-seat-log-number.spec.ts` |
| 16.22 | Operator list columns include panel number | `tests/slice-16-22-operator-list-columns.spec.ts` |
| 16.23 | CSV export includes panel number | `tests/slice-16-23-operator-csv-panel-number.spec.ts` |
| 16.24 | Shop PDF title is Seat 03 — Driver door | `tests/slice-16-24-shop-pdf-title.spec.ts` |
| 16.25 | Whole-truck intent copy lists 1–12 | `tests/slice-16-25-whole-truck-package.spec.ts` |
| 16.26 | Failed-winner email subject includes panel number | `tests/slice-16-26-failed-winner-subject.spec.ts` |
| 16.27 | Ban-list UI shows blocked panel numbers | `tests/slice-16-27-ban-list-panels.spec.ts` |
| 16.28 | Card #3 and hero callout 3 go to driver-door | `tests/slice-16-28-card-callout-nav.spec.ts` |
| 16.29 | Opening prices stay formatUsd | `tests/slice-16-29-card-opening-prices.spec.ts` |
| 16.30 | Etch badge still Can etch at $120k | `tests/slice-16-30-etch-badge-copy.spec.ts` |
| 16.31 | preview:share prints local URL, not the live domain | `tests/slice-16-31-preview-share.spec.ts` |
| 16.32 | OG image for / includes wordmark + stainless still | `tests/slice-16-32-home-og-still.spec.ts` |
| 16.33 | OG image for /panels/[id] includes number + name | `tests/slice-16-33-panel-og-number.spec.ts` |
| 16.34 | robots.txt comment while Vercel hold is on | `tests/slice-16-34-robots-comment.spec.ts` |
| 16.35 | Health panel shows SEATS_OPEN or unset | `tests/slice-16-35-health-seats-open.spec.ts` |
| 16.36 | Screenshot fixtures 390 and 1280 under tests/fixtures/board/ | `tests/slice-16-36-hero-fixtures.spec.ts` |
| 16.37 | Visual diff fails only if numbers disappear | `tests/slice-16-37-number-visual-diff.spec.ts` |
| 16.38 | Reduce-motion: callouts stay visible | `tests/slice-16-38-reduce-motion.spec.ts` |
| 16.39 | Number badge vs stainless meets 4.5:1 | `tests/slice-16-39-callout-contrast.spec.ts` |
| 16.40 | No personal Gmail regression grep (ties 14.44) | `tests/slice-16-40-identity-grep.spec.ts` |
| 16.41 | Verify-skill map Wave 16 | `tests/slice-16-41-verify-map.spec.ts` |
| 16.42 | prove-all.sh includes 16.4, 16.5, 16.28 | `tests/slice-16-42-prove-all.spec.ts` |
| 16.43 | Tag wave-14-complete after 14.50. No clock. | `tests/slice-16-43-wave-14-complete.spec.ts` |
| 16.44 | Tag wave-16-complete after 16.43. No clock. | `tests/slice-16-44-wave-16-complete.spec.ts` |
| 16.45 | CI still fails on stripe in package.json | `tests/slice-16-45-stripe-package-grep.spec.ts` |
| 16.46 | CI still fails if CLOSE_AT is non-null | `tests/slice-16-46-close-at-null.spec.ts` |
| 16.47 | docs/VERCEL-HOLD.md date bump only | `tests/slice-16-47-vercel-hold.spec.ts` |
| 16.48 | Local seed includes numbered standing on seat 1 and 9 | `tests/slice-16-48-demo-seed-numbers.spec.ts` |
| 16.49 | Counsel ZIP lists seats by number | `tests/slice-16-49-counsel-zip-numbers.spec.ts` |
| 16.50 | Stop line: after Wave 16, idle. Wave 15 needs a human message | `tests/slice-16-50-wave-16-stop.spec.ts` |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- Floor **$58,000**. Buyout **$120,000**. No third number.
- No lease. No personal Gmail / personal handle.

## Live lever

Playwright suites named above (`tests/slice-16-*.spec.ts`) plus this map’s
gate `tests/slice-16-41-verify-map.spec.ts`.
