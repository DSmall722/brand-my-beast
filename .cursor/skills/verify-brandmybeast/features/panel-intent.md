# Panel intent (P2 soft auction)

Prove the intent-only panel surface and its handoff from waitlist/auth.
Still no Stripe capture and no close clock.

## Preconditions

- App healthy at `$BMB_VERIFY_URL`.
- Launch with `WAITLIST_MODE=memory`, `INTENT_MODE=memory`, `AUTH_MODE=test`,
  `AUTH_SECRET` (≥32 chars), `AUTH_TEST_PASSWORD=test`.
- Prefer `.cursor/skills/verify-brandmybeast/scripts/launch.sh`.

## Recipe

1. Open `/panels/hood`.
2. Assert `panel-intent-page`, `panel-mockup`, `seat-lead` (Current Bid), and
   `public-seat-waitlist-cta` (`Get on the list`). No `Intent only` banner.
3. HTML must not match word-boundary `lease` and must not contain `CLOSE_AT`.
4. Sign in via `/signin` with `intent-prove@example.com` / `test`.
5. Return to `/panels/hood`, list brand `Prove Co`, assert `intent-success`
   contains `not charged` and `intent-list` contains `Prove Co`.
6. Sign in as `operator@example.com`, open `/operator/approvals`, approve the
   listed intent, assert `approvals-empty`.
7. Reset intents. List as user A, outbid as user B, assert user A sees
   `failed-winner-waitlist` on the panel and an account outbid→waitlist CTA.

## Evidence

- Screenshot of anonymous panel intent page
- Screenshot after listing intent
- Screenshot of failed-winner waitlist handoff
- Assertion log under `artifacts/<run-id>/panel-intent-assert.txt`

## Fail if

- Etch unlock or capture copy appears
- Close clock / `CLOSE_AT` appears
- Lease language appears
- Approve path charges or skips operator gate
