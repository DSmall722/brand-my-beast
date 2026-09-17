# Wave 15 stop — BrandMyBeast

Slice **13.50** (Wave 13 stop). Slice **14.50** (Wave 14 stop — restates after
launch readiness). Explicit stop line: **Wave 15 is Stripe / CLOSE_AT / first
tweet and needs a human message.**

## Stop line (copy into every agent brief)

> Wave 15 is Stripe and needs a human message.
> Do not start Wave 15. Do not wire Stripe. Do not set `CLOSE_AT`.
> Do not tweet from @BrandMyBeast. Do not capture cards.

## What Wave 15 is (human only)

- Stripe keys, SetupIntent, charging anyone
- Setting `CLOSE_AT` / starting the 30-day clock
- First campaign tweet from @BrandMyBeast
- Live card capture

Agents **must not** open Wave 15 checkboxes, add a `stripe` dependency, or set
`CLOSE_AT` in `src/lib/campaign.ts`.

## What continues after 14.50

Per **SLICES.md** exception order:

1. Wave 13 stop was **13.50** (this file).
2. Wave 14 launch readiness finished through **14.50** (this restatement).
3. Continue Wave **16** (shareable board + freeze polish).
4. Wave **15** waits for an explicit human message — forever, until that message.

## Money fences (unchanged)

- Floor **$58,000**
- Buyout **$120,000**
- `CLOSE_AT` = **null**
- No lease. No cheaper trim.
- Public mail: **hello@brandmybeast.com**

## Related

- `SLICES.md` — Human-only list + Wave 15 stop section
- `docs/WAVE-12-COMPLETE.md` — Wave 12 bookmark (still no clock)
- `docs/WAVE-13-COMPLETE.md` — Wave 13 bookmark (still no clock)
- `docs/VERCEL-HOLD.md` — redeploy when hold lifts (human)

No Stripe. No `CLOSE_AT`. Leave `vercel.json` hold-mode alone.
