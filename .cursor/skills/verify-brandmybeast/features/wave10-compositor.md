# Wave 10 — compositor people will trust

Maps SLICES **10.1–10.10**. Seat / hero compositor honesty — wrap vs etch labels
from PUBLIC_COPY, etch locked under buyout, no invented combo price.

## Slices

| Slice | Proof |
|---|---|
| 10.1 Hero / hotspot links go to `/panels/[id]` | `tests/slice-10-1-hero-hotspot-links.spec.ts` |
| 10.2 Seat compositor renders the standing brand | `tests/slice-10-2-seat-standing-brand.spec.ts` |
| 10.3 Etch toggle disabled unless pledged >= `$120,000` | `tests/slice-10-3-etch-toggle-buyout.spec.ts` |
| 10.4 Mockup queue row (no billable Imagine call) | `tests/slice-10-4-mockup-queue-row.spec.ts` |
| 10.5 Wrap vs etch labels from PUBLIC_COPY only | `tests/slice-10-5-wrap-etch-labels.spec.ts` |
| 10.6 Export one PNG per seat (auth-gated) | `tests/slice-10-6-export-png.spec.ts` |
| 10.7 Mobile compositor: one view at a time (390px) | `tests/slice-10-7-mobile-compositor.spec.ts` |
| 10.8 Every truck `<img>` alt from PUBLIC_COPY | `tests/slice-10-8-truck-img-alt.spec.ts` |
| 10.9 Panel cards show standing brand or “Open.” | `tests/slice-10-9-panel-cards-standing.spec.ts` |
| 10.10 Neighbor combo display only — no invented price | `tests/slice-10-10-neighbor-combo.spec.ts` |

## Money fences

- Etch stays locked when raised is under `$120,000`.
- `FLOOR_USD=58000`, `GOAL_USD=120000`, `CLOSE_AT=null`
- No “permanent vinyl.” No lease. No personal handle.

## Live lever

Playwright suites named above (`tests/slice-10-*.spec.ts`). Seed-buyout suites
must reset pledged state so later locks (`tests/slice-6-1-locks.spec.ts`) still
see `$0` / etch locked.
