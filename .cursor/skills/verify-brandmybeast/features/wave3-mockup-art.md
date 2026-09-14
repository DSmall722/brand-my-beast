# Wave 3 — mockup and art

Maps SLICES **3.1–3.7**. Preview only — not proof of a truck that exists.

## Slices

| Slice | Proof |
|---|---|
| 3.1 Stainless compositor on the seat | `tests/intent-ui.spec.ts` stainless compositor |
| 3.2 Etch controls disabled while raised < $120,000 | seat `etch-lock-copy` / compositor etch disabled |
| 3.3 Highway-legibility checker | intent-ui / legibility unit |
| 3.4 Etch linter from RULES.md | etch-constraint linter on seat |
| 3.5 Artwork URL or upload on the intent | intent artwork fields |
| 3.6 Day/night/wet/dirty toggles | finish-conditions controls |
| 3.7 Side / front / rear views + SVG hotspots | truck-view hotspots; empty seats raw 30X |

## Money fences

- Etch stays locked under buyout `$120,000`.
- No lease. No `CLOSE_AT`. Floor `$58,000` may appear in finish copy.

## Live lever

Playwright `tests/intent-ui.spec.ts` Wave 3 cases; `tests/slice-6-1-locks.spec.ts`
for etch lock under buyout.
