# Wave 8 — operator day

Maps SLICES **8.1–8.10**. Operator tooling for intents and waitlist — still no
card capture, no `CLOSE_AT`.

## Slices

| Slice | Proof |
|---|---|
| 8.1 Intent status emails via mocked Resend | `tests/slice-8-1-intent-status-emails.spec.ts` |
| 8.2 Operator digest + cron route | `tests/slice-8-2-operator-digest.spec.ts` |
| 8.3 Operator status filters | `tests/slice-8-3-operator-filters.spec.ts` |
| 8.4 Operator CSV of waitlist + standing intents | `tests/slice-8-4-operator-csv.spec.ts` |
| 8.5 Artwork blob storage (no data-URL column) | `tests/slice-8-5-artwork-blob.spec.ts` |
| 8.6 Shop PDF builder for approved seats | `tests/slice-8-6-shop-pdf.spec.ts` |
| 8.7 Partner shop approved seats + art only | `tests/slice-8-7-partner-shop-art.spec.ts` |
| 8.8 Operator ban-list + hard-reject matches | `tests/slice-8-8-operator-ban-list.spec.ts` |
| 8.9 Audit log on approve / reject | `tests/slice-8-9-audit-log.spec.ts` |
| 8.10 Boot assert blocks test-login in Production | `tests/slice-8-10-boot-assert.spec.ts` |

## Money fences

- Operator / partner HTML keep `$58,000` / `$120,000` and no lease / no `CLOSE_AT`.
- CSV / PDF / emails never emit personal operator Gmail or personal handle.

## Live lever

Playwright suites named above (`tests/slice-8-*.spec.ts`).
