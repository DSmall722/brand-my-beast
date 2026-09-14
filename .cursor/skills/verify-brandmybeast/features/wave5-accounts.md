# Wave 5 — accounts

Maps SLICES **5.1–5.4**. Public brand strings only.

## Slices

| Slice | Proof |
|---|---|
| 5.1 Auth.js magic link in Production; test login CI-only | `tests/auth.spec.ts`; `AUTH_MODE=test` credentials |
| 5.2 `/account` shows my intents only | intent-store `listBidsForUser` + account UI |
| 5.3 Waitlist email → account keeps the row | `tests/waitlist-account.spec.ts` |
| 5.4 Partner shop read-only; no header link on public `/` | intent-ui wrap-shop + campaign “no shop-nav” |

## Money fences

- Account / partner HTML keep `$58,000` / `$120,000` and no lease / no `CLOSE_AT`.
- Partner sheet has no approve/reject/payment controls.

## Live lever

`tests/auth.spec.ts`, `tests/waitlist-account.spec.ts`, `tests/intent-ui.spec.ts`
partner/account cases.
