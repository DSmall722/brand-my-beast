/**
 * Verbatim homepage strings from PUBLIC_COPY.md (slice 0.8).
 * Do not invent warmer / closer / snarkier variants. CAMPAIGN.md wins money.
 */

export const PUBLIC_COPY = {
  meta: {
    title: "BrandMyBeast — advertise on a Cybertruck",
    description:
      "Twelve companies. One Cybertruck. Bid on a panel. Hit $58,000 and the truck gets ordered and wrapped for a year. Miss it and nobody pays.",
  },
  header: {
    wordmark: "BrandMyBeast",
    nav: "Join the list",
  },
  hero: {
    h1: "Put your brand on a Cybertruck.",
    lead: "Twelve companies share one Tesla Cyberbeast — the top Cybertruck. You bid on a panel. If the auction reaches $58,000, the truck is ordered and your art rides for a year. If it does not, every dollar comes back.",
    primaryCta: "Get on the list",
    secondaryCta: "See the twelve panels",
    imageAlt:
      "Preview of a stainless Cyberbeast. No wrap on this truck yet.",
  },
  board: {
    heading: "The numbers",
    lead: "This is an auction for advertising space. Twelve brands do not own the truck. They buy a year on it — or they get their money back.",
    raisedLabel: "Pledged intent",
    raisedHint:
      "Sum of approved intents — not cash raised. Cards are not charged until P3. If the floor is missed, every bid is refunded.",
    floorLabel: "Floor — $58,000",
    floorHint:
      "Enough to order the Cyberbeast and pay for a professional wrap.",
    buyoutLabel: "Buyout — $120,000",
    buyoutHint:
      "The campaign buys the truck. Eight steel panels can then be etched into the metal — a mark that stays after the wrap year ends.",
    clockWhenCloseNull:
      "Bidding is not open yet. There is no countdown on this page.",
    depositLine:
      "When bidding opens, a 20% deposit holds your panel. This page does not charge cards.",
    shortfallFloorLabel: "Short of floor",
    shortfallBuyoutLabel: "Short of buyout",
    openSeatsLabel: "Open seats",
    vaultFloorMarkLabel: "Floor",
    vaultBuyoutMarkLabel: "Buyout",
    wholeTruckHeading: "Whole-truck intent — $120,000",
    wholeTruckLead:
      "One brand on every panel. Etch on. Standing panel winners are released. Intent only — cards are not charged here.",
    wholeTruckAmountLabel: "Buyout mark",
    wholeTruckCta: "List whole-truck intent",
    wholeTruckSignIn: "Sign in to list a whole-truck intent",
  },
  panels: {
    heading: "The twelve panels",
    lead: "Each seat is a piece of the truck. The price under the name is the opening bid for that space. Wrap means vinyl for twelve months, then the film comes off. Can etch at $120k means that steel face can be cut if the campaign buys the truck. Etch is not a second product on this page. It is a finish that unlocks at buyout.",
    badgeEtch: "Can etch at $120k",
    badgeWrap: "Wrap only",
    gloss: {
      tonneau: "bed cover",
      "front-fascia": "front bumper",
      "rear-fascia": "rear bumper",
    } as Readonly<Record<string, string>>,
  },
  howItWorks: {
    heading: "How it works",
    steps: [
      {
        title: "Pick a panel",
        body: "Choose a face of the truck and name the kind of business you are in. One brand per trade. If someone in your trade is already standing, you bid against them — you do not open a second seat. Art has to clear before it goes on a truck people will see in a parking lot.",
      },
      {
        title: "Hit $58,000, or nobody pays",
        body: "When the live auction opens, bids add up. Reach $58,000 and the Cyberbeast is ordered and the winners are wrapped for twelve months. Miss that number and every bid is released. No truck. No wrap. No charge.",
      },
      {
        title: "Hit $120,000 and the steel can take a mark",
        body: "At $120,000 the campaign owns the truck, so eight stainless faces can take Immortal etch: the logo is cut into the 30X steel. Vinyl still lasts a year. The cut stays until that panel is gone.",
      },
    ],
  },
  etch: {
    heading: "What etch actually is",
    body: "Wrap is a year of vinyl. It is designed to come off. Immortal etch is the permanent option: a shop lasers or mills the mark into the stainless skin. That is why it is only allowed on eight steel faces — hood, both doors, both beds, both rear quarters, and the tailgate. The bumper covers, roof, and bed cover cannot take a cut.",
    whyBuyout:
      "Etch is locked under $120,000 because under the floor-to-buyout band the operator still finances the truck. You do not cut steel the campaign does not own. At $120,000 the campaign buys it, so a permanent mark is allowed.",
    cost: "There is no separate etch price list on this page. You bid on the panel. If the board hits $120,000 and your seat is one of the eight, etch is a finish you can choose. The $120,000 buyout is the truck, destination, tax, a $10,000 wrap reserve, a home charger, and a buffer — not a laser-shop invoice split twelve ways. After etch is installed there is no cash refund of that finish; the record is a piece of the cut panel and a vault certificate.",
    art: "Etch art is one color, thick strokes, no gradients, no tiny type. If it cannot be cut, it does not ship.",
  },
  wreck: {
    heading: "Wreck & refund",
    lead: "What happens if the campaign misses, the wrap year ends early, or etch is already cut. No invented legal terms on this page.",
    items: [
      {
        id: "campaign-miss",
        q: "What if the board misses $58,000?",
        a: "Under $58,000: full refund. No order. No wrap. No etch. Deposits are released.",
      },
      {
        id: "wrap-pro-rata",
        q: "What if the wrap year is cut short?",
        a: "Wrap lasts twelve months from install. If the truck is totaled or sold before month 12, wrap seats get a pro-rata refund for the months left.",
      },
      {
        id: "immortal-fragment",
        q: "What if Immortal etch is already installed?",
        a: "After etch is installed there is no cash refund of that finish. The record is a piece of the cut panel and a vault certificate.",
      },
    ],
  },
  questions: {
    heading: "Questions people actually ask",
    items: [
      {
        q: "Is this Tesla?",
        a: "No. Independent project. Not affiliated with Tesla, Inc.",
      },
      {
        q: "Is there a truck yet?",
        a: "Not yet. The photo is a preview. The Cyberbeast is ordered only if the auction clears $58,000.",
      },
      {
        q: "What am I buying?",
        a: "A year of your brand on one panel. Not a share of the title.",
      },
      {
        q: "What if two of us sell the same thing?",
        a: "You bid against each other for that panel. The truck will not carry two brands in the same trade.",
      },
      {
        q: "What is etch?",
        a: "The permanent option. On eight steel panels the logo can be cut into the stainless, and only if the campaign hits $120,000 and owns the truck. Vinyl comes off after a year. The cut does not.",
      },
      {
        q: "Why does etch cost $120,000?",
        a: "It does not. $120,000 buys the truck so a permanent cut is legal and honest. Your panel bid is the seat price. Etch is the finish that unlocks when the campaign can own the steel.",
      },
      {
        q: "When does bidding start?",
        a: "When seats open. There is no date on this page until the money path is live.",
      },
      {
        q: "Will I be charged if I join the list?",
        a: "No. The waitlist is an email. Cards are not charged here.",
      },
    ],
  },
  waitlist: {
    heading: "Get on the list",
    lead: "Bidding is not open. Leave an email and we will tell you when a panel can be claimed. Free. No spam pitch.",
    placeholder: "you@company.com",
    button: "Notify me",
    idleNote: "We only email when seats open.",
    success: "You are on the list. We will email when bidding opens.",
    already: "That email is already on the list.",
  },
  footer: {
    line: "BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com",
    independent: "Independent. Not Tesla.",
  },
} as const;
