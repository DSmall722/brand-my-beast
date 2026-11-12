---
name: verify-auction-close
description: "Recheck the auction close model. Use when a change touches the close, the desk check, the deposit webhook, or settlement."
---

# Verify auction close

Project-local check of the close, the anti-snipe fold, and settlement. The spec describes the code. It does not change the code.

Sync commit: `028a14b93e8509c18d4d4bda3e9c4f6bb6b7d24f`. Move that commit only after you read the covered functions at the new commit and the spec still describes them. Record the new commit in the `AuctionClose.tla` header and here.

## When to run

Run this skill when the change touches any of these:

- `effectiveCloseMs`, `campaignPhase`, `planSettlement` in `src/lib/campaign-window.ts`
- `placeDepositBid`, `applyCheckoutSession`, `settleClosedCampaign`, `settleIfCampaignClosed` in `src/lib/deposit-flow.ts`
- `POST` in `src/app/api/bid/route.ts`
- `depositDeskOpen` in `src/lib/campaign-clock.ts`
- `insertDepositBid` and `patchDepositBid` in `src/lib/intent-store.ts`
- the `settleIfCampaignClosed` calls in `src/app/page.tsx` and `src/app/panels/[panelId]/page.tsx`

`src/lib/panel-extension.ts` is not an input to the close. `panelExtendedUntil` does not move `effectiveCloseMs` and does not keep the desk open. A change only in that file does not need this check.

`AuctionCloseRecheck.cfg` is a separation run and not the product. It stays out of this skill.

## Run

From this directory:

```bash
.cursor/skills/verify-auction-close/run.sh
```

`run.sh` runs TLC 2.19 from tla2tools 1.7.4. `JAVA` overrides the `java` binary. `TLA2TOOLS` overrides the jar path. If the jar is missing and `TLA2TOOLS` is unset, the script downloads that release and checks sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`.

TLC stops at the first broken invariant. `run.sh` drops that invariant, runs again, and repeats until the remaining invariants finish or TLC fails for another reason. The last lines name every failed invariant and the distinct-state count of the run that finished. Exit status is TLC's from the first broken invariant, or `0` when every invariant holds. The script does not start Next.js, Playwright, or GitHub Actions.

The fold check is `AuctionCloseBroken.cfg`. It sets `ExtendOnExact = TRUE` and checks `TypeOK` and `Inv2_ExtensionRule` only.

```bash
.cursor/skills/verify-auction-close/run.sh AuctionCloseBroken.cfg
```

`Inv2_ExtensionRule` must fail on that config. If it passes, the check is not watching the fold.

## Read the result

Read the TLC result with `/statechart`. `view.mjs` in this directory is the reader labels (`state`, `group`, `step`, `colors`, `title`). Do not invent a second set of labels.

## A real bug or a wrong model

Replay the counterexample on `effectiveCloseMs` and `planSettlement`. If those functions do not do what the trace says, the model is wrong. Session 1's replays are the pattern.

- A timestamp 1 ms before the close extends `effectiveCloseMs` by 10 minutes. A timestamp equal to the close does not (`campaign-window.ts`, the `t < close` test).
- `planSettlement` does not compare `depositPaidAt` to the close. A deposit cleared at the close can be credited.
- After the first plan's patches are visible on the bid rows, `planSettlement` returns an empty list. A second non-empty plan needs a new paid bid, or a snapshot taken before those patches.

`Arm` in the spec is the desk check in `placeDepositBid` (`depositDeskOpen`, then return). `Commit` is `insertDepositBid`, which stamps `createdAt` from the clock at insert time and does not read the desk again. `Pay` is `applyCheckoutSession`, which sets `depositPaidAt` with no desk check. `BeginSettle` and `ApplySettle` are two overlapping calls to `settleIfCampaignClosed`.

## When the code change is intended

Update `AuctionClose.tla` so it describes the new code, then move the sync commit. Do not weaken an invariant to make TLC pass. Do not delete a failing invariant from `AuctionClose.cfg` to make `run.sh` exit `0`.

`BUG = TRUE` is the model of a missing desk check (`Arm` may pass at the close). The product config keeps `BUG = FALSE`. `ExtendOnExact = TRUE` is the broken fold, not the product. `RecheckInsert = TRUE` refuses an insert the product allows. Leave those three false in `AuctionClose.cfg`.

## Known failures at the sync commit

A red run on unmodified code is the recorded result, not a new regression. TLC found 16,979 distinct states. `TypeOK` and `Inv2_ExtensionRule` hold. TLC found no deadlock. These fail:

- `Inv1_RecordedBeforeClose`. Clock steps to the start of the soft window, the desk check passes, the clock reaches the close, the insert stamps `createdAt` at the close.
- `Inv1_PaidBeforeClose`. A bid is recorded before the soft window, the clock reaches the close, the deposit clears at the close.
- `Inv3_WinnerIsBestPaid`. Settlement then credits the bid that was paid at the close.
- `Inv3_AtMostOneCredit`. Two bids are paid at the close, two pages snapshot different winners, both credits are written.
- `Inv4_SettlesOnce`. Two pages each write a non-empty plan.

`AuctionCloseBroken.cfg` reaches 18,595 states and `Inv2_ExtensionRule` fails. The product comparison is `t < close`. The broken config treats a bid at the exact close as inside the window.

Fixing these races is a later decision. This skill does not patch `src/`.
