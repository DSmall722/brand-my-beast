# Wave-13-complete tag — BrandMyBeast

Slice **14.47**. Annotated git tag marking that Wave 13 is complete on `main`
(after **13.50** / Wave 15 stop line). Still no clock.

## Git tag

After this slice merges to `main`, the annotated tag is:

```text
wave-13-complete
```

Create / refresh (human or post-merge agent on `main` only):

```bash
git checkout main
git pull origin main
git tag -a wave-13-complete -m "slice(14.47): Wave 13 complete — CLOSE_AT null, no Stripe, no clock"
git push origin wave-13-complete
```

Do **not** retarget the tag onto a branch that sets `CLOSE_AT` or adds Stripe.
Do **not** treat this tag as starting the 30-day clock.

## What this tag means

- Wave 13 docs freeze + auction correctness is complete through **13.50**.
- This tag (`wave-13-complete`) is the Wave 14 bookmark that Wave 13 is done.
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

- `docs/WAVE-15-STOP.md` — slice **13.50** stop line (Wave 15 needs a human)
- `docs/WAVE-12-COMPLETE.md` — prior wave bookmark (`wave-12-complete`)
- **SLICES.md** — only build order; continue Wave 14.48+ then Wave 16. Skip Wave 15.

## Next

Follow **SLICES.md**. Do not invent Wave 15. Do not set `CLOSE_AT`.
