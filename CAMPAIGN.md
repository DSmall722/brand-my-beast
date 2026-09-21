# BrandMyBeast — campaign lock

Read this before FEATURES.md, the prototype, or any old playbook. If another file disagrees with this one, this one wins.

Updated: 2026-09-21

## What this is

An all-or-nothing auction of **11 stainless panels** on a **2026 Tesla Cybertruck Cyberbeast** that does not exist yet. Standing bids fund the order. Miss the floor and nobody is charged.

Public brand: **BrandMyBeast**
Public handle: **@BrandMyBeast**
Public mail: **hello@brandmybeast.com**
Domain: **brandmybeast.com**
Not Tesla. Not teslacyberbeast.com.

### Current stack (slice 14.5)

Matches **`ARCHITECTURE.md`** — numbers in this file stay locked and unchanged:
Next.js App Router + Postgres/Drizzle + Vercel Blob + Resend (mock in CI).
Stripe is **not wired**. `CLOSE_AT` stays null. Do not start the 30-day clock.
Detail lives in `ARCHITECTURE.md`; this sentence is the campaign-side pointer only.

## Money (locked 2026-09-13)

| Threshold | What happens |
|---|---|
| Under **$58,000** | Full refund. No order. No wrap. No Immortal Etch. |
| **$58,000–$119,999** | Place the Cyberbeast **order**. Fund wrap / install / removal. Wrap only. Immortal Etch not included. Operator finances the unpaid truck balance at delivery. |
| **$120,000 — whole-truck + Immortal Etch package** | Campaign buys the truck. Home charger + install. Buffer. **Immortal Etch** on the nine steel faces. One brand may take every panel (whole-truck buyout). |

There is no Dual Motor. There is no Premium. There is no lease tier. The $40,000 lease product is dead. The word lease does not appear in public copy.

### Wreck and refund text (slice 13.3)

Long-form wreck / refund clauses live in **[`CONTRACT.md`](./CONTRACT.md)** (Campaign miss, wrap year cut short, Immortal etch already installed). This money table stays authoritative for thresholds: **$58,000** / **$120,000**. Do not invent a third number.

Whole-truck buyout button: **$120,000** — one brand on every panel **and Immortal Etch** on the nine steel faces. Standing panel winners are released. Buyout is a package (truck ownership path + Immortal Etch), not panels-only. There is no third price.

### Why $58,000 is the floor

The floor is **order-path cash + wrap reserve**, not half the sticker.

Budget at the $120,000 buyout (current working numbers — replace with live Tesla quote + shop bid before close):

| Line | Amount |
|---|---|
| Cyberbeast MSRP | $99,990 |
| Destination | $1,995 |
| SC IMF | $500 |
| Title + plate | ~$55 |
| Stainless-safe wrap install | $10,000 |
| Home charger + install | $2,500 |
| Buffer (insurance, extra miles, shop overrun) | $4,960 |
| **Buyout total** | **$120,000** |

At the $58,000 floor: $10,000 is reserved for wrap / install / removal. The rest is order-path cash (Tesla order deposit / down). The operator covers remaining principal. FSD is operator cost ($99/mo), never on the board.

### Deposit

20% to list a bid. Remainder if that bid wins. Lose the panel, fail brand check, or miss $58,000 → deposit released. Cards are not charged until the money path is live. The current static page only records intent.

### Proxy max (slice 13.12)

Optional proxy ceiling on a panel intent may not exceed **$120,000** (the buyout / `GOAL_USD`). Same number as the buyout — not a third money threshold. Still intent only; no card charge.

## Inventory

Board index 1–11. Opening marks are the same dollars as `RULES.md`. Floor and buyout are not this table.

| n | Panel | Opening |
|---:|---|---:|
| 1 | Hood | $2,500 |
| 2 | Front fascia (stainless) | $2,000 |
| 3 | Front bumper | $500 |
| 4 | Driver doors | $4,500 |
| 5 | Driver Rear Sail | $1,000 |
| 6 | Driver bed | $2,000 |
| 7 | Passenger doors | $4,500 |
| 8 | Passenger Rear Sail | $1,000 |
| 9 | Passenger bed | $2,000 |
| 10 | Tailgate | $2,500 |
| 11 | Rear bumper | $500 |

Board order is front-to-back. Seats 4 and 7 are door packages: front + rear cab leaf on that side, one seat per side. Public names stay **Driver doors** / **Passenger doors**. Front fascia is Immortal Etch. Front bumper (3) and Rear bumper (11) are wrap-only, **simple-mark only: website and/or phone number**. Front bumper leaves the camera lens/washer clear.

Immortal Etch is nine steel faces — everything except seats 3 and 11.

Opening sum is $23,000 — the floor is not this sum.

## Vehicle

- Trim: **Cyberbeast only**. Miss $58,000 and the idea does not fall back to a cheaper Cybertruck.
- Not reserved. No VIN. Do not invent a reservation.
- Wrap funded from campaign proceeds. Shop may take a mid-panel as in-kind **after** cash funds the wrap, not instead of the floor.

## Term

- Wrap: **12 months from install day**, not from close.
- Immortal etch: until that piece of steel is gone. Year two is a new buy, not a gift.
- Year-2 first refusal at a published higher rate is allowed later. Do not sell it in v1 copy.

## Clock

- 30 days once the money path (Stripe + terms + LLC) is live.
- Last-5-minute bid on a panel adds 5 minutes to that panel. Campaign still hard-stops at the published close.
- Close date is a field. It is **unset** until that morning. Not October 1.

## Identity (public)

Allowed on site, X, contracts-facing pages:

- BrandMyBeast / BRANDMYBEAST
- @BrandMyBeast
- hello@brandmybeast.com
- brandmybeast.com
- “the operator”
- Location: Southeast / South Carolina (circuit), not an employer city

Never write, even as a negative example:

- The operator’s legal name
- The operator’s personal Gmail
- The operator’s personal X handle
- Employer, job title, face, home address, VIN you do not have

LLC is the contracting party before Stripe. Legal name lives on formation papers and the bid contract, not the hero.

## Route

Work circuit, not a victory lap. Frequency, not flyover.

South Carolina home loop + Atlanta + Charlotte + Florida panhandle. Named corridors (I-26 / I-77 / I-85 / I-95) are proof locations, not a 48-state Supercharger streak.

Proof after the truck exists: odometer photos, trip screenshots, tagged posts. Never invent impression counts or CPMs.

## Brand rules

- One brand per trade / category. Bidder names the trade in one line. No homepage taxonomy.
- Manual approval. Ban: porn, hate, scams, anything that cannot pass a school or a grocery lot.
- Operator veto on art and on category collisions.

## Voice

- “Eleven brands on a Cyberbeast.”
- “Bids cover the truck or they come back.”
- “Ordered only if the board clears.”
- Immortal = etch into 30X. Not “permanent vinyl.”
- Independent. Not Tesla.
