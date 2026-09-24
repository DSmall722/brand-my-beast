# Waitlist signup

Users leave an email so BrandMyBeast can notify them when soft auction seats open. No card charge on P1.

## Sub-features

- `waitlist-create` accepts a new email and reports created.
- `waitlist-exists` reports an email already on the list.
- `waitlist-ui` updates `waitlist-status` after submit.
- `waitlist-next` offers browse-panels and stay-on-the-list after join (no sign-in-to-list-intent CTA — slice 16.0g).

## How to get to it (user POV)

- Open `/#contactus`. Old `/#waitlist` links still land on this section.
- Enter an email and choose `Join waitlist`.

## Driving it with Playwright

Preconditions:

- App healthy with `WAITLIST_MODE=memory`.
- Email is unique for create, or known for exists.

- **Create via API.** `POST /api/waitlist` with `{ "email": "<unique>@example.com" }`. Expect status `201` and `{ ok: true, status: "created" }`.
- **Exists via API.** Repeat the same POST. Expect status `200` and `{ ok: true, status: "exists" }`.
- **UI exists path.** Fill `waitlist-email`, click `waitlist-submit`. Expect `waitlist-status` to contain `already on the list`.
- **Next-step CTA.** Expect `waitlist-next` visible with `waitlist-browse-panels` → `/#panels` and stay-on-the-list copy. `waitlist-signin-intent` must be absent (16.0g). Copy must mention cards are not charged yet.
- **Proof.** Save response JSON under `artifacts/<run-id>/waitlist.json` and screenshot `waitlist.png`.

Or run:

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-waitlist-signup.sh
```

## Gotchas

- Without `WAITLIST_MODE=memory` and without `DATABASE_URL`, production-shaped runs return unavailable. Local proof must set memory mode.
- Resend is optional. Missing `RESEND_API_KEY` must not fail signup in memory mode.
- Do not use personal operator inboxes as fixtures.
