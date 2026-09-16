# Intent-complete freeze — BrandMyBeast

Slice **12.50**. Pre-P3 freeze marker for the money-ready (no charge) stack.

## Git tag

After this slice merges to `main`, the annotated tag is:

```text
intent-complete
```

Create / refresh (human or post-merge agent on `main` only):

```bash
git checkout main
git pull origin main
git tag -a intent-complete -m "slice(12.50): Wave 12 money-ready freeze — CLOSE_AT null, no Stripe"
git push origin intent-complete
```

Do **not** retarget the tag onto a branch that sets `CLOSE_AT` or adds Stripe.

## What this freeze means

- Wave 12 money-ready work is complete through 12.50.
- Floor **$58,000** and buyout **$120,000** stay locked in `src/lib/campaign.ts`.
- `CLOSE_AT` remains **null**. This tag does **not** start the 30-day clock.
- No Stripe dependency or SetupIntent. Charging is Wave 15 and needs a human message.
- No lease product. No cheaper trim.
- Public mail stays **hello@brandmybeast.com**.

## What this freeze is not

- Not a campaign close date
- Not permission to tweet from @BrandMyBeast
- Not a Vercel cutover or nameserver move
- Not an etch unlock (still requires pledged ≥ $120,000)

## Next

Wave 13 starts only after SLICES checks 12.50. Follow SLICES.md; do not invent Wave 15.
