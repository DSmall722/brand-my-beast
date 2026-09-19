# Wave-14-complete tag — BrandMyBeast

Slice **16.43**. Annotated git tag marking that Wave 14 is complete on `main`
(after **14.50**). Still no clock.

## Git tag

After this slice merges to `main`, the annotated tag is:

```text
wave-14-complete
```

Create / refresh (human or post-merge agent on `main` only):

```bash
git checkout main
git pull origin main
git tag -a wave-14-complete -m "slice(16.43): Wave 14 complete — CLOSE_AT null, no Stripe, no clock"
git push origin wave-14-complete
```

Do **not** retarget the tag onto a branch that sets `CLOSE_AT` or adds Stripe.
Do **not** treat this tag as starting the 30-day clock.
Do **not** tag from a stacked draft branch.

## What this tag means

- Wave 14 launch readiness is complete through **14.50**.
- This tag (`wave-14-complete`) is the bookmark that Wave 14 is done.
- Floor **$58,000** and buyout **$120,000** stay locked in `src/lib/campaign.ts`.
- `CLOSE_AT` remains **null**. This tag does **not** start the 30-day clock.
- No Stripe dependency or SetupIntent. Charging is Wave 15 and needs a human message.
- No lease product. No cheaper trim.
- Public mail stays **hello@brandmybeast.com**.
- `SEATS_OPEN` is not flipped by this tag.
- `vercel.json` hold-mode stays until a human lifts it.

## What this tag is not

- Not a campaign close date
- Not permission to tweet from @BrandMyBeast
- Not a Vercel cutover or nameserver move
- Not an etch unlock (still requires pledged ≥ $120,000)
- Not Wave 15 / Stripe / `CLOSE_AT`

## Related

- `docs/WAVE-15-STOP.md` — Wave 15 needs a human message
- `docs/WAVE-13-COMPLETE.md` — prior wave bookmark (`wave-13-complete`)
- **SLICES.md** — continue Wave 16. Skip Wave 15.

## Next

Follow **SLICES.md**. Do not invent Wave 15. Do not set `CLOSE_AT`.
