# Wave-16-complete tag — BrandMyBeast

Slice **16.44**. Annotated git tag after **16.43** (`wave-14-complete`).
Still no clock.

## Git tag

After this slice merges to `main`, the annotated tag is:

```text
wave-16-complete
```

Create / refresh (human or post-merge agent on `main` only), and only after
`wave-14-complete` from slice **16.43** exists:

```bash
git checkout main
git pull origin main
git tag -a wave-16-complete -m "slice(16.44): Wave 16 bookmark after 16.43 — CLOSE_AT null, no Stripe, no clock"
git push origin wave-16-complete
```

Do **not** retarget the tag onto a branch that sets `CLOSE_AT` or adds Stripe.
Do **not** treat this tag as starting the 30-day clock.
Do **not** tag from a stacked draft branch.
Do **not** start Wave 15.

## What this tag means

- This tag (`wave-16-complete`) follows **16.43** / `wave-14-complete`.
- Floor **$58,000** and buyout **$120,000** stay locked in `src/lib/campaign.ts`.
- `CLOSE_AT` remains **null**. This tag does **not** start the 30-day clock.
- No Stripe dependency or SetupIntent. Charging is Wave 15 and needs a human message.
- No lease product. No cheaper trim.
- Public mail stays **hello@brandmybeast.com**.
- `SEATS_OPEN` is not flipped by this tag.

## What this tag is not

- Not a campaign close date
- Not permission to tweet from @BrandMyBeast
- Not a Vercel cutover
- Not an etch unlock (still requires pledged ≥ $120,000)
- Not Wave 15 / Stripe / `CLOSE_AT`

## Related

- `docs/WAVE-14-COMPLETE.md` — slice **16.43** (`wave-14-complete`)
- `docs/WAVE-15-STOP.md` — Wave 15 needs a human message

## Next

Follow **SLICES.md**. Do not invent Wave 15. Do not set `CLOSE_AT`.
