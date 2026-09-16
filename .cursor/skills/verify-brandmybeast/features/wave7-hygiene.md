# Wave 7 — code hygiene

Maps SLICES **7.1–7.10**. Repo and public-surface hygiene only — no Stripe,
no `CLOSE_AT`, no personal identity strings.

## Slices

| Slice | Proof |
|---|---|
| 7.1 Split homepage into section components | `tests/slice-7-1-page-sections.spec.ts` |
| 7.2 Truck-gated public APIs return 404 while truck missing | `tests/slice-7-2-truck-gated-apis.spec.ts` |
| 7.3 Block `/api/test/*` in production | `tests/slice-7-3-test-api-prod.spec.ts` |
| 7.4 Ban leftover memory stores in Production | `tests/slice-7-4-no-memory-leftovers.spec.ts` |
| 7.5 Operator waitlist roster | `tests/slice-7-5-operator-waitlist.spec.ts` |
| 7.6 Waitlist Resend notifies `hello@brandmybeast.com` | `tests/slice-7-6-waitlist-resend.spec.ts` |
| 7.7 Magic-link From is BrandMyBeast `hello@brandmybeast.com` | `tests/slice-7-7-magic-link-from.spec.ts` |
| 7.8 `robots.txt` + sitemap public surface only | `tests/slice-7-8-robots-sitemap.spec.ts` |
| 7.9 Privacy and terms stubs | `tests/slice-7-9-privacy-terms.spec.ts` |
| 7.10 Layout meta matches PUBLIC_COPY | `tests/slice-7-10-layout-meta.spec.ts` |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- No lease copy. No personal gmail / personal handle.

## Live lever

Playwright suites named above (`tests/slice-7-*.spec.ts`).
