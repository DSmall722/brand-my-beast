# Playwright offline (memory mode) — BrandMyBeast

Slice **13.46**. How to run the suite **without Neon, Resend, or a live
deploy**. Uses in-memory waitlist + intent ledgers. Live URL is not a gate
while the Vercel usage hold is on (`docs/VERCEL-HOLD.md`).

Money fences (do not invent a third number):

- Floor **$58,000** — order + wrap reserve. Miss = refund.
- Buyout **$120,000** — etch unlock. `CLOSE_AT` stays null until P3.
- No Stripe. No card capture. No lease. No personal operator Gmail.

## What “offline / memory mode” means

| Concern | Offline value | Notes |
|---|---|---|
| Waitlist store | `WAITLIST_MODE=memory` | Process-global; never set in Production |
| Intent ledger | `INTENT_MODE=memory` | Same; Production ignores memory even if mis-set |
| Auth | `AUTH_MODE=test` | Credentials login; password `test` |
| Database | unset `DATABASE_URL` | No Neon required |
| Mail | unset `RESEND_API_KEY` | Digests / magic links skip or use test doubles |
| Cron | `CRON_SECRET=playwright-cron-secret` | Set by `playwright.config.ts` for CI routes |

`playwright.config.ts` already injects these into the `webServer` env when you
run `npm test`. You do **not** need a `.env.local` for the default suite.

## Run (laptop, no network to Neon / Vercel)

```bash
npm ci
npx playwright install chromium   # once per machine
npm test                          # starts next dev + runs tests/
```

Target one file:

```bash
npx playwright test tests/slice-13-46-playwright-offline.spec.ts
```

Reuse an already-running app (local only; CI always starts fresh):

```bash
# terminal A
WAITLIST_MODE=memory INTENT_MODE=memory AUTH_MODE=test \
  AUTH_SECRET=playwright-auth-secret-min-32-chars!! \
  AUTH_TEST_PASSWORD=test \
  npm run dev

# terminal B
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm test
```

## CI shape (GitHub Actions)

`.github/workflows/playwright.yml` runs `npm test` with
`WAITLIST_MODE=memory`, `INTENT_MODE=memory`, `AUTH_MODE=test`. That is the
merge gate. Do not require `brandmybeast.com` while the hold is on.

Workers: CI forces **one** worker (`playwright.config.ts`) because the memory
ledger is process-global. Locally, parallel workers are allowed when `CI` is
unset — still prefer serial for intent-heavy suites if you see flake.

## Stop rules

- Do not set `CLOSE_AT`.
- Do not add `stripe` to `package.json`.
- Do not flip `vercel.json` `git.deploymentEnabled` from this runbook.
- Do not point Playwright at Production credentials or a personal Gmail.
- Do not treat a green local run as a live-site proof while the hold remains.

## Related

- `playwright.config.ts` — webServer env for memory / test auth
- `.env.example` — commented `WAITLIST_MODE` / `INTENT_MODE` notes
- `docs/VERCEL-HOLD.md` — why live URL is not the gate
- SLICES merge gate: `npm test` + `npm run build`
