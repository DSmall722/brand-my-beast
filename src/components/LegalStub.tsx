import Link from "next/link";
import type { ReactNode } from "react";
import {
  BRAND,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  PANELS,
  formatUsd,
} from "@/lib/campaign";
import {
  SOFT_CLOSE_MS,
  WINNER_PAY_MS,
  publishedCloseLabelEt,
} from "@/lib/campaign-window";

/**
 * Privacy and Terms shell. Back control is a real button.
 */
export function LegalStubShell({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <main className="shell auth-page legal-page" data-testid={testId}>
      <p className="eyebrow">{BRAND.name}</p>
      <h1>{title}</h1>
      <div className="section-lead legal-stub-body">{children}</div>
      <p className="auth-back">
        <Link
          href="/"
          className="btn btn-panel"
          data-testid="legal-back-button"
        >
          Back to the board
        </Link>
      </p>
    </main>
  );
}

/** Short useful privacy policy: what we collect, why, and how to reach us. */
export function PrivacyStubBody() {
  return (
    <>
      <p data-testid="privacy-collect">
        We collect the email address you submit on the waitlist or when you
        sign in, plus basic technical logs needed to run the site (for example
        IP address, user agent, and request timing).
      </p>
      <h2>Bids</h2>
      <p data-testid="privacy-bids">
        When someone bids, we collect their name, email, brand name, the logo
        or creative they send, and bid amounts.
      </p>
      <h2>Payments</h2>
      <p data-testid="privacy-payments">
        Payments and deposits are processed by Stripe. We do not store full
        card numbers. Stripe handles card data under its own privacy policy (
        <a href="https://stripe.com/privacy">https://stripe.com/privacy</a>
        ).
      </p>
      <p data-testid="privacy-why">
        We use bid and brand information to run the auction, to show the
        leaderboard with brand names, and to contact winners. We also use
        waitlist and sign-in details to operate the board. We do not sell your
        personal information.
      </p>
      <p data-testid="privacy-providers">
        Providers that may process data on our behalf include our hosting and
        database vendors, email delivery for sign-in and waitlist mail, and
        analytics if enabled. They only receive what they need to perform that
        work.
      </p>
      <p data-testid="privacy-retention">
        Waitlist emails are kept until seats open or you ask us to delete them.
        Bid and brand information is kept while we run the auction and contact
        winners. Account data stays while your account is open. Server logs are
        kept only as long as needed for security and operations.
      </p>
      <p data-testid="privacy-access">
        To access or delete your information, email{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
      </p>
      <p data-testid="privacy-cookies">
        We use essential cookies for sign-in sessions. If analytics cookies are
        enabled, they help us understand aggregate traffic, not to sell ads.
      </p>
      <p data-testid="privacy-contact">
        Contact:{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
    </>
  );
}

/** Approved Terms of Use (2026-09-22). */
export function TermsStubBody() {
  return (
    <>
      <p data-testid="terms-intro">
        {BRAND.name} (&quot;we,&quot; &quot;us&quot;) operates {BRAND.domain}.
        By using the site, joining the waitlist, or placing a bid, you agree
        to these terms.
      </p>
      <h2>The product</h2>
      <p data-testid="terms-product">
        {BRAND.name} auctions advertising inventory on panels of a Tesla
        Cyberbeast (the &quot;Beast&quot;). Inventory may be vinyl wrap,
        Immortal Etch, or both, as shown for each seat. Buying a seat buys
        display space on the vehicle under the rules for that seat. It does
        not buy the truck, a share of the truck, or a guarantee of views,
        clicks, sales, or media coverage.
      </p>
      <h2>Eligibility</h2>
      <p data-testid="terms-eligibility">
        You must be at least 18 and able to form a binding contract. You are
        responsible for activity under your account. Attempts to manipulate
        the auction are not allowed.
      </p>
      <h2>Bids and payment</h2>
      <p data-testid="terms-bids">
        {BRAND.name} auctions {PANELS.length} panels. Opening prices are shown
        on each seat. Empty seats show an opening price, not a Current Bid.
        Displayed &quot;Current Bid&quot; amounts are standing marks on that
        seat. The {formatUsd(FLOOR_USD)} floor is the campaign total across
        seats, not a minimum on one bid. A bid is an offer to buy that seat at
        that price. A {DEPOSIT_PERCENT}% deposit via Stripe holds the seat. If
        you win, you owe the winning amount. The deposit applies toward that
        balance. Bidding closes {publishedCloseLabelEt()}. A bid in the last{" "}
        {SOFT_CLOSE_MS / 60000} minutes extends that close by{" "}
        {SOFT_CLOSE_MS / 60000} minutes. If you win, pay the remainder within{" "}
        {WINNER_PAY_MS / (24 * 60 * 60 * 1000)} days or the deposit is
        forfeited and the seat goes to the next bidder. We may also reject or
        cancel a win for prohibited content or fraud.
      </p>
      <h2>Artwork</h2>
      <p data-testid="terms-artwork">
        You must submit creative that you have the right to use. We may
        approve, reject, or require changes for fit, safety, legality, or
        brand standards. Banned or restricted categories (including illegal
        products, hate, and content we reasonably refuse) will not run.
        Approved artwork may be installed as wrap and/or etch per the seat.
        Vinyl wrap duration after installation is as stated on the seat or
        campaign materials. Immortal Etch unlocks only under the published
        etch rules and price thresholds.
      </p>
      <h2>Our role</h2>
      <p data-testid="terms-role">
        We run the board, collect payment as described, and coordinate install
        on the Beast. Schedules can slip for weather, shop capacity, vehicle
        availability, or artwork delays. We are not liable for lost business,
        reputational harm, or expected marketing results tied to the campaign.
      </p>
      <h2>Your content and our marks</h2>
      <p data-testid="terms-marks">
        You keep ownership of your logos and creative. You grant us a license
        to display them on the Beast and to show them on the site and in
        campaign materials. {BRAND.name} names and marks stay ours. Do not
        imply endorsement beyond the paid display.
      </p>
      <h2>Privacy</h2>
      <p data-testid="terms-privacy">
        How we handle personal data is in the Privacy policy at{" "}
        <Link href="/privacy">/privacy</Link>.
      </p>
      <h2>Changes and contact</h2>
      <p data-testid="terms-changes">
        We may update these terms by posting a new version on this page.
        Continued use after a post means you accept the update. Questions:{" "}
        <a data-testid="terms-contact" href={`mailto:${BRAND.email}`}>
          {BRAND.email}
        </a>.
      </p>
      <h2>Governing law</h2>
      <p data-testid="terms-law">
        These terms are governed by the laws of the State of South Carolina,
        without regard to conflict-of-law rules. Venue for disputes is the
        state or federal courts serving Columbia, South Carolina, unless
        applicable law requires otherwise.
      </p>
    </>
  );
}
