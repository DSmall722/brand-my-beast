# Deposit checkout

The 20% deposit is charged when a bid is placed. A bid is standing only after `depositPaidAt` is set. The client never sets that field. The Stripe webhook does, unless prior paid deposits on the same seat already cover the new 20%.

## Window

- Open: Tuesday, October 6, 2026, 12:00 PM America/New_York (`OPEN_AT` = `2026-10-06T16:00:00.000Z`).
- Close: Monday, November 2, 2026, 12:00 PM America/New_York (`CLOSE_AT` = `2026-11-02T17:00:00.000Z`).
- A bid in the last 10 minutes pushes the campaign close back 10 minutes. Each bid extends the close at most once.

`LIVE_BIDDING` must be `true` or `1` before `POST /api/bid` accepts a bid inside that window. Leave it unset on production until a human flips it.

`PREVIEW_BIDDING_OPEN=true` opens the desk on a Vercel preview before October 6 so a test card can run. Production ignores that variable.

## Env vars

| Name | Preview | Production |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Leave unset until live mode. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from the preview endpoint | Leave unset until live mode. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Leave unset until live mode. |
| `LIVE_BIDDING` | `true` | Unset. Bidding stays closed. |
| `PREVIEW_BIDDING_OPEN` | `true` until the real window should govern the preview, then remove it | Do not set. Ignored anyway. |

Never commit these values. `.env` stays local.

## Webhook

Production URL: `https://www.brandmybeast.com/api/stripe/webhook`

Preview URL: the Vercel preview host plus `/api/stripe/webhook`.

Enable these events on that endpoint:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

The handler verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`. A repeated event id is stored in `stripe_events` and does not capture twice. A failed apply is not claimed, so Stripe can retry it.

Playwright sends `x-bmb-stripe-mock` equal to `CRON_SECRET` only when no `STRIPE_SECRET_KEY` is set and `AUTH_MODE=test`. That path is off in production.

## Migration

Apply `drizzle/0021_deposit_capture.sql` on Neon before a preview charge. It adds `deposit_paid_at`, `stripe_payment_id`, `refund_status`, captured and credit amounts, the checkout session id, remainder timestamps, and the `stripe_events` table. Memory mode used by Playwright needs no migration. See `docs/DRIZZLE-MIGRATE.md`.

## Settlement

After the effective close, losing deposits are refunded. The winner's deposit is credited to the invoice. The next bidder's deposit is held. If the winner does not pay the remainder within 7 days, the deposit is forfeited and that next bidder is promoted. Deeper ranks are refunded at close. A third bidder whose deposit was already refunded is not charged again.

The Terms page is unchanged. It already says a deposit applies to the balance and is kept if the remainder is not paid as required, and that the seat passes to the next bidder. It does not name 7 days. The FAQ now describes the charged deposit, the refund, and the 7-day forfeit. That FAQ change is the copy flag.

`RULES.md` still describes a 5-minute per-panel extension. This build uses a 10-minute campaign extension. `CAMPAIGN.md` records the 10-minute rule.

## Preview branch key

`vercel.json` sets `cursor/stripe-deposit-window-2a1b` to true so this branch can deploy. `"*": false` and `"main": true` stay. Strip the branch key before merge.
