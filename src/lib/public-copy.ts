/**
 * Verbatim homepage strings from PUBLIC_COPY.md (slice 0.9).
 * Do not invent warmer / closer / snarkier variants. CAMPAIGN.md wins money.
 */

import { BRAND, CLOSE_AT, FLOOR_USD, OPEN_AT, PANELS, formatUsd } from "./campaign";
import { SOFT_CLOSE_MS, publishedCloseLabelEt } from "./campaign-window";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "./panel-board";


/** Card gloss is off. Panel names carry the seat; bumper rules stay in RULES.md. */
const PANEL_GLOSS: Readonly<Record<string, string>> = {};

/** Shared by the FAQ and How it works so the two lines cannot drift. */
const TRUCK_OWNERSHIP_LINE =
  "The operator does not own the truck yet. This auction buys it.";

const CLOSED_ASK = `Questions? Use the Contact us form or email ${BRAND.email}.`;

/** Long Eastern label. `Monday, November 2, 2026 at 12:00 PM ET`. */
function longCloseLabelEt(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("weekday")}, ${pick("month")} ${pick("day")}, ${pick("year")} at ${pick("hour")}:${pick("minute")} ${pick("dayPeriod")} ET`;
}

const SOFT_CLOSE_MINUTES = SOFT_CLOSE_MS / 60_000;
const FAQ_CLOSE_ANSWER = `Bidding is open and closes ${longCloseLabelEt(CLOSE_AT ?? "")}. A bid in the last ${SOFT_CLOSE_MINUTES} minutes pushes the close back ${SOFT_CLOSE_MINUTES} minutes.`;

/** Slice 16.25 — whole-truck package is the numbered board, 1 Hood through 11 Rear bumper. */
export function wholeTruckPackageCopy(): string {
  const labels = PANEL_BOARD_MARKS.map((mark) => panelLegendLabel(mark));
  return `The package is ${labels.join(", ")}.`;
}

export const PUBLIC_COPY = {
  meta: {
    title:
      "BrandMyBeast — Advertise your brand on the truck that people already photograph",
    description: `${PANELS.length} ad panels on one Cybertruck, wrapped for a year and driven across the Southeast. Bidding is open. Closes ${publishedCloseLabelEt()}.`,
  },
  header: {
    wordmark: "BrandMyBeast",
    nav: "Contact BMB",
  },
  hero: {
    h1: "Advertise your brand on the truck that people already photograph",
    lead: "",
    primaryCta: "Contact us",
    secondaryCta: "Bid on a Panel",
    howItWorksCta: "How it Works",
    imageAlt: "Example wrap on the BrandMyBeast truck. Seats are open for bids.",
    ogImageAlt:
      "A Tesla Cybertruck Cyberbeast with example brand wraps on its panels.",
    caption: "Example wrap. Your brand here.",
  },
  board: {
    heading: "Track the Auction",
    lead: "",
    raisedLabel: "Pledged so far",
    raisedHint: "",
    floorLabel: "Floor",
    floorHint: `Miss the ${formatUsd(FLOOR_USD)} goal and every deposit is refunded.`,
    clockWhenCloseNull: `Bidding is open. Closes ${publishedCloseLabelEt()}. Nothing is charged on this page.`,
    depositLine:
      "20% of the bid is charged when you place it. If you do not win, that deposit is refunded after close. A winner's deposit is credited to the invoice. Nothing is charged on this page.",
    shortfallFloorLabel: "Short of floor",
    openSeatsLabel: "Open seats",
    vaultFloorMarkLabel: "Floor",
    /** Slice 19.10 — vault copy while pledged is $0. Not an empty auction. */
    vaultEmpty: "No marks yet",
    /** Slice 20.6 — board legend. Buyer sentence, not Open seat · Held =. */
    seatLegend: "Open seat = empty. Held seat = standing intent.",
    truckImageAlt: `Cybertruck with the ${PANELS.length} ad panels outlined`,
    wantAllPanels: "Buy the Whole Truck",
    wholeTruckHeading: "Whole truck — $120,000",
    /** Slice 20.7 — one sentence on `/`. 11-name dump stays on the form. */
    wholeTruckLead:
      "One brand on every panel. Standing panel winners released. Nothing is charged on this page.",
    wholeTruckAmountLabel: "Fully funded mark",
    wholeTruckCta: "List a whole-truck intent",
    wholeTruckSignIn: "Sign in to list a whole-truck intent",
    /** Slice 9.5 — control hidden when pledged >= $120,000. */
    wholeTruckMet:
      "The campaign is fully funded at $120,000. The field is closed. Still nothing charged on this page.",
  },
  seatExclusivity: {
    heading: "One brand per trade",
    body: "Name your trade in one line. If another brand already holds that trade, you bid against them on the same panel — you do not open a second seat.",
    formHint:
      "One brand per trade. Challengers fight the same panel only.",
  },
  panels: {
    heading: "Bid on a Panel",
    leadLines: ["Select a panel below for more details."],
    lead: "Select a panel below for more details.",
    badgeEtch: "Immortal Etch Locked",
    badgeWrap: "Wrap only",
    /** Slice 10.9 — panel card standing line when no mark holds. */
    /** Slice 20.3 — print once, not on every open card. */
    standingOpen: "Open seat",
    gloss: PANEL_GLOSS,
  },
  howItWorks: {
    heading: "How it works",
    lead: TRUCK_OWNERSHIP_LINE,
    steps: [
      {
        title: "Pick a Panel",
        body: "Choose from 11 different available high visibility advertising spaces.",
      },
      {
        title: "Place a Bid",
        body: "Lock your bid to the board with a 20% down payment, processed securely through Stripe.",
      },
      {
        title: "Get on the Truck",
        body: "When the campaign ends, winning brands will have their approved ad printed on high quality vinyl wrap and proudly displayed on the truck for 12 full months.",
      },
    ],
  },
  etch: {
    heading: "Immortal Etch",
    unlockLines: [
      "Once total active bids cross $120,000, buyers will unlock the option to have their advertisement permanently etched on the stainless surface for 3x the final bid for that panel.",
      "Immortal Etch is only available on stainless steel panels.",
    ],
    unlock:
      "Once total active bids cross $120,000, buyers will unlock the option to have their advertisement permanently etched on the stainless surface for 3x the final bid for that panel. Immortal Etch is only available on stainless steel panels.",
    /** Seat-page art rules, restated once on the homepage Immortal Etch section. */
    requirements:
      "Immortal Etch artwork must use bold, simple shapes that can be permanently etched into stainless steel. Gradients, fine details, and very small text cannot be etched reliably. Final artwork will be reviewed before approval.",
    body: "Wrap is a year of film. Immortal Etch is a shallow frost of your mark in the stainless. It does not peel with the wrap. Nine steel faces. Unlocks once standing crosses $120,000.",
    whyBuyout:
      "Immortal Etch unlocks once standing crosses $120,000.",
    cost: "After Immortal Etch is installed there is no cash refund of that finish.",
    art: "One color, thick strokes, no gradients, no tiny type. If it cannot be cut, it does not ship.",
    forever: "Immortal Etch is forever.",
    sampleSlots: [
      {
        id: "hood",
        label: "Immortal Etch sample, front",
        src: "/etch-sample-hood.jpg",
        width: 1280,
        height: 861,
      },
      {
        id: "door",
        label: "Immortal Etch sample, side",
        src: "/etch-sample-door.jpg",
        width: 1280,
        height: 853,
      },
      {
        id: "tailgate",
        label: "Immortal Etch sample, rear",
        src: "/etch-sample-tailgate.jpg",
        width: 1280,
        height: 861,
      },
    ],
  },
  wreck: {
    heading: "Wreck & refund",
    /** Slice 20.8 — complete sentence, not a fragment. */
    lead: "Here is what happens if the campaign misses or the wrap year ends early.",
    items: [
      {
        id: "campaign-miss",
        q: "What if the board misses $58,000?",
        a: "Full refund. No order. No wrap.",
      },
      {
        id: "wrap-pro-rata",
        q: "What if the wrap year is cut short?",
        a: "Wrap lasts twelve months from install. If the truck is totaled or sold before month 12, wrap seats get a pro-rata refund for the months left.",
      },
    ],
  },
  questions: {
    heading: "FAQ",
    items: [
      {
        id: "truck-ownership",
        q: "Does the operator own the truck yet?",
        a: TRUCK_OWNERSHIP_LINE,
      },
      {
        q: "Is this Tesla?",
        a: "No. BrandMyBeast is independent. Cyberbeast is the trim this campaign funds. Tesla doesn’t run this, endorse it, or get a cut.",
      },
      {
        q: "What am I actually buying?",
        a: "A seat on the truck for your brand. There are eleven panels. Vinyl wrap is available on all of them. You’re buying the panel, the finish, and a year of miles. Not a follower count. Not a guaranteed number of views.",
      },
      {
        q: "How long is my brand on the truck?",
        a: "Wraps run twelve months from install.",
      },
      {
        q: "What if two of us are in the same business?",
        a: "One trade, one brand on the truck. Name your business when you bid. If that trade is already standing on a panel, that’s the seat you bid.",
      },
      {
        q: "How does payment work?",
        a: "Twenty percent of your bid is charged when you place it. That deposit is what makes a bid standing. Bid again on the same seat and deposits you already paid count toward the new one. Outbid deposits are refunded after the board closes. Miss $58,000 and every deposit is refunded. A winner's deposit is credited to the invoice. If the winner does not pay the rest within 7 days, the deposit is forfeited and the seat goes to the next bidder.",
      },
      {
        id: "outbid",
        q: "What if someone outbids me?",
        a: "You’re off that panel. The deposit you paid is refunded after the board closes. You can bid again on another seat, or come back at the new number on this one. A new bid on the same seat counts deposits you already paid.",
      },
      {
        q: "Can I take more than one panel?",
        a: "Yes. Pick whatever panels your business needs to maximize this advertising opportunity.",
      },
      {
        q: "What if I want every panel?",
        a: "Check the box on the contact form. That starts a whole-truck conversation. It does not buy the board from this page.",
      },
      {
        q: "Bonus: Immortal Etch",
        a: "It only applies if total bids pass $120,000. Then winners on the nine stainless steel panels can choose to have their mark permanently etched for 3x their final bid for that panel. Bumpers stay wrap. Etch artwork must be bold and simple and is reviewed before approval. Once installed there is no cash refund of that finish.",
      },
      {
        q: "Do I need finished artwork to bid?",
        a: "A name and a logo is enough to stand. Final files come after you win. Use a vector for wrap. Nothing gets cut until you’ve approved it.",
      },
      {
        id: "campaign-miss",
        q: "What if the $58,000 floor is missed?",
        a: "Every deposit is refunded. No order. No wrap.",
      },
      {
        id: "close-date",
        q: "When does this close?",
        a: FAQ_CLOSE_ANSWER,
      },
      {
        q: "Where does the truck actually run?",
        a: "Work miles in the Southeast. South Carolina most weeks (Charleston, Columbia, Greenville, Florence, Beaufort, Clemson and the roads between them), plus Atlanta, Charlotte, and the Florida panhandle when the job goes there.",
      },
      {
        q: "Will something I don’t want sitting next to my brand end up on this truck?",
        a: "No. We don’t take porn, hate, scams, or anything that can’t sit in a school line or a grocery lot. If you’re unsure about a category, email hello@brandmybeast.com before you bid.",
      },
      {
        q: "How do I start?",
        a: "Pick a panel. Twenty percent of the bid is charged when you place it. If you do not win, that deposit is refunded after close. A winner's deposit is credited to the invoice. Questions before that: hello@brandmybeast.com.",
      },
    ],
  },
  truckViews: {
    heading: "Preview the Panels",
    editedWith: "Edited with Higgsfield.ai and Grok Image",
  },
  waitlist: {
    heading: "Contact Us",
    lead: "",
    placeholder: "you@company.com",
    button: "Contact BMB",
    idleNote: `Bidding is open. Closes ${publishedCloseLabelEt()}.`,
    /** Slice 13.39 — privacy stub waitlist retention. */
    retention: "Waitlist retention: until seats open or user deletes.",
    success: "Thanks. We will be in touch.",
    already: "That email is already on the list.",
    /** Slice 6.5 — never imply join when the write did not land. */
    unavailable:
      "Waitlist is temporarily unavailable. You are not on the list yet.",
    failed: `That didn't send. Try again, or email ${BRAND.email}.`,
    /** Slice 6.6 — never claim joined on 429. */
    rateLimited:
      "Too many attempts. You are not on the list. Wait a moment and try again.",
    /** Slice 13.31 — disposable / blocked domain. */
    domainBlocked:
      "That email domain is blocked. You are not on the list. Use a lasting inbox.",
    /** Slice 16.0b — interest checkbox copy. Not pledged. Not on the vault bar. */
    wholeTruckCheckboxLabel: "I want the whole truck",
    wholeTruckCheckboxHint:
      "Check this box when contacting BMB for information about becoming the exclusive brand advertised on the entire vehicle.",
  },
  /**
   * Slice 12.17 — /signin copy. Not a homepage section.
   * Live mode HTML must never contain the string “test login”.
   */
  signIn: {
    heading: "Sign in",
    lead: "This page does not charge cards.",
    magicLinkHint:
      "We email a one-time link. No password. This page does not charge cards.",
    magicLinkButton: "Email me a sign-in link",
    credentialsButton: "Sign in",
    missingProvidersLead:
      "Live sign-in is on, but no providers are configured yet. The operator needs AUTH_SECRET, AUTH_URL, RESEND_API_KEY, and DATABASE_URL.",
    /** Slice 17.5 — live empty state. No env key names. */
    notOpenYet: "Sign-in is not open yet. Contact us. Nothing is charged.",
    /** AUTH_MODE=test only — never render under live. */
    testHint: "Use any @example.com email and the test password.",
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
    /** QA 1047PM — stainless seat chrome above Immortal Etch Locked. */
    wrapTwelveMonths: "Vinyl wrap for 12 months after installation.",
    /** QA 1047PM — bumper seats are wrap-only. */
    bumperWrapOnly: "Wrap only. Vinyl wrap for 12 months after installation.",
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
      `This seat is not on a soft-close extension. Bidding is open. Closes ${publishedCloseLabelEt()}. This page does not charge cards.`,
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
    etchMark: "Chemical frost on stainless",
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
  /**
   * Homepage bid desk. Informational until the money path is live.
   * Not a PUBLIC_COPY.md section. Never a card charge.
   */
  bidDesk: {
    dayHeading: "Day by day",
    dayEmpty: "No bids yet.",
    daySampleLead:
      "Sample history. No live bids yet. Standing figures here are not pledged. Nothing is charged.",
    dayLiveLead:
      "Every public mark, grouped by day (ET). The standing figure is what nobody has beaten. Nothing is charged.",
    heldBy: "Held by",
    topHeading: "Top brands",
    topEmpty: "No standing bids yet.",
    todayHeading: "Today's action",
    todayEmpty: "No bids today yet. Be the first.",
    openingFloor: "Opening floor",
    openingPrice: "Opening price",
    leaderboardLink: "Leaderboard",
    leaderboardHeading: "Leaderboard",
    leaderboardEvery: "Every bid ever placed, highest first.",
    leaderboardStay: "Outbid bids stay on this list.",
    leaderboardEmptyBefore: `No bids yet. Bidding is open. Closes ${publishedCloseLabelEt()}.`,
    leaderboardEmptyAfter: `No bids yet. Bidding is open. Closes ${publishedCloseLabelEt()}.`,
    leaderboardSeePanels: "See the panels",
    leaderboardRest: "The rest of the field",
    modalTitle: "Place a bid",
    closedLead: `Bidding is open. Closes ${publishedCloseLabelEt()}. No deposit is taken on this form. ${CLOSED_ASK}`,
    closedResult: `Bidding is open. Closes ${publishedCloseLabelEt()}. No deposit was taken. ${CLOSED_ASK}`,
    intentResult:
      "This mark stays intent only. No card was charged. The operator still approves artwork.",
    artwork: "We review every logo before it goes on the truck.",
    magicLink:
      "Manage a bid with a one-time email link. No password. This form does not charge a card.",
    depositChargeTemplate:
      "Deposit due now: {amount} ({percent}% of your bid), charged by Stripe.",
    depositMagicLink:
      "After your deposit goes through, we email you a link to manage your bid. No password needed.",
    coveredResult:
      "Earlier deposits on this seat cover this bid. It counts on the board.",
    trade: "Trade",
    tradeHint: "Your type of business, e.g. Roofing. One brand per trade.",
    placeBid: "Place bid",
    joinList: "Contact us",
    pending: "Pending",
    yourBid: "Your bid",
    brandName: "Brand name",
    website: "Website (optional)",
    /** Server placeDepositBid does not require a file. Label stays optional. */
    logo: "Logo (optional, you can send it later)",
    panel: "Panel",
    currentBid: "Current bid",
    minimumBid: "Minimum bid",
    viewSeat: "View this seat",
    contact: "Contact BMB",
  },
} as const;

/** Empty leaderboard line. Before OPEN_AT vs after. Not the live-charge flag. */
export function leaderboardEmptyCopy(nowMs: number = Date.now()): string {
  if (nowMs >= Date.parse(OPEN_AT)) {
    return PUBLIC_COPY.bidDesk.leaderboardEmptyAfter;
  }
  return PUBLIC_COPY.bidDesk.leaderboardEmptyBefore;
}
