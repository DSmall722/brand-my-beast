---- MODULE AuctionClose ----
\* BrandMyBeast auction close, anti-snipe, and settlement.
\* Describes origin/main 028a14b93e8509c18d4d4bda3e9c4f6bb6b7d24f.
\*
\* Code:
\*   src/lib/campaign-window.ts  effectiveCloseMs, campaignPhase, planSettlement
\*   src/lib/deposit-flow.ts     placeDepositBid, applyCheckoutSession,
\*                               settleClosedCampaign, settleIfCampaignClosed
\*   src/app/api/bid/route.ts    POST gate, then placeDepositBid
\*   src/lib/campaign-clock.ts   depositDeskOpen
\*   src/lib/campaign.ts         CLOSE_AT, FLOOR_USD
\*
\* Scaling. One tick is SOFT_CLOSE_MS (10 minutes). The code uses that same
\* constant for the window and the push (campaign-window.ts lines 11, 51-52).
\* Close0 stands for CLOSE_AT (2026-12-31T17:00:00.000Z). The model starts
\* after OPEN_AT with live bidding on and preview off, so the desk is open
\* exactly while now < effective close (campaignPhase lines 74-81,
\* depositDeskOpen lines 121-123).
\*
\* One panel. Two bidders. Two page-views that can settle. Apply is one step
\* per settler: coarser than the per-bid await loop in settleClosedCampaign
\* (lines 382-401). A violation in this coarser graph is also an interleaving
\* of the real awaits. The model does not explore a crash between two patches.

EXTENDS Integers, FiniteSets

CONSTANTS BUG, ExtendOnExact, TieAmounts, RecheckInsert

ASSUME
  /\ BUG \in BOOLEAN
  /\ ExtendOnExact \in BOOLEAN
  /\ TieAmounts \in BOOLEAN
  /\ RecheckInsert \in BOOLEAN

Close0 == 2
Soft == 1
MaxNow == 4
Floor == 3

Bids == {"b1", "b2"}
Settlers == {"s1", "s2"}

\* b1 and b2 both clear a floor of 3. TieAmounts makes the standing equal so
\* the earlier createdAt is the only difference. The below-floor branch of
\* planSettlement is the same operator (Amount < Floor) but these constants
\* never reach it; that branch is replayed on the TypeScript function.
Amount(b) == IF TieAmounts THEN 4 ELSE IF b = "b1" THEN 4 ELSE 5

VARIABLES now, status, createdAt, paidAt, credits, applyCount,
          pc, holdCredit, holdWinner, holdRefund

vars == <<now, status, createdAt, paidAt, credits, applyCount,
          pc, holdCredit, holdWinner, holdRefund>>

\* ---- close fold (campaign-window.ts effectiveCloseMs lines 46-54) ----

Present == { b \in Bids : status[b] \in {"unpaid", "paid", "refunded"} }

\* TLC has no order on strings. b1 is the earlier id when the timestamps match.
IdBefore(a, b) == a = "b1" /\ b = "b2"

Earlier(a, b) ==
  \/ createdAt[a] < createdAt[b]
  \/ createdAt[a] = createdAt[b] /\ IdBefore(a, b)

Earliest ==
  IF Present = {} THEN "none"
  ELSE CHOOSE b \in Present : \A o \in Present : o = b \/ Earlier(b, o)

LaterBid ==
  IF Cardinality(Present) < 2 THEN "none"
  ELSE CHOOSE b \in Present \ {Earliest} : TRUE

\* Code: t >= close - SOFT_CLOSE_MS && t < close, then close += SOFT_CLOSE_MS.
CodeWindow(t, c) == t >= c - Soft /\ t < c

\* Broken control only. ExtendOnExact treats a bid at the exact instant of
\* close as inside the window. The code's comparison is strict (t < close).
ModelWindow(t, c) ==
  t >= c - Soft /\ (t < c \/ (ExtendOnExact /\ t = c))

ModelClose1 ==
  IF Earliest = "none" THEN Close0
  ELSE IF ModelWindow(createdAt[Earliest], Close0) THEN Close0 + Soft ELSE Close0

EffectiveClose ==
  IF LaterBid = "none" THEN ModelClose1
  ELSE IF ModelWindow(createdAt[LaterBid], ModelClose1)
       THEN ModelClose1 + Soft ELSE ModelClose1

CodeClose1 ==
  IF Earliest = "none" THEN Close0
  ELSE IF CodeWindow(createdAt[Earliest], Close0) THEN Close0 + Soft ELSE Close0

CodeClose ==
  IF LaterBid = "none" THEN CodeClose1
  ELSE IF CodeWindow(createdAt[LaterBid], CodeClose1)
       THEN CodeClose1 + Soft ELSE CodeClose1

