# Wave 12 — money-ready without charging

Maps SLICES **12.1–12.50**. Intent ledger + operator/docs hardening before
P3. No Stripe. No `CLOSE_AT`. No personal identity strings.

## Slices

| Slice | Proof |
|---|---|
| 12.1 Intent place/approve in one transaction | `tests/slice-12-1-intent-transaction.spec.ts` |
| 12.2 Optimistic lock on intent writes | `tests/slice-12-2-optimistic-lock.spec.ts` |
| 12.3 Unique approved standing per panel | `tests/slice-12-3-unique-approved.spec.ts` |
| 12.4 Idempotency key on place | `tests/slice-12-4-idempotency-key.spec.ts` |
| 12.5 Deposit helper (20% display) | `tests/slice-12-5-deposit-helper.spec.ts` |
| 12.6 Integer standing dollars only | `tests/slice-12-6-integer-standing.spec.ts` |
| 12.7 Normalize trade label | `tests/slice-12-7-normalize-trade.spec.ts` |
| 12.8 Intent revision history | `tests/slice-12-8-intent-revision.spec.ts` |
| 12.9 Soft-delete withdrawn rows | `tests/slice-12-9-soft-delete.spec.ts` |
| 12.10 Seed open seats helper | `tests/slice-12-10-seed-open.spec.ts` |
| 12.11 Email templates (Resend mock) | `tests/slice-12-11-email-templates.spec.ts` |
| 12.12 Mail dead-letter + operator retry | `tests/slice-12-12-mail-dead-letter.spec.ts` |
| 12.13 CAN-SPAM footer strings | `tests/slice-12-13-can-spam.spec.ts` |
| 12.14 Waitlist double opt-in | `tests/slice-12-14-waitlist-doi.spec.ts` |
| 12.15 Account export | `tests/slice-12-15-account-export.spec.ts` |
| 12.16 Account delete anonymize | `tests/slice-12-16-account-delete.spec.ts` |
| 12.17 Sign-in copy from PUBLIC_COPY | `tests/slice-12-17-signin-copy.spec.ts` |
| 12.18 Session max-age | `tests/slice-12-18-session-max-age.spec.ts` |
| 12.19 Magic link one-time use | `tests/slice-12-19-magic-link-once.spec.ts` |
| 12.20 From / Reply-To envelopes | `tests/slice-12-20-from-reply-to.spec.ts` |
| 12.21 Account wins board | `tests/slice-12-21-account-wins.spec.ts` |
| 12.22 Winner packet | `tests/slice-12-22-winner-packet.spec.ts` |
| 12.23 Cut-file checklist | `tests/slice-12-23-cut-file-checklist.spec.ts` |
| 12.24 Shop art status | `tests/slice-12-24-shop-art-status.spec.ts` |
| 12.25 CONTRACT.md wreck text | `tests/slice-12-25-contract-md.spec.ts` |
| 12.26 Deposit preview | `tests/slice-12-26-deposit-preview.spec.ts` |
| 12.27 Opening-bid rationale | `tests/slice-12-27-opening-rationale.spec.ts` |
| 12.28 Etch approve locked under buyout | `tests/slice-12-28-etch-approve-lock.spec.ts` |
| 12.29 Whole-truck cannot stack on approved | `tests/slice-12-29-whole-truck-stack.spec.ts` |
| 12.30 Ban-list match logged with rule id | `tests/slice-12-30-ban-list-log.spec.ts` |
| 12.31 JSON-LD Organization + Offer | `tests/slice-12-31-json-ld.spec.ts` |
| 12.32 Canonical URL brandmybeast.com | `tests/slice-12-32-canonical-url.spec.ts` |
| 12.33 Print stylesheet for panels | `tests/slice-12-33-print-stylesheet.spec.ts` |
| 12.34 Branded error boundary / 500 | `tests/slice-12-34-branded-500.spec.ts` |
| 12.35 No `console.log` in `src/` (except tests) | `tests/slice-12-35-no-console-log.spec.ts` |
| 12.36 globals.css tokens / hero / board | `tests/slice-12-36-globals-css-split.spec.ts` |
| 12.37 Prefetch `/panels/*` from home | `tests/slice-12-37-prefetch-panels.spec.ts` |
| 12.38 Waitlist focus restore | `tests/slice-12-38-waitlist-focus.spec.ts` |
| 12.39 Check-email PUBLIC_COPY success | `tests/slice-12-39-check-email-copy.spec.ts` |
| 12.40 Vapor imports gated on TRUCK_EXISTS | `tests/slice-12-40-vapor-imports.spec.ts` |
| 12.41 Structured waitlist + intent logs | `tests/slice-12-41-structured-log.spec.ts` |
| 12.42 `/operator/health` last Drizzle migration | `tests/slice-12-42-operator-health.spec.ts` |
| 12.43 Drizzle migrate runbook | `tests/slice-12-43-drizzle-migrate-runbook.spec.ts` |
| 12.44 Neon PITR restore drill | `tests/slice-12-44-neon-pitr-drill.spec.ts` |
| 12.45 Concurrent hood → one approved | `tests/slice-12-45-concurrent-hood.spec.ts` |
| 12.46 Reject without note fails | `tests/slice-12-46-reject-note.spec.ts` |
| 12.47 This verify-skill map | `tests/slice-12-47-verify-map.spec.ts` |
| 12.48 `package.json` license + engines | SLICES 12.48 (pending) |
| 12.49 SECURITY.md → `hello@` | SLICES 12.49 (pending) |
| 12.50 Pre-P3 freeze tag `intent-complete` | SLICES 12.50 (pending) — does not set CLOSE_AT / Stripe |

## Money fences

- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- No lease copy. No personal gmail / personal handle.
- Deposit **20%** is display math only until Stripe exists.

## Live lever

Playwright suites named above (`tests/slice-12-*.spec.ts`). Docs runbooks under
`docs/DRIZZLE-MIGRATE.md` and `docs/NEON-PITR-DRILL.md`.
