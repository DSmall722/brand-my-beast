# P3 day runbook — BrandMyBeast

Slice **13.7**. Checkboxes only. A human ticks these on P3 morning.

**This file does not set `CLOSE_AT`.** Do not invent a close date. Do not wire
Stripe from this checklist. Floor **$58,000**. Buyout **$120,000**. No lease.

## Before the clock (human)

- [ ] Read `CAMPAIGN.md` money table — still $58,000 / $120,000.
- [ ] Confirm `CLOSE_AT` is still null in `src/lib/campaign.ts` until a human sets it.
- [ ] Confirm `package.json` has no `stripe` until Wave 15 is human-approved.
- [ ] Confirm Vercel usage hold status (`docs/VERCEL-HOLD.md`) — live URL is not a gate while held.
- [ ] Confirm LLC / terms / wreck text ready (`CONTRACT.md`).
- [ ] Confirm operator inbox is **hello@brandmybeast.com** only.

## P3 morning (human only — do not automate)

- [ ] Human sets `CLOSE_AT` in code (separate decision — not this slice).
- [ ] Human opens Wave 15 / Stripe only after a separate human message.
- [ ] Redeploy `main` when the Vercel hold is lifted.
- [ ] Soft-close and panel rules stay as in `RULES.md`.
- [ ] No tweet from @BrandMyBeast until a human sends it.

## Stop rules

- [ ] Do not start the 30-day clock from an agent.
- [ ] Do not invent a third money number.
- [ ] Do not fall back to a cheaper trim if $58,000 misses.
- [ ] Do not put FEATURES.md on the public homepage.

## Related

- `docs/INTENT-COMPLETE.md` — Wave 12 freeze tag
- `docs/WAVE-12-COMPLETE.md` — Wave 12 complete bookmark (slice 13.48; still no clock)
- `docs/DRIZZLE-MIGRATE.md` / `docs/NEON-PITR.md` — data path
- `SLICES.md` — only build order
