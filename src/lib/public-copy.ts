/**
 * Verbatim homepage strings from PUBLIC_COPY.md (slice 0.9).
 * Do not invent warmer / closer / snarkier variants. CAMPAIGN.md wins money.
 */

import { PANEL_BOARD_MARKS, panelLegendLabel } from "./panel-board";

const PANEL_GLOSS: Readonly<Record<string, string>> = {
  "front-fascia": "stainless steel face",
  "driver-door": "front + rear cab door",
  "passenger-door": "front + rear cab door",
  "front-bumper":
    "simple-mark only: website and/or phone number — wrap-only, leave camera lens/washer clear",
  "rear-bumper": "simple-mark only: website and/or phone number — wrap-only",
};

/** Slice 16.25 — whole-truck package is the numbered board, 1 Hood through 11 Rear bumper. */
export function wholeTruckPackageCopy(): string {
  const labels = PANEL_BOARD_MARKS.map((mark) => panelLegendLabel(mark));
  return `The package is ${labels.join(", ")}.`;
}

export const PUBLIC_COPY = {
  meta: {
    title:
      "BrandMyBeast — Put your brand on the truck people already photograph.",
    description:
      "Eleven companies. One Cyberbeast. Join the list. Hit $58,000 and the truck is ordered and wrapped for a year. Miss it and nobody pays.",
  },
  header: {
    wordmark: "BrandMyBeast",
    nav: "Join the list",
  },
  hero: {
    h1: "Put your brand on the truck people already photograph.",
    lead: "concept photo",
    primaryCta: "Get on the list",
    secondaryCta: "See the eleven panels",
    imageAlt:
      "Concept preview — BrandMyBeast house wrap. Seats are not sold yet.",
    caption:
      "Concept preview — BrandMyBeast house wrap. Seats are not sold yet. Numbers live on the board below.",
  },
  board: {
    heading: "The numbers",
    lead: "This is ad space on the truck — not a share of the title.",
    raisedLabel: "Pledged so far",
    raisedHint:
      "No seats sold yet. Miss the floor and every bid is refunded.",
    floorLabel: "Floor — $58,000",
    floorHint: "Orders the truck and pays for the wrap.",
    buyoutLabel: "Buyout — $120,000",
    buyoutHint: "Buys every panel — one brand on the whole truck.",
    clockWhenCloseNull:
      "Bidding is not open. Nothing is charged on this page.",
    depositLine:
      "When bidding opens, a 20% deposit holds your panel. Nothing is charged on this page.",
    shortfallFloorLabel: "Short of floor",
    shortfallBuyoutLabel: "Short of buyout",
    openSeatsLabel: "Open seats",
    vaultFloorMarkLabel: "Floor",
    vaultBuyoutMarkLabel: "Buyout",
    /** Slice 19.10 — vault copy while pledged is $0. Not an empty auction. */
    vaultEmpty: "No marks yet",
    /** Slice 20.6 — board legend. Buyer sentence, not Open seat · Held =. */
    seatLegend: "Open seat = empty. Held seat = standing intent.",
    truckImageAlt:
      "Stainless Cyberbeast preview. Numbers live on the board.",
    wholeTruckHeading: "Whole truck — $120,000",
    /** Slice 20.7 — one sentence on `/`. 11-name dump stays on the form. */
    wholeTruckLead:
      "One brand on every panel and Immortal Etch on nine steel faces. Standing panel winners released. Nothing is charged on this page.",
    wholeTruckAmountLabel: "Buyout mark",
    wholeTruckCta: "List a whole-truck intent",
    wholeTruckSignIn: "Sign in to list a whole-truck intent",
    /** Slice 9.5 — control hidden when pledged >= $120,000. */
    wholeTruckMet:
      "Whole-truck buyout is met at $120,000. The field is closed. Still nothing charged on this page.",
  },
  seatExclusivity: {
    heading: "One brand per trade",
    body: "Name your trade in one line. If another brand already holds that trade, you bid against them on the same panel — you do not open a second seat.",
    formHint:
      "One brand per trade. Challengers fight the same panel only.",
  },
  panels: {
    heading: "The eleven panels",
    leadLines: [
      "Eleven seats. Opening prices below.",
      "Wrap is vinyl for twelve months, then it comes off.",
      "Immortal Etch at $120k means that steel can take a permanent cut once the campaign owns the truck.",
    ],
    lead: "Eleven seats. Opening prices below. Wrap is vinyl for twelve months, then it comes off. Immortal Etch at $120k means that steel can take a permanent cut once the campaign owns the truck.",
    badgeEtch: "Immortal Etch locked until $120k",
    badgeWrap: "Wrap only",
    /** Slice 10.9 — panel card standing line when no mark holds. */
    /** Slice 20.3 — print once, not on every open card. */
    standingOpen: "Open seat",
    gloss: PANEL_GLOSS,
  },
  howItWorks: {
    heading: "How it works",
    steps: [
      {
        title: "Pick a panel",
        body: "One brand per kind of business. If someone in your trade is already standing, you bid against them.",
      },
      {
        title: "$58,000 or the money comes back",
        body: "Reach $58,000 and the Cyberbeast is ordered and winners are wrapped for twelve months. Miss it and every bid is released.",
      },
      {
        title: "$120,000 — whole truck + Immortal Etch",
        body: "At $120,000 you get every panel and the campaign owns the truck. Nine steel faces can be immortally etched with your brand logo. Vinyl lasts a year. Immortal Etch is forever.",
      },
    ],
  },
  etch: {
    heading: "Immortal Etch",
    body: "Wrap is a year of film. Immortal Etch is cut into the steel. It does not peel with the wrap. Nine steel faces. Unlocks with the $120,000 whole-truck package — when the campaign owns the truck.",
    whyBuyout:
      "Immortal Etch ships with the $120,000 whole-truck package.",
    cost: "After Immortal Etch is installed there is no cash refund of that finish.",
    art: "One color, thick strokes, no gradients, no tiny type. If it cannot be cut, it does not ship.",
    forever: "Immortal Etch is forever.",
  },
  wreck: {
    heading: "Wreck & refund",
    /** Slice 20.8 — complete sentence, not a fragment. */
    lead: "Here is what happens if the campaign misses, the wrap year ends early, or Immortal Etch is already cut.",
    items: [
      {
        id: "campaign-miss",
        q: "What if the board misses $58,000?",
        a: "Full refund. No order. No wrap. No Immortal Etch.",
      },
      {
        id: "wrap-pro-rata",
        q: "What if the wrap year is cut short?",
        a: "Wrap lasts twelve months from install. If the truck is totaled or sold before month 12, wrap seats get a pro-rata refund for the months left.",
      },
      {
        id: "immortal-fragment",
        q: "What if Immortal Etch is already installed?",
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
        q: "What is Immortal Etch?",
        a: "Cut into the stainless — not vinyl. Nine steel panels. Vinyl lasts a year. Immortal Etch is forever.",
      },
      {
        q: "Why is Immortal Etch locked until $120,000?",
        a: "Immortal Etch ships with the whole-truck buyout. At $58,000 the campaign can order the truck and fund wrap. The permanent cut waits until $120,000, when the campaign owns the truck and the whole-truck + Immortal Etch package is met. Panel bids stay the seat price.",
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
    /** Slice 16.0b — interest checkbox copy. Not pledged. Not on the vault bar. */
    wholeTruckCheckboxLabel: "I want the whole truck",
    wholeTruckCheckboxHint:
      "This is interest, not a $120,000 bid. Nothing is charged.",
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
    /** Slice 17.5 — live empty state. No env key names. */
    notOpenYet: "Sign-in is not open yet. Join the list. Nothing is charged.",
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
    /** Slice 14.41 — MAINTENANCE=true. Homepage stays up. Not a close date. */
    maintenanceNotTakingMarks:
      "Not taking marks. The board is up; intent listing is paused for maintenance. Still no card charge.",
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
    finishEtch: "Immortal Etch preview",
    wrapFilm: "Vinyl film layer",
    etchMark: "Laser on stainless",
  },
  /**
   * Slice 20.10 — 404 / partner / error chrome. Not a shop tease.
   */
  chrome: {
    backToBoard: "Back to the board",
  },
  footer: {
    line: "BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com",
    independent: "Independent. Not Tesla.",
    /** Slice 13.38 — terms stub. Intent listing is not a card charge. */
    intentNotACharge: "Intent is not a charge.",
  },
} as const;
