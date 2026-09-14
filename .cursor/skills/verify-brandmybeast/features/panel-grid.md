# Panel grid

Users see twelve stainless panel seats. Eight etchable faces stay locked until buyout `$120,000`.

## Sub-features

- `panels-count` renders exactly twelve cards.
- `panels-etch-lock` marks etchable panels locked under buyout while raised is below `$120,000`.
- `panels-wrap-only` marks non-etchable panels as wrap only.

## How to get to it (user POV)

- Open `/` and move to the twelve panels section (`#panels`).

## Driving it with Playwright

Preconditions:

- App healthy at `$BMB_VERIFY_URL`.
- Raised total is `$0` (P1 default).

- **Open panels.** Go to `/#panels`. Run `page.goto("/#panels")`.
- **Count cards.** Assert `panel-grid` contains 12 `article` nodes.
- **Check etchable locks.** For each etchable panel id, assert `data-etchable="true"`, `data-etch-unlocked="false"`, and `etch-lock-<id>` contains `Etch locked`.
- **Check wrap-only.** For non-etchable panels, assert visible text `Wrap only`.
- **Proof.** Screenshot `artifacts/<run-id>/panel-grid.png`.

Panel ids live in `src/lib/campaign.ts` (`PANELS`).

## Gotchas

- Etch unlock is a campaign-total rule, not a per-panel toggle. Under `$120,000`, every etchable seat stays locked.
- Opening bids are display floors for later auction work. P1 only proves inventory + lock copy.