\* ---- settlement ranking (eligiblePaid lines 129-145, planSettlement) ----
\* Higher standingUsd, then earlier createdAt. Equal createdAt is not ordered
\* by the code (comparator returns 0). The model breaks that case by bid id
\* so the next state is unique. That is not what Postgres returns.

IsBetter(a, b) ==
  \/ Amount(a) > Amount(b)
  \/ Amount(a) = Amount(b) /\ createdAt[a] < createdAt[b]
  \/ Amount(a) = Amount(b) /\ createdAt[a] = createdAt[b] /\ IdBefore(a, b)

BestOf(S) == CHOOSE b \in S : \A o \in S : o = b \/ IsBetter(b, o)

Eligible == { b \in Bids : status[b] = "paid" }

Top == IF Eligible = {} THEN "none" ELSE BestOf(Eligible)

SecondEligible ==
  IF Cardinality(Eligible) < 2 THEN "none"
  ELSE BestOf(Eligible \ {Top})

\* planSettlement lines 163-205, without the 7-day forfeit (lines 174-186).
PlanCredit ==
  IF Top = "none" THEN FALSE
  ELSE IF Amount(Top) < Floor THEN FALSE
  ELSE ~credits[Top]

PlanWinner == IF PlanCredit THEN Top ELSE "none"

PlanRefund ==
  IF Top = "none" THEN {}
  ELSE IF Amount(Top) < Floor THEN Eligible
  ELSE Eligible \ (IF SecondEligible = "none" THEN {Top}
                   ELSE {Top, SecondEligible})

\* ---- actions ----
\* Arm is the desk check inside placeDepositBid (lines 99-108), after the
\* route's check (route.ts lines 17-28). Commit is insertDepositBid, which
\* stamps createdAt at insert time (intent-store.ts lines 2146, 2206) and does
\* not check the clock again. Pay is applyCheckoutSession (deposit-flow.ts
\* lines 303-368): it sets depositPaidAt with no clock check.

Tick ==
  /\ now < MaxNow
  /\ now' = now + 1
  /\ UNCHANGED <<status, createdAt, paidAt, credits, applyCount,
                 pc, holdCredit, holdWinner, holdRefund>>

ArmOne(b) ==
  /\ status[b] = "none"
  /\ now < EffectiveClose \/ BUG
  /\ status' = [status EXCEPT ![b] = "armed"]
  /\ UNCHANGED <<now, createdAt, paidAt, credits, applyCount,
                 pc, holdCredit, holdWinner, holdRefund>>

\* RecheckInsert is a control, not the code. FALSE matches insertDepositBid,
\* which does not read the clock. TRUE asks what remains if the insert
\* refused once now >= close.
CommitOne(b) ==
  /\ status[b] = "armed"
  /\ ~RecheckInsert \/ now < EffectiveClose
  /\ status' = [status EXCEPT ![b] = "unpaid"]
  /\ createdAt' = [createdAt EXCEPT ![b] = now]
  /\ UNCHANGED <<now, paidAt, credits, applyCount,
                 pc, holdCredit, holdWinner, holdRefund>>

PayOne(b) ==
  /\ status[b] = "unpaid"
  /\ status' = [status EXCEPT ![b] = "paid"]
  /\ paidAt' = [paidAt EXCEPT ![b] = now]
  /\ UNCHANGED <<now, createdAt, credits, applyCount,
                 pc, holdCredit, holdWinner, holdRefund>>

\* settleIfCampaignClosed (lines 488-497) then settleClosedCampaign
\* (lines 371-404). Two settlers are two overlapping page renders
\* (src/app/page.tsx line 49 and src/app/panels/[panelId]/page.tsx line 100).
\* There is no settlement row and no transaction around the snapshot and the
\* patches. A later call whose snapshot already shows the patches plans an
\* empty action list; applyCount does not move for an empty plan.
BeginOne(s) ==
  /\ pc[s] = "idle"
  /\ now >= EffectiveClose
  /\ pc' = [pc EXCEPT ![s] = "holding"]
  /\ holdCredit' = [holdCredit EXCEPT ![s] = PlanCredit]
  /\ holdWinner' = [holdWinner EXCEPT ![s] = PlanWinner]
  /\ holdRefund' = [holdRefund EXCEPT ![s] = PlanRefund]
  /\ UNCHANGED <<now, status, createdAt, paidAt, credits, applyCount>>

ApplyOne(s) ==
  /\ pc[s] = "holding"
  /\ status' = [b \in Bids |->
       IF b \in holdRefund[s] /\ status[b] = "paid" THEN "refunded"
       ELSE status[b]]
  /\ credits' = IF holdCredit[s]
                THEN [credits EXCEPT ![holdWinner[s]] = TRUE]
                ELSE credits
  /\ applyCount' =
       IF holdCredit[s] \/ holdRefund[s] # {}
       THEN IF applyCount < 2 THEN applyCount + 1 ELSE applyCount
       ELSE applyCount
  /\ pc' = [pc EXCEPT ![s] = "idle"]
  /\ holdCredit' = [holdCredit EXCEPT ![s] = FALSE]
  /\ holdWinner' = [holdWinner EXCEPT ![s] = "none"]
  /\ holdRefund' = [holdRefund EXCEPT ![s] = {}]
  /\ UNCHANGED <<now, createdAt, paidAt>>

