# Panel grid

Users see twelve stainless panel seats. Eight etchable faces stay locked until buyout `$120,000`.

## Sub-features

- `panels-count` renders exactly twelve cards.
- `panels-index` shows the same 1–11 index as hero callouts (`data-panel-n`, `panel-index-<id>`).
- `panels-etch-lock` marks etchable panels locked under buyout while raised is below `$120,000`.
- `panels-wrap-only` marks non-etchable panels with a `Wrap` badge.

## How to get to it (user POV)

- Open `/` and move to the eleven panels section (`#panels`).

## Driving it with Playwright

Preconditions:

- App healthy at `$BMB_VERIFY_URL`.
- Raised total is `$0` (P1 default).

- **Open panels.** Go to `/#panels`. Run `page.goto("/#panels")`.
- **Count cards.** Assert `panel-grid` contains 12 `article` nodes.
- **Match hero indexes.** For each board mark, card `data-panel-n` and `panel-index-<id>` text equal hero callout `data-panel-n` (1 hood … 12 rear fascia).
- **Check etchable locks.** For each etchable panel id, assert `data-etchable="true"`, `data-etch-unlocked="false"`, and `etch-lock-<id>` textContent equals `Etch at $120k`.
- **Check wrap-only.** For non-etchable panels, assert visible badge text `Wrap`.
- **Proof.** Screenshot `artifacts/<run-id>/panel-grid.png`.

Or run:

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-panel-grid.sh
```

Panel ids live in `src/lib/campaign.ts` (`PANELS`).

## Gotchas

- Etch unlock is a campaign-total rule, not a per-panel toggle. Under `$120,000`, every etchable seat stays locked (`data-etch-unlocked="false"`).
- Public lock copy is `Etch at $120k`, not the words “etch locked”.
- Wrap-only faces show badge `Wrap` (not the phrase “Wrap only”).
- Opening bids are display floors for later auction work. P1 only proves inventory + lock copy.
