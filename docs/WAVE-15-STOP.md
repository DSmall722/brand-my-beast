# Wave 15 stop — BrandMyBeast

Slice **13.50**. Explicit stop line: **Wave 15 is Stripe and needs a human message.**

## Stop line (copy into every agent brief)

> Wave 15 is Stripe and needs a human message.
> Do not start Wave 15. Do not wire Stripe. Do not set `CLOSE_AT`.

## What Wave 15 is (human only)

- Stripe keys, SetupIntent, charging anyone
- Setting `CLOSE_AT` / starting the 30-day clock
- First campaign tweet from @BrandMyBeast
- Live card capture

Agents **must not** open Wave 15 checkboxes, add a `stripe` dependency, or set
`CLOSE_AT` in `src/lib/campaign.ts`.

## What continues after 13.50

Per **SLICES.md** exception order:

1. Finish Wave 13 (this slice).
2. Do **14.1–14.50** (launch readiness, no charge).
3. Then Wave **16** (after 14.50).
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
- `docs/VERCEL-HOLD.md` — redeploy when hold lifts (human)

No Stripe. No `CLOSE_AT`. Leave `vercel.json` hold-mode alone.
