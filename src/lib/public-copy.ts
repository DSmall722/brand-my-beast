import { BRAND, CLOSE_AT, FLOOR_USD, OPEN_AT, PANELS, formatUsd } from "./campaign";
import { CLAIM_COPY } from "./panel-claim";
import { SOFT_CLOSE_MS, publishedCloseLabelEt } from "./campaign-window";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "./panel-board";
import { formatCampaignInstantEt } from "./seat-log";

const PANEL_GLOSS: Readonly<Record<string, string>> = {};

const TRUCK_OWNERSHIP_LINE =
  "Not yet. The campaign funds the purchase, so the truck is bought once the goal is met.";

const BID_OPENS_AT = formatCampaignInstantEt(OPEN_AT);
const CLOSED_ASK = `Questions? Use the Contact us form or email ${BRAND.email}.`;

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
    floorLabel: "Goal",
    floorHint: `Miss the ${formatUsd(FLOOR_USD)} goal and every deposit is refunded.`,
    clockWhenCloseNull:
      "Bidding is not open. Nothing is charged on this page.",
    depositLine:
      "20% of the bid is charged when you place it. If you do not win, that deposit is refunded after close. A winner's deposit is credited to the invoice. Nothing is charged on this page.",
    shortfallFloorLabel: "Short of goal",
    openSeatsLabel: "Open panels",
    vaultFloorMarkLabel: "Goal",
    vaultEmpty: "No marks yet",
    seatLegend: "Open seat = empty. Held seat = standing intent.",
    truckImageAlt: `Cybertruck with the ${PANELS.length} ad panels outlined`,
    wantAllPanels: "Buy the Whole Truck",
    wholeTruckHeading: "Whole truck — $120,000",
    wholeTruckLead:
      "One brand on every panel. Standing panel winners released. Nothing is charged on this page.",
    wholeTruckAmountLabel: "Fully funded mark",
    wholeTruckCta: "List a whole-truck intent",
    wholeTruckSignIn: "Sign in to list a whole-truck intent",
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
    leadLines: ["Pick a panel to place a bid."],
    lead: "Pick a panel to place a bid.",
    badgeEtch: "Immortal Etch Locked",
    badgeWrap: "Wrap only",
    standingOpen: "Open seat",
    gloss: PANEL_GLOSS,
  },
  howItWorks: {
    heading: "How it works",
    lead: "",
    steps: [
      {
        title: "Pick a Panel",
        body: "Choose from 11 high-visibility panels.",
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
    requirements:
      "Immortal Etch artwork must use bold, simple shapes that can be permanently etched into stainless steel. Gradients, fine details, and very small text cannot be etched reliably. Final artwork will be reviewed before approval.",
    body: "Wrap is a year of film. Immortal Etch is a shallow frost of your mark in the stainless. It does not peel with the wrap. Nine steel faces. Unlocks once standing crosses $120,000.",
    whyBuyout:
      "Immortal Etch unlocks once standing crosses $120,000.",
    cost: "After Immortal Etch is installed there is no cash refund of that finish.",
    art: "One color, thick strokes, no gradients, no tiny type. If it cannot be cut, it does not ship.",
    forever: "Immortal Etch is forever.",
  },
  wreck: {
    heading: "Wreck & refund",
    lead: "Here is what happens if the campaign misses or the wrap year ends early.",
    items: [
      {
        id: "campaign-miss",
        q: `What if the board misses ${formatUsd(FLOOR_USD)}?`,
        a: "Full refund. No order. No wrap.",
      },
      {
        id: "wrap-pro-rata",
        q: "What if the wrap year is cut short?",
        a: "Wrap lasts 12 months from install. If the truck is totaled or sold before month 12, wrap panels get a pro-rata refund for the months left.",
      },
    ],
  },
  questions: {
    heading: "FAQ",
    items: [
      {
        id: "claim-panel",
        q: CLAIM_COPY.faqClaim.q,
        a: CLAIM_COPY.faqClaim.a,
      },
      {
        id: "claim-when",
        q: CLAIM_COPY.faqWhen.q,
        a: CLAIM_COPY.faqWhen.a,
      },
      {
        id: "claim-short",
        q: CLAIM_COPY.faqShort.q,
        a: CLAIM_COPY.faqShort.a,
      },
      {
        id: "claim-outbid",
        q: CLAIM_COPY.faqOutbid.q,
        a: CLAIM_COPY.faqOutbid.a,
      },
      {
        id: "claim-trigger",
        q: CLAIM_COPY.faqTrigger.q,
        a: CLAIM_COPY.faqTrigger.a,
      },
      {
        id: "truck-ownership",
        q: "Does the operator own the truck yet?",
        a: TRUCK_OWNERSHIP_LINE,
      },
      {
        q: "Is this Tesla?",
        a: "BrandMyBeast is independent and not affiliated with Tesla.",
      },
      {
        q: "What am I actually buying?",
        a: "A panel on the truck for your brand. There are 11 panels. Vinyl wrap is available on all of them. You are buying the panel and 12 months across the Southeast. Not a follower count. Not a guaranteed number of views.",
      },
      {
        q: "How long is my brand on the truck?",
        a: "Wraps run 12 months from install.",
      },
      {
        q: "What if two of us are in the same business?",
        a: "One trade, one brand on the truck. Name your business when you bid. If another business in your trade already has a bid on a panel, you can only bid on that panel.",
      },
      {
        q: "How does payment work?",
        a: `20% of your bid is charged when you place it. That deposit is what makes a bid count. Bid again on the same panel and deposits you already paid count toward the new one. Outbid deposits are refunded after bidding ends. Miss ${formatUsd(FLOOR_USD)} and every deposit is refunded. A winner's deposit is credited to the invoice. If the winner does not pay the rest within 7 days, the deposit is forfeited and the panel goes to the next bidder.`,
      },
      {
        id: "outbid",
        q: "What if someone outbids me?",
        a: "You’re off that panel. The deposit you paid is refunded after bidding ends. You can bid again on another panel, or come back at the new number on this one. A new bid on the same panel counts deposits you already paid.",
      },
      {
        q: "Can I take more than one panel?",
        a: "Yes. Pick whatever panels your business needs to maximize this advertising opportunity.",
      },
      {
        q: "What if I want every panel?",
        a: "Check the box on the contact form and we'll reach out about the whole truck.",
      },
      {
        q: "Bonus: Immortal Etch",
        a: "It only applies if claims plus bids pass $120,000. Then winners on the nine stainless steel panels can choose to have their mark permanently etched for three times their final bid for that panel. Bumpers stay wrap. Etch artwork must be bold and simple and is reviewed before approval. Once installed there is no cash refund.",
      },
      {
        q: "Do I need finished artwork to bid?",
        a: "A name and logo are enough to bid. Final files come after you win. Use a vector for wrap. Nothing gets cut until you’ve approved it.",
      },
      {
        id: "campaign-miss",
        q: `What if the ${formatUsd(FLOOR_USD)} goal is missed?`,
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
        a: "Pick a panel. 20% of the bid is charged when you place it. If you do not win, that deposit is refunded after close. A winner's deposit is credited to the invoice. Questions before that: hello@brandmybeast.com.",
      },
    ],
  },
  truckViews: {
    heading: "Preview the Panels",
    editedWith: "Truck images are illustrations.",
  },
  waitlist: {
    heading: "Contact Us",
    lead: "",
    placeholder: "you@company.com",
    button: "Send",
    idleNote: `Bidding is open. Closes ${publishedCloseLabelEt()}.`,
    idleNoteBefore: "We only email when seats open.",
    retention: "Waitlist retention: until seats open or user deletes.",
    success: "Thanks. We will be in touch.",
    already: "That email is already on the list.",
    unavailable: `Could not send that. Try again or email ${BRAND.email}.`,
    failed: `That didn't send. Try again, or email ${BRAND.email}.`,
    rateLimited: `Could not send that. Try again or email ${BRAND.email}.`,
    domainBlocked: `Could not send that. Try again or email ${BRAND.email}.`,
    wholeTruckCheckboxLabel: "I want the whole truck",
    wholeTruckCheckboxHint:
      "Check this box when contacting BMB for information about becoming the exclusive brand advertised on the entire vehicle.",
  },
  signIn: {
    heading: "Sign in",
    lead: "This page does not charge cards.",
    magicLinkHint:
      "We email a one-time link. No password. This page does not charge cards.",
    magicLinkButton: "Email me a sign-in link",
    credentialsButton: "Sign in",
    missingProvidersLead:
      "Live sign-in is on, but no providers are configured yet. The operator needs AUTH_SECRET, AUTH_URL, RESEND_API_KEY, and DATABASE_URL.",
    notOpenYet: "Sign-in is not open yet. Contact us. Nothing is charged.",
    testHint: "Use any @example.com email and the test password.",
    checkEmailHeading: "Check your email",
    checkEmailSuccess:
      "If that address is valid, a sign-in link is on the way. The link expires soon. No card is charged on this path.",
    signOut: "Sign out",
  },
  seat: {
    openingRationale:
      `Opening marks start the seat. The goal is not the sum of openings. Bidding has to carry the board to ${formatUsd(FLOOR_USD)}.`,
    wrapTwelveMonths: "Vinyl wrap for 12 months after installation.",
    bumperWrapOnly: "Vinyl wrap for 12 months after installation.",
    withdrawSuccess: "Intent withdrawn. Still not charged.",
    withdrawButton: "Withdraw pending intent",
    failedWinnerWaitlist:
      "Stay on the waitlist. This page does not charge cards.",
    depositPreviewTemplate: "{percent}% of this mark is {amount}. Not charged.",
    failedWinnerLeadTemplate:
      "Failed-winner offer: re-list at {amount} — your last mark {last} + one increment (max($250, 10%)). Still not charged. No silent reopen.",
    failedWinnerExpired:
      "Failed-winner offer expired. Next compliant mark is up. No silent reopen.",
    winsEmpty:
      "No approved seats yet. Operator approval on a listed intent opens this sheet. Still no card charge.",
  },
  intent: {
    rateLimited:
      "Too many intent attempts. No new intent was listed. Wait a moment and try again.",
    seatsClosedWaitlistOnly:
      "Seats are not open for intent marks. Join the waitlist only. This page does not charge cards.",
    maintenanceNotTakingMarks:
      "Not taking marks. The board is up; intent listing is paused for maintenance. Still no card charge.",
  },
  panelExtension: {
    heading: "Soft-close extension",
    unset:
      `This seat is not on a soft-close extension. Bidding is open. Closes ${publishedCloseLabelEt()}. This page does not charge cards.`,
    unsetBefore:
      "This seat is not on a soft-close extension. Bidding is not open. This page does not charge cards.",
    setLead: "This seat's soft-close window runs until",
    setTail:
      "That is a seat extension only — not a campaign close date. This page does not charge cards.",
  },
  compositor: {
    modeWrap: "Wrap",
    modeEtch: "Etch",
    finishWrapEtchable: "Wrap on steel · etch at buyout",
    finishWrapOnly: "Wrap only",
    finishEtch: "Immortal Etch preview",
    wrapFilm: "Vinyl film layer",
    etchMark: "Chemical frost on stainless",
  },
  chrome: {
    backToBoard: "Back to the board",
  },
  footer: {
    line: "BrandMyBeast · @BrandMyBeast · hello@brandmybeast.com",
    independent: "Independent. Not Tesla.",
    intentNotACharge: "Intent is not a charge.",
  },
  bidDesk: {
    dayHeading: "Day by day",
    dayEmpty: "No bids yet.",
    daySampleLead:
      "Sample history. No live bids yet. Standing figures here are not pledged. Nothing is charged.",
    dayLiveLead:
      "Every public mark, grouped by day (ET). The standing figure is what nobody has beaten. Nothing is charged.",
    heldBy: "Held by",
    topHeading: "Top brands",
    topEmpty: "No bids yet.",
    todayHeading: "Today's action",
    todayEmpty: "No bids today yet. Be the first.",
    openingFloor: "Opening price",
    openingPrice: "Opening price",
    leaderboardLink: "Leaderboard",
    leaderboardHeading: "Leaderboard",
    leaderboardEvery: "Every bid ever placed, highest first.",
    leaderboardStay: "Outbid bids stay on this list.",
    leaderboardEmptyBefore: "No bids yet. Bidding opens Oct 6 at noon ET.",
    leaderboardEmptyAfter:
      "No bids yet. Be the first to put your brand on the Beast.",
    leaderboardSeePanels: "See the panels",
    leaderboardRest: "The rest of the field",
    modalTitle: "Place a bid",
    closedLead: `Bidding opens ${BID_OPENS_AT}. No deposit is taken on this form. ${CLOSED_ASK}`,
    closedResult: `Bidding opens ${BID_OPENS_AT}. No deposit was taken. ${CLOSED_ASK}`,
    intentResult:
      "This mark stays intent only. No card was charged. The operator still approves artwork.",
    artwork: "We review every logo before it goes on the truck.",
    magicLink: `Questions about your bid? Email ${BRAND.email}.`,
    depositChargeTemplate:
      "Deposit due now: {amount} ({percent}% of your bid), charged by Stripe.",
    depositMagicLink: `Questions about your bid? Email ${BRAND.email}.`,
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
    logo: "Logo (optional, you can send it later)",
    logoSend: `Winning brands send their logo to ${BRAND.email}.`,
    panel: "Panel",
    currentBid: "Current bid",
    minimumBid: "Minimum bid",
    viewSeat: "View this seat",
    contact: "Contact BMB",
  },
} as const;

export function moneyProgressCopy(pct: number): string {
  return `${pct}% of ${PUBLIC_COPY.board.floorLabel.toLowerCase()}`;
}

export function moneyVaultAria(empty: boolean, raised: string, goalAmount: string): string {
  const label = PUBLIC_COPY.board.vaultFloorMarkLabel;
  if (empty) return `${label} ${goalAmount}.`;
  return `${raised} toward the ${goalAmount} ${label.toLowerCase()}.`;
}

type CalendarCopyKind = "before_open" | "open" | "closed";

function calendarCopyKind(nowMs: number = Date.now()): CalendarCopyKind {
  const openMs = Date.parse(OPEN_AT);
  const closeMs = Date.parse(CLOSE_AT ?? "");
  if (Number.isFinite(openMs) && nowMs < openMs) return "before_open";
  if (Number.isFinite(closeMs) && nowMs >= closeMs) return "closed";
  return "open";
}

export function leaderboardEmptyCopy(nowMs: number = Date.now()): string {
  if (nowMs >= Date.parse(OPEN_AT)) {
    return PUBLIC_COPY.bidDesk.leaderboardEmptyAfter;
  }
  return PUBLIC_COPY.bidDesk.leaderboardEmptyBefore;
}

export function faqCloseAnswer(nowMs: number = Date.now()): string {
  const close = longCloseLabelEt(CLOSE_AT ?? "");
  const tail = `A bid in the last ${SOFT_CLOSE_MINUTES} minutes pushes the close back ${SOFT_CLOSE_MINUTES} minutes.`;
  const kind = calendarCopyKind(nowMs);
  if (kind === "closed") return `Bidding closed ${close}.`;
  if (kind === "before_open") return `Bidding closes ${close}. ${tail}`;
  return FAQ_CLOSE_ANSWER;
}

export function closedDeskLead(nowMs: number = Date.now()): string {
  if (calendarCopyKind(nowMs) === "closed") {
    return `Bidding closed ${publishedCloseLabelEt()}. No deposit is taken on this form. ${CLOSED_ASK}`;
  }
  return PUBLIC_COPY.bidDesk.closedLead;
}

export function closedDeskResult(nowMs: number = Date.now()): string {
  if (calendarCopyKind(nowMs) === "closed") {
    return `Bidding closed ${publishedCloseLabelEt()}. No deposit was taken. ${CLOSED_ASK}`;
  }
  return PUBLIC_COPY.bidDesk.closedResult;
}

export function panelExtensionUnsetCopy(nowMs: number = Date.now()): string {
  const kind = calendarCopyKind(nowMs);
  if (kind === "closed") {
    return `This seat is not on a soft-close extension. Bidding closed ${publishedCloseLabelEt()}. This page does not charge cards.`;
  }
  if (kind === "before_open") return PUBLIC_COPY.panelExtension.unsetBefore;
  return PUBLIC_COPY.panelExtension.unset;
}

export function waitlistIdleNote(nowMs: number = Date.now()): string {
  const kind = calendarCopyKind(nowMs);
  if (kind === "closed") return `Bidding closed ${publishedCloseLabelEt()}.`;
  if (kind === "before_open") return PUBLIC_COPY.waitlist.idleNoteBefore;
  return PUBLIC_COPY.waitlist.idleNote;
}
