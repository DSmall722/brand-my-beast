/**
 * Verbatim homepage strings from PUBLIC_COPY.md (slice 0.9).
 * Do not invent warmer / closer / snarkier variants. CAMPAIGN.md wins money.
 */

const PANEL_GLOSS: Readonly<Record<string, string>> = {
  tonneau: "bed cover",
  "front-fascia": "front bumper",
  "rear-fascia": "rear bumper",
};

export const PUBLIC_COPY = {
  meta: {
    title: "BrandMyBeast — advertise on a Cybertruck",
    description:
      "Twelve companies. One Cyberbeast. Bid on a panel. Hit $58,000 and the truck gets ordered and wrapped for a year. Miss it and nobody pays.",
  },
  header: {
    wordmark: "BrandMyBeast",
    nav: "Join the list",
  },
  hero: {
    h1: "Put your brand on the truck people already photograph.",
    lead: "Twelve companies. One Cyberbeast. You buy a panel for a year. Hit $58,000 and the truck gets ordered and wrapped. Miss it and nobody pays.",
    primaryCta: "Get on the list",
    secondaryCta: "See the twelve panels",
    imageAlt:
      "Preview of a stainless Cyberbeast. No wrap on this truck yet.",
  },
  board: {
    heading: "The numbers",
    lead: "This is advertising space, not a slice of the title.",
    raisedLabel: "Pledged so far",
    raisedHint:
      "No one has a seat yet. If the floor is missed, every bid is refunded.",
    floorLabel: "Floor — $58,000",
    floorHint: "Orders the truck and pays for the wrap.",
    buyoutLabel: "Buyout — $120,000",
    buyoutHint:
      "Buys the truck. Then eight steel faces can be cut, not just wrapped.",
    clockWhenCloseNull:
      "Bidding is not open. This page does not charge cards.",
    depositLine:
      "When bidding opens, a 20% deposit holds your panel. This page does not charge cards.",
    shortfallFloorLabel: "Short of floor",
    shortfallBuyoutLabel: "Short of buyout",
    openSeatsLabel: "Open seats",
    vaultFloorMarkLabel: "Floor",
    vaultBuyoutMarkLabel: "Buyout",
    wholeTruckHeading: "Whole truck — $120,000",
    wholeTruckLead:
      "One brand on every panel. Etch on. Standing panel winners are released. Nothing is charged on this page.",
    wholeTruckAmountLabel: "Buyout mark",
    wholeTruckCta: "List a whole-truck intent",
    wholeTruckSignIn: "Sign in to list a whole-truck intent",
    /** Slice 9.5 — control hidden when pledged >= $120,000. */
    wholeTruckMet:
      "Whole-truck buyout is met at $120,000. The field is closed. Still no card charge on this page.",
  },
  seatExclusivity: {
    heading: "One brand per trade",
    body: "Name your trade in one line. If another brand already holds that trade, you fight them on the same panel — you do not open a second seat.",
    formHint:
      "One brand per trade. Challengers fight the same panel only.",
  },
  panels: {
    heading: "The twelve panels",
    lead: "Twelve seats. Opening prices below. Wrap means vinyl for twelve months, then it comes off. Can etch at $120k means that steel can take a permanent cut if the campaign owns the truck.",
    badgeEtch: "Can etch at $120k",
    badgeWrap: "Wrap only",
    /** Slice 10.9 — panel card standing line when no mark holds. */
    standingOpen: "Open.",
    gloss: PANEL_GLOSS,
  },
  howItWorks: {
    heading: "How it works",
    steps: [
      {
        title: "Pick a face",
        body: "One brand per kind of business. If someone in your trade is already standing, you bid against them.",
      },
      {
        title: "$58,000 or the money comes back",
        body: "Reach $58,000 and the Cyberbeast is ordered and winners are wrapped for twelve months. Miss it and every bid is released.",
      },
      {
        title: "$120,000 and the logo can be cut into the stainless",
        body: "At $120,000 the campaign owns the truck. Eight steel faces can take Immortal etch. Vinyl still lasts a year. The cut stays.",
      },
    ],
  },
  etch: {
    heading: "What etch actually is",
    body: "Wrap is a year of film. Etch is cut into the steel. It does not peel with the wrap. Only eight faces. Only if the auction reaches $120,000 — you do not cut a truck the campaign does not own.",
    whyBuyout:
      "Your bid buys the seat. $120,000 buys the truck so the cut is allowed.",
    cost: "There is no separate etch price list on this page. After etch is installed there is no cash refund of that finish.",
    art: "Etch art is one color, thick strokes, no gradients, no tiny type. If it cannot be cut, it does not ship.",
  },
  wreck: {
    heading: "Wreck & refund",
    lead: "If the campaign misses, the wrap year ends early, or etch is already cut.",
    items: [
      {
        id: "campaign-miss",
        q: "What if the board misses $58,000?",
        a: "Full refund. No order. No wrap. No etch.",
      },
      {
        id: "wrap-pro-rata",
        q: "What if the wrap year is cut short?",
        a: "Wrap lasts twelve months from install. If the truck is totaled or sold before month 12, wrap seats get a pro-rata refund for the months left.",
      },
      {
        id: "immortal-fragment",
        q: "What if Immortal etch is already installed?",
        a: "No cash refund of that finish. The record is a piece of the cut panel and a vault certificate.",
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
        a: "You bid against each other for that panel.",
      },
      {
        q: "What is etch?",
        a: "The permanent option. On eight steel panels the logo can be cut into the stainless, only at $120,000. Vinyl comes off after a year. The cut does not.",
      },
      {
        q: "Why does etch cost $120,000?",
        a: "It does not. $120,000 buys the truck so a permanent cut is allowed. Your panel bid is the seat price.",
      },
      {
        q: "When does bidding start?",
        a: "When seats open. There is no date on this page yet.",
      },
      {
        q: "Will I be charged if I join the list?",
        a: "No. The waitlist is an email.",
      },
    ],
  },
  waitlist: {
    heading: "Get on the list",
    lead: "Seats are not for sale yet. Leave an email. We will tell you when they are.",
    placeholder: "you@company.com",
    button: "Notify me",
    idleNote: "We only email when seats open.",
    /** Slice 13.39 — privacy stub waitlist retention. */
    retention: "Waitlist retention: until seats open or user deletes.",
    success: "You are on the list. We will email when bidding opens.",
    already: "That email is already on the list.",
    /** Slice 6.5 — never imply join when the write did not land. */
    unavailable:
      "Waitlist is temporarily unavailable. You are not on the list yet.",
    failed: "Could not save that email. You are not on the list. Try again.",
    /** Slice 6.6 — never claim joined on 429. */
    rateLimited:
      "Too many attempts. You are not on the list. Wait a moment and try again.",
    /** Slice 13.31 — disposable / blocked domain. */
    domainBlocked:
      "That email domain is blocked. You are not on the list. Use a lasting inbox.",
  },
  /**
   * Slice 12.17 — /signin copy. Not a homepage section.
   * Live mode HTML must never contain the string “test login”.
   */
  signIn: {
    heading: "Sign in",
    lead: "Accounts unlock intent marks on panels. This page does not charge cards.",
    magicLinkHint:
      "We email a one-time link. No password. This page does not charge cards.",
    magicLinkButton: "Email me a sign-in link",
    credentialsButton: "Sign in",
    missingProvidersLead:
      "Live sign-in is on, but no providers are configured yet. The operator needs AUTH_SECRET, AUTH_URL, RESEND_API_KEY, and DATABASE_URL.",
    /** AUTH_MODE=test only — never render under live. */
    testHint:
      "CI path: use any @example.com email and the test password.",
    /** Slice 12.39 — /signin/check-email success line. */
    checkEmailHeading: "Check your email",
    checkEmailSuccess:
      "If that address is valid, a sign-in link is on the way. The link expires soon. No card is charged on this path.",
    /** Slice 14.25 — /account sign-out button. Not homepage. */
    signOut: "Sign out",
  },
  /**
   * Slice 13.5 — seat pack (withdraw / failed-winner / deposit preview).
   * Not homepage. Do not rewrite hero H1.
   */
  seat: {
    /**
     * Slice 14.7 — seat rationale only (RULES.md Inventory). Not homepage H1.
     */
    openingRationale:
      "Opening marks start the seat. The floor is not the sum of openings — bidding has to carry the board to $58,000.",
    withdrawSuccess: "Intent withdrawn. Still not charged.",
    withdrawButton: "Withdraw pending intent",
    failedWinnerWaitlist:
      "Stay on the waitlist. This page does not charge cards.",
    /** `{percent}` `{amount}` filled by deposit-preview helper. */
    depositPreviewTemplate: "{percent}% of this mark is {amount}. Not charged.",
    /**
     * `{amount}` `{last}` filled by failed-winner-offer helper.
     */
    failedWinnerLeadTemplate:
      "Failed-winner offer: re-list at {amount} — your last mark {last} + one increment (max($250, 10%)). Still not charged. No silent reopen.",
    /** Slice 13.11 — offer window elapsed; cascade to next compliant. */
    failedWinnerExpired:
      "Failed-winner offer expired. Next compliant mark is up. No silent reopen.",
    /** Slice 13.28 — /account/wins empty state. */
    winsEmpty:
      "No approved seats yet. Operator approval on a listed intent opens this sheet. Still no card charge.",
  },
  /** Intent failure strings (not homepage PUBLIC_COPY.md sections). */
  intent: {
    rateLimited:
      "Too many intent attempts. No new intent was listed. Wait a moment and try again.",
    /** Slice 14.17 — SEATS_OPEN=false. Not a close date. */
    seatsClosedWaitlistOnly:
      "Seats are not open for intent marks. Join the waitlist only. This page does not charge cards.",
  },
  /**
   * Slice 9.3 — per-seat soft-close extension. Never a campaign CLOSE_AT.
   * Not a homepage PUBLIC_COPY.md section.
   */
  panelExtension: {
    heading: "Soft-close extension",
    unset:
      "This seat is not on a soft-close extension. Bidding is not open. This page does not charge cards.",
    setLead: "This seat's soft-close window runs until",
    setTail:
      "That is a seat extension only — not a campaign close date. This page does not charge cards.",
  },
  /**
   * Slice 10.5 — wrap vs etch labels on the seat compositor.
   * Immortal = etch. Never “permanent vinyl.” Not a homepage PUBLIC_COPY.md section.
   */
  compositor: {
    modeWrap: "Wrap",
    modeEtch: "Etch",
    finishWrapEtchable: "Wrap on steel · etch at buyout",
    finishWrapOnly: "Wrap only",
    finishEtch: "Immortal etch preview · unlocks at $120,000",
    wrapFilm: "Vinyl film layer",
    etchMark: "Laser on stainless",
  },
  footer: {
    line: "BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com",
    independent: "Independent. Not Tesla.",
    /** Slice 13.38 — terms stub. Intent listing is not a card charge. */
    intentNotACharge: "Intent is not a charge.",
  },
} as const;
