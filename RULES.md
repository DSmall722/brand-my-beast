# BrandMyBeast — auction and finish rules

CAMPAIGN.md wins if this file and another file disagree on money or identity.

Updated: 2026-09-16

## Inventory

Twelve panels. Opening bids (minimum first mark):

| Panel | Opening | Finish at floor | Finish if $120k hits |
|---|---:|---|---|
| Hood | $2,500 | wrap | wrap or etch |
| Front fascia | $1,200 | wrap | wrap only |
| Driver door | $1,500 | wrap | wrap or etch |
| Passenger door | $1,500 | wrap | wrap or etch |
| Driver bed | $2,000 | wrap | wrap or etch |
| Passenger bed | $2,000 | wrap | wrap or etch |
| Driver rear quarter | $1,000 | wrap | wrap or etch |
| Passenger rear quarter | $1,000 | wrap | wrap or etch |
| Tailgate | $2,500 | wrap | wrap or etch |
| Tonneau | $800 | wrap | wrap only |
| Roof | $600 | wrap | wrap only |
| Rear fascia | $500 | wrap | wrap only |

Opening sum ≈ $17,100. The floor is not the sum of openings. Bidding has to carry the board to $58,000.

Eight steel faces can take Immortal etch, and **only after $120,000**: hood, both doors, both beds, both quarters, tailgate.

Wrap-only forever: front fascia, roof, tonneau, rear fascia.

## Increments

Next bid is current standing plus **$250 or 10%**, whichever is larger.

## Deposit and capture

- 20% authorized to list.
- Remainder captured only if that bidder wins the panel **and** the campaign hits $58,000 **and** the brand is approved.
- Outbid → prior authorization released.
- Miss $58,000 → every authorization released.
- Fail brand check → that bid is void, next compliant standing bid is offered the panel at their last mark plus one increment. No silent reopen of the seat.

### Failed-winner offer (slice 13.4)

When an approved standing mark fails brand / artwork check, the seat is **not** silently reopened. The next compliant listed bidder on that panel is offered the seat (failed-winner → waitlist / next-mark handoff). Banned trades stay banned. No Stripe capture on this path.

### One approved standing per panel (slice 13.4)

At most **one** `approved` intent per `panelId` at a time. Approving a new mark demotes any prior approved on that panel to outbid. The DB unique partial index and app demotion (Wave 12) enforce this — do not invent a second standing brand on the same seat.

Do not take live money on `localStorage`. The static prototype is a brochure.

## Soft close

A bid in the last 5 minutes on a panel extends **that panel** by 5 minutes. The campaign close still hard-stops at the published timestamp.

## Category

One brand per trade. If two bidders sell the same thing, they fight for one seat. The operator calls “same trade.” There is no public category list on the homepage.

## Wreck and refund (write into the contract before capture)

- Wrap: pro-rata refund of remaining months if the truck is totaled or sold before month 12.
- Immortal: physical fragment of the etched panel plus the vault certificate. No cash refund of the etch premium after install.
- Campaign miss: full refund, including deposits.

## Artwork

- Wrap: full color, shop-ready vector.
- Etch: 1-color, minimum stroke, no gradients, no 8-pt type. Reject art that cannot be lasered.
- Approval thread before the vinyl cutter or the laser sees a file.

## What winners do not get

- A reserved VIN before $58,000 clears.
- Invented impressions.
- A 48-state tour.
- A cheaper Cybertruck if the floor misses.
- Etch on a $58k–$119,999 campaign.
