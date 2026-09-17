# Wave 13 — docs freeze + auction correctness

Maps SLICES **13.1–13.50**. Docs freeze and auction correctness only — do not
set `CLOSE_AT`, do not wire Stripe, leave `vercel.json` hold-mode alone.

## Slices

| Slice | Proof |
|---|---|
| 13.1 PROCESS.md SLICES + live site not a gate | `tests/slice-13-1-process-md.spec.ts` |
| 13.2 ARCHITECTURE.md stack without Stripe box | `tests/slice-13-2-architecture.spec.ts` |
| 13.3 CAMPAIGN.md links CONTRACT.md for wreck | `tests/slice-13-3-campaign-contract.spec.ts` |
| 13.4 RULES.md failed-winner + one approved | `tests/slice-13-4-rules-md.spec.ts` |
| 13.5 PUBLIC_COPY seat pack (no H1 rewrite) | `tests/slice-13-5-public-copy-seat.spec.ts` |
| 13.6 FEATURES.md not the build order | `tests/slice-13-6-features-banner.spec.ts` |
| 13.7 P3-DAY runbook (no CLOSE_AT) | `tests/slice-13-7-p3-day.spec.ts` |
| 13.8 WRAP-SHOP shortlist template | `tests/slice-13-8-wrap-shop.spec.ts` |
| 13.9 EMAIL-DNS checklist | `tests/slice-13-9-email-dns.spec.ts` |
| 13.10 CHANGELOG last 20 slice ids | `tests/slice-13-10-changelog.spec.ts` |
| 13.11 failed-winner timeout | `tests/slice-13-11-failed-winner-timeout.spec.ts` |
| 13.12 proxy max hard cap | `tests/slice-13-12-proxy-max-cap.spec.ts` |
| 13.13 floor-save fire gate | `tests/slice-13-13-floor-save-fire.spec.ts` |
| 13.14 withdraw leaves no ghost standing | `tests/slice-13-14-withdraw-ghost.spec.ts` |
| 13.15 edit-pending increments revisions | `tests/slice-13-15-edit-pending-revision.spec.ts` |
| 13.16 ban-list re-runs pending | `tests/slice-13-16-ban-list-rerun.spec.ts` |
| 13.17 whole-truck reject rolls back twelve | `tests/slice-13-17-whole-truck-reject.spec.ts` |
| 13.18 outbid email includes next minimum | `tests/slice-13-18-outbid-next-min.spec.ts` |
| 13.19 concurrent brand approve race | `tests/slice-13-19-approve-race.spec.ts` |
| 13.20 failed-winner accept leaves old winner outbid | `tests/slice-13-20-failed-winner-outbid.spec.ts` |
| 13.21 shop PDF etch-lock from pledged | `tests/slice-13-21-shop-pdf-etch-lock.spec.ts` |
| 13.22 shop-ready vector or blob key | `tests/slice-13-22-shop-ready-vector.spec.ts` |
| 13.23 winner packet wrap term start | `tests/slice-13-23-winner-wrap-term.spec.ts` |
| 13.24 partner no bidder email | `tests/slice-13-24-partner-no-email.spec.ts` |
| 13.25 operator print seat view | `tests/slice-13-25-operator-print.spec.ts` |
| 13.26 RULES.md art size cap | `tests/slice-13-26-art-size-cap.spec.ts` |
| 13.27 etch linter reject; wrap still lists | `tests/slice-13-27-etch-linter-reject.spec.ts` |
| 13.28 wins empty state from PUBLIC_COPY | `tests/slice-13-28-wins-empty.spec.ts` |
| 13.29 vault certificate markdown template | `tests/slice-13-29-cert-template.spec.ts` |
| 13.30 cabin plaque off auth nav while truck missing | `tests/slice-13-30-cabin-plaque-nav.spec.ts` |
| 13.31 waitlist domain blocklist | `tests/slice-13-31-waitlist-domain-block.spec.ts` |
| 13.32 all-panels standing needs whole-truck | `tests/slice-13-32-all-panels-standing.spec.ts` |
| 13.33 rate-limit operator approve/reject | `tests/slice-13-33-operator-rate-limit.spec.ts` |
| 13.34 magic-link request hashed email log | `tests/slice-13-34-magic-link-hash-log.spec.ts` |
| 13.35 CSP form-action + Resend callback host | `tests/slice-13-35-csp-form-action.spec.ts` |
| 13.36 download routes operator or owner | `tests/slice-13-36-download-auth.spec.ts` |
| 13.37 robots.txt excludes account signin operator | `tests/slice-13-37-robots-exclusions.spec.ts` |
| 13.38 terms stub intent is not a charge | `tests/slice-13-38-terms-intent.spec.ts` |
| 13.39 privacy waitlist retention | `tests/slice-13-39-privacy-retention.spec.ts` |
| 13.40 no personal Gmail in src + md | `tests/slice-13-40-no-personal-gmail.spec.ts` |
| 13.41 prove-all includes 9.6–9.10 and 12.45–12.46 | `tests/slice-13-41-prove-all.spec.ts` |
| 13.42 CI fails if package.json gains stripe | `tests/slice-13-42-no-stripe.spec.ts` |
| 13.43 CI fails if CLOSE_AT is non-null | `tests/slice-13-43-close-at-null.spec.ts` |
| 13.44 Drizzle journal checked in | `tests/slice-13-44-drizzle-journal.spec.ts` |
| 13.45 operator health waitlist pending digest | `tests/slice-13-45-operator-health.spec.ts` |
| 13.46 Playwright offline memory-mode docs | `tests/slice-13-46-playwright-offline.spec.ts` |
| 13.47 Verify-skill map Waves 9–13 | `tests/slice-13-47-verify-map.spec.ts` |
| 13.48 Tag `wave-12-complete` after 12.50 | `tests/slice-13-48-wave-12-complete.spec.ts` + `docs/WAVE-12-COMPLETE.md` |
| 13.49 11.10 human redeploy-when-hold-lifts note | `tests/slice-13-49-vercel-hold-redeploy.spec.ts` + `docs/VERCEL-HOLD.md` |
| 13.50 Stop line: Wave 15 needs human | `SLICES.md` standing orders |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- Floor **$58,000**. Buyout **$120,000**. No third number.
- No lease. No personal Gmail / personal handle.

## Live lever

Playwright suites named above (`tests/slice-13-*.spec.ts`) plus this map’s
gate `tests/slice-13-47-verify-map.spec.ts`. Offline memory-mode runbook:
`docs/PLAYWRIGHT-OFFLINE.md` (slice 13.46).