Arm == \E b \in Bids : ArmOne(b)
Commit == \E b \in Bids : CommitOne(b)
Pay == \E b \in Bids : PayOne(b)
BeginSettle == \E s \in Settlers : BeginOne(s)
ApplySettle == \E s \in Settlers : ApplyOne(s)

Next ==
  \/ Tick
  \/ Arm
  \/ Commit
  \/ Pay
  \/ BeginSettle
  \/ ApplySettle

Init ==
  /\ now = 0
  /\ status = [b \in Bids |-> "none"]
  /\ createdAt = [b \in Bids |-> -1]
  /\ paidAt = [b \in Bids |-> -1]
  /\ credits = [b \in Bids |-> FALSE]
  /\ applyCount = 0
  /\ pc = [s \in Settlers |-> "idle"]
  /\ holdCredit = [s \in Settlers |-> FALSE]
  /\ holdWinner = [s \in Settlers |-> "none"]
  /\ holdRefund = [s \in Settlers |-> {}]

Spec == Init /\ [][Next]_vars

\* At most one bid is between the desk check and the insert. The code allows
\* more than one; this bound only shrinks the graph.
Bound == Cardinality({ b \in Bids : status[b] = "armed" }) <= 1

\* ---- invariants ----

TypeOK ==
  /\ now \in 0..MaxNow
  /\ status \in [Bids -> {"none", "armed", "unpaid", "paid", "refunded"}]
  /\ createdAt \in [Bids -> (-1)..MaxNow]
  /\ paidAt \in [Bids -> (-1)..MaxNow]
  /\ credits \in [Bids -> BOOLEAN]
  /\ applyCount \in 0..2
  /\ pc \in [Settlers -> {"idle", "holding"}]
  /\ holdCredit \in [Settlers -> BOOLEAN]
  /\ holdWinner \in [Settlers -> Bids \cup {"none"}]
  /\ holdRefund \in [Settlers -> SUBSET Bids]

Recorded(b) == status[b] \in {"unpaid", "paid", "refunded"}

\* Invariant 1, desk half. No recorded bid has createdAt at or after the
\* final effective close. The code's gate is now < close at check time, not
\* at insert time.
Inv1_RecordedBeforeClose ==
  \A b \in Bids : Recorded(b) => createdAt[b] < EffectiveClose

\* Invariant 1, payment half. No deposit is marked paid at or after that close.
\* applyCheckoutSession does not read the clock.
Inv1_PaidBeforeClose ==
  \A b \in Bids : paidAt[b] >= 0 => paidAt[b] < EffectiveClose

\* Invariant 2. The desk's close is the code's fold: a bid extends the close
\* it is measured against by exactly Soft, and only when it sits in
\* [close - Soft, close). Bids at or after the published close do not extend
\* it unless an earlier bid has already pushed the window over them.
Inv2_ExtensionRule ==
  /\ EffectiveClose = CodeClose
  /\ CodeClose \in {Close0, Close0 + Soft, Close0 + (2 * Soft)}
  /\ ((Present = {} \/ \A b \in Present : createdAt[b] < Close0 - Soft)
      => CodeClose = Close0)
  /\ ((Present # {} /\ \A b \in Present : createdAt[b] >= Close0)
      => CodeClose = Close0)
  /\ ((Earliest # "none" /\ LaterBid = "none"
       /\ createdAt[Earliest] = Close0 - Soft)
      => CodeClose = Close0 + Soft)

PaidBeforeClose ==
  { b \in Bids :
      /\ paidAt[b] >= 0
      /\ paidAt[b] < CodeClose
      /\ createdAt[b] < CodeClose
      /\ status[b] \in {"paid", "refunded"} }

ExpectedWinner ==
  IF PaidBeforeClose = {} THEN "none"
  ELSE LET top == BestOf(PaidBeforeClose)
       IN IF Amount(top) < Floor THEN "none" ELSE top

\* Invariant 3. A credited bid is the highest bid that was paid strictly
\* before the code's final close. Below the floor the expected winner is
\* none (refund, no credit). At most one bid is credited.
Inv3_WinnerIsBestPaid ==
  \A b \in Bids : credits[b] => b = ExpectedWinner

Inv3_AtMostOneCredit ==
  Cardinality({ b \in Bids : credits[b] }) <= 1

\* Invariant 4. A non-empty plan is applied at most once. An empty retry
\* (the patches from the first apply are already visible) does not count.
Inv4_SettlesOnce == applyCount <= 1

====
