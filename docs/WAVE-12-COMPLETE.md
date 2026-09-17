# Wave-12-complete tag — BrandMyBeast

Slice **13.48**. Annotated git tag marking that Wave 12 is complete on `main`
(after **12.50** / `intent-complete`). Still no clock.

## Git tag

After this slice merges to `main`, the annotated tag is:

```text
wave-12-complete
```

Create / refresh (human or post-merge agent on `main` only):

```bash
git checkout main
git pull origin main
git tag -a wave-12-complete -m "slice(13.48): Wave 12 complete — CLOSE_AT null, no Stripe, no clock"
git push origin wave-12-complete
```

Do **not** retarget the tag onto a branch that sets `CLOSE_AT` or adds Stripe.
Do **not** treat this tag as starting the 30-day clock.

## What this tag means

- Wave 12 money-ready work is complete through **12.50** (`intent-complete`).
- This tag (`wave-12-complete`) is the Wave 13 bookmark that Wave 12 is done.
- Floor **$58,000** and buyout **$120,000** stay locked in `src/lib/campaign.ts`.
- `CLOSE_AT` remains **null**. This tag does **not** start the 30-day clock.
- No Stripe dependency or SetupIntent. Charging is Wave 15 and needs a human message.
- No lease product. No cheaper trim.
- Public mail stays **hello@brandmybeast.com**.
- `vercel.json` hold-mode (`deploymentEnabled: false`) stays until a human lifts it.

## What this tag is not

- Not a campaign close date
- Not permission to tweet from @BrandMyBeast
- Not a Vercel cutover or nameserver move
- Not an etch unlock (still requires pledged ≥ $120,000)
- Not Wave 15 / Stripe / `CLOSE_AT`

## Related

- `docs/INTENT-COMPLETE.md` — slice **12.50** freeze for the money-ready stack
- **SLICES.md** — only build order; continue Wave 13 then Wave 14.1+

## Next

Follow **SLICES.md**. Do not invent Wave 15. Do not set `CLOSE_AT`.
