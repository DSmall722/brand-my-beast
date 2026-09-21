# BrandMyBeast — auction and finish rules

CAMPAIGN.md wins if this file and another file disagree on money or identity.

Updated: 2026-09-21

## Inventory

Eleven panels. Opening bids (minimum first mark). Board order is 1–11 next to each panel id:

| n | Id | Panel | Opening | Finish at floor | Finish if $120k hits |
|---:|---|---|---:|---|---|
| 1 | `hood` | Hood | $2,500 | wrap | wrap or etch |
| 2 | `front-fascia` | Front fascia (stainless) | $2,000 | wrap | wrap or etch |
| 3 | `driver-door` | Driver doors | $2,500 | wrap | wrap or etch |
| 4 | `passenger-door` | Passenger doors | $2,500 | wrap | wrap or etch |
| 5 | `driver-bed` | Driver bed | $2,000 | wrap | wrap or etch |
| 6 | `passenger-bed` | Passenger bed | $2,000 | wrap | wrap or etch |
| 7 | `driver-rear-quarter` | Driver rear quarter | $1,000 | wrap | wrap or etch |
| 8 | `passenger-rear-quarter` | Passenger rear quarter | $1,000 | wrap | wrap or etch |
| 9 | `tailgate` | Tailgate | $2,500 | wrap | wrap or etch |
| 10 | `front-bumper` | Front bumper | $500 | wrap | wrap only |
| 11 | `rear-bumper` | Rear bumper | $500 | wrap | wrap only |

Opening sum = $19,000. The floor is not the sum of openings. Bidding has to carry the board to $58,000.

Nine steel faces can take Immortal etch, and **only after $120,000**: hood, front fascia, both door packages, both beds, both quarters, tailgate.

Wrap-only forever: front bumper (leave camera lens/washer clear), rear bumper.

Seat 3 is the driver-side cab door package (front + rear leaf). Seat 4 is the passenger-side package. One seat per side — not a combined both-sides price. Public names: Driver doors / Passenger doors.

Door-package openings are **TBD**. Keep the **$2,500 placeholders** in this table and in `campaign.ts` until usable ad space and visibility are ranked. They are expected to rise above Hood. Do not invent a new door dollar in a drive-by PR. Front fascia opening stays **$2,000**.

## Increments

Next bid is current standing plus **$250 or 10%**, whichever is larger.

## Deposit and capture

- 20% authorized to list.
- Remainder captured only if that bidder wins the panel **and** the campaign hits $58,000 **and** the brand is approved.
- Outbid → prior authorization released.
- Miss $58,000 → every authorization released.
- Fail brand check → that bid is void, next compliant standing bid is offered the panel at their last mark plus one increment. No silent reopen of the seat.

### Failed-winner offer (slice 13.4 / 13.11)

When an approved standing mark fails brand / artwork check, the seat is **not** silently reopened. The next compliant outbid mark on that panel is offered the seat at their last mark plus one increment (failed-winner → waitlist / next-mark handoff). Banned trades stay banned. No Stripe capture on this path.

**Timeout (slice 13.11):** each exclusive offer lasts **24 hours**. On a vacant seat after reject, the first compliant outbid mark’s window starts at that reject; when it expires, the next compliant mark gets a fresh 24 hours. Preferential listing is exclusive to the current offer target while the window is live — no silent reopen to everyone.

### One approved standing per panel (slice 13.4)

At most **one** `approved` intent per `panelId` at a time. Approving a new mark demotes any prior approved on that panel to outbid. The DB unique partial index and app demotion (Wave 12) enforce this — do not invent a second standing brand on the same seat.

### Withdraw and standing (slice 13.14)

Withdrawing the only pending (`listed`) mark returns the seat standing to that panel’s opening bid. Withdrawn, outbid, and floor-save rows do not leave a ghost standing. Soft-delete only — never hard-delete an approved seat.

Do not take live money on `localStorage`. The static prototype is a brochure.

## Intent statuses (slice 14.6)

| Status | Meaning |
|---|---|
| **pending** | Listed mark awaiting operator decision (`listed` in the ledger). Counts toward nothing until approved. |
| **approved** | Standing brand on that panel. At most one per `panelId`. |
| **rejected** | Operator (or ban-list sweep) refused the mark. Note required. |
| **outbid** | A higher compliant mark took the seat, or a new approve demoted prior standing. |
| **withdrawn** | Bidder pulled a pending mark. Soft-delete only — no ghost standing. |

Statuses are intent-only. No Stripe capture. `CLOSE_AT` stays null. Floor **$58,000**. Buyout **$120,000**.

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
- **Size cap (slice 13.26):** intent uploads max **90,000 bytes** (~90KB decoded). Enforced as 120,000 data-URL characters in `intent-artwork.ts` (`ARTWORK_MAX_UPLOAD_BYTES` / `ARTWORK_MAX_DATA_URL_CHARS`). External artwork URL max 2,000 characters. Oversize uploads are rejected — still intent only, no card charge.

## What winners do not get

- A reserved VIN before $58,000 clears.
- Invented impressions.
- A 48-state tour.
- A cheaper Cybertruck if the floor misses.
- Etch on a $58k–$119,999 campaign.
