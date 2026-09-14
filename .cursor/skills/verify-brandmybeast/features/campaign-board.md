# Campaign board

The board shows BrandMyBeast, raised `$0`, floor `$58,000` (order + wrap), buyout `$120,000` (buy + etch), and an unset auction clock (no invented close date).

## Sub-features

- `board-brand` shows the BrandMyBeast wordmark.
- `board-floor` shows `$58,000` as the order+wrap floor.
- `board-buyout` shows `$120,000` as the buy+etch goal.
- `board-close` shows unset-clock copy when `CLOSE_AT` is null.

## How to get to it (user POV)

- Open the homepage `/`.
- Scroll to the section titled around the board / money strip if needed.

## Driving it with Playwright

Preconditions:

- App healthy at `$BMB_VERIFY_URL` with `WAITLIST_MODE=memory`.
- Doctor script passed.

- **Open home.** Go to `/`. Run `page.goto("/")`. Wordmark `brand-wordmark` textContent reads `BrandMyBeast` (CSS may uppercase the visible glyphs).
- **Read floor.** Assert `floor-amount` text equals `$58,000`.
- **Read buyout.** Assert `goal-amount` text equals `$120,000`.
- **Read raised.** Assert `raised-amount` text equals `$0`.
- **Read close copy.** Assert `close-copy` text equals `Auction clock starts when bidding opens.`
- **Proof.** Screenshot `artifacts/<run-id>/campaign-board.png`. Assertion log must include brand, floor, buyout, raised, and close strings.

Or run:

```bash
.cursor/skills/verify-brandmybeast/scripts/prove-campaign-board.sh
```

## Gotchas

- Format comes from `formatUsd` in `src/lib/campaign.ts`. Assert the rendered string, not the raw integer.
- Do not treat a future `CLOSE_AT` value as valid on P1. It must stay null.
- Public HTML must not say `Close date unset` (process note, not visitor copy).
- Production deploy is out of scope for this skill.
