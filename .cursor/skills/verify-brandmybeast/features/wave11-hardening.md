# Wave 11 — hardening before money path

Maps SLICES **11.1–11.10**. Docs / rate limits / hold notes only — do not set
`CLOSE_AT`, do not wire Stripe, do not clear the Vercel usage hold from an agent.

## Slices

| Slice | Proof |
|---|---|
| 11.1 CSP / security headers | `tests/slice-11-1-csp-headers.spec.ts` |
| 11.2 Rate-limit magic-link POST | `tests/slice-11-2-magic-link-rate-limit.spec.ts` |
| 11.3 Verify-map Waves 7–10 | `tests/slice-11-3-verify-map.spec.ts` |
| 11.4 Waitlist burst (50 unique inserts, memory) | `tests/slice-11-4-waitlist-burst.spec.ts` |
| 11.5 Operator status panel | `tests/slice-11-5-operator-status.spec.ts` |
| 11.6 Neon PITR runbook | `tests/slice-11-6-neon-pitr-runbook.spec.ts` |
| 11.7 A11y reject-note + waitlist field errors | `tests/slice-11-7-a11y-reject-waitlist.spec.ts` |
| 11.8 Pre-P3 checklist on /operator | `tests/slice-11-8-pre-p3-checklist.spec.ts` |
| 11.9 vercel.json main-only / hold-mode shape | `tests/slice-11-9-vercel-main-only.spec.ts` |
| 11.10 Vercel hold redeploy note | `tests/slice-11-10-vercel-hold-note.spec.ts` |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- No lease. No personal Gmail / personal handle.

## Live lever

Playwright suites named above (`tests/slice-11-*.spec.ts`).
