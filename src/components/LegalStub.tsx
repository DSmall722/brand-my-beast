import Link from "next/link";
import type { ReactNode } from "react";
import { HomeFooter } from "@/components/home/HomeFooter";
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
    <>
    <main className="shell auth-page legal-page" data-testid={testId}>
      <p className="eyebrow">{BRAND.name}</p>
      <h1>{title}</h1>
      <p className="auth-hint" data-testid="legal-updated">
        Last updated: Oct 6, 2026
      </p>
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
    <HomeFooter />
    </>
  );
}

/** Short useful privacy policy: what we collect, why, and how to reach us. */
export function PrivacyStubBody() {
  return (
    <>
      <h2>What we collect</h2>
      <p data-testid="privacy-collect">
        We collect the email you send through the contact form or the bid
        form, plus basic technical logs (for example IP address, user agent,
        and request timing). Bid details are described under Bids.
      </p>
      <h2>Bids</h2>
      <p data-testid="privacy-bids">
        When you bid, we collect your email, brand name, trade (your type of
        business), website if you add one, the logo you upload, and your bid
        amounts. Stripe collects your payment details.
      </p>
      <h2>Payments</h2>
      <p data-testid="privacy-payments">
        Payments and deposits are processed by Stripe. We do not store full
        card numbers. Stripe handles card data under{" "}
        <a href="https://stripe.com/privacy">Stripe&apos;s privacy policy</a>.
      </p>
      <h2>How we use it</h2>
      <p data-testid="privacy-why">
        We use bid and brand information to run the auction, to show the
        leaderboard with brand names, and to contact winners. We reply to
        contact form messages. We do not sell your personal information.
      </p>
      <h2>Who processes it</h2>
      <p data-testid="privacy-providers">
        Providers that may process data on our behalf include hosting, the
        database, email delivery for bid and contact messages, and Stripe for
        payments. They only receive what they need to perform that work.
      </p>
      <h2>How long we keep it</h2>
      <p data-testid="privacy-retention">
        Contact emails are kept until we have answered or you ask us to delete
        them. Bid and brand information is kept while we run the auction and
        contact winners. Server logs are kept only as long as needed for
        security and operations.
      </p>
      <h2>Access and deletion</h2>
      <p data-testid="privacy-access">
        To access or delete your information, email{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
      </p>
      <h2>Cookies</h2>
      <p data-testid="privacy-cookies">
        We use only the cookies the site needs to work.
      </p>
      <h2>Contact</h2>
      <p data-testid="privacy-contact">
        Contact:{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
    </>
  );
}

/** Approved Terms of Use (2026-09-22). */
export function TermsStubBody() {
  const minutes = SOFT_CLOSE_MS / 60000;
  const days = WINNER_PAY_MS / (24 * 60 * 60 * 1000);
  return (
    <>
      <h2>Agreement</h2>
      <p data-testid="terms-intro">
        {BRAND.name} (&quot;we,&quot; &quot;us&quot;) operates {BRAND.domain}.
        By using the site, using the contact form, or placing a bid, you agree
        to these terms.
      </p>
      <h2>The product</h2>
      <p data-testid="terms-product">
        {BRAND.name} auctions advertising inventory on panels of a Tesla
        Cybertruck, Cyberbeast trim (the &quot;Beast&quot;). {BRAND.name} is
        not affiliated with or endorsed by Tesla, Inc. Inventory may be vinyl
        wrap,
        Immortal Etch, or both, as shown for each seat. Buying a seat buys
        display space on the vehicle under the rules for that seat. It does
        not buy the truck, a share of the truck, or a guarantee of views,
        clicks, sales, or media coverage.
      </p>
      <h2>Eligibility</h2>
      <p data-testid="terms-eligibility">
        You must be at least 18 and able to form a binding contract. You are
        responsible for bids placed with your email address. Attempts to
        manipulate the auction are not allowed.
      </p>
      <h2>Bids and payment</h2>
      <p data-testid="terms-bids">
        {`${BRAND.name} auctions ${PANELS.length} panels. Opening prices are shown on each seat. Each seat shows its opening price until someone bids. After that it shows the current high bid. The ${formatUsd(FLOOR_USD)} floor is the campaign total across seats, not a minimum on one bid. A bid is an offer to buy that seat at that price. A ${DEPOSIT_PERCENT}% deposit via Stripe holds the seat. If you are outbid, your deposit is refunded after bidding closes. If total standing bids are below ${formatUsd(FLOOR_USD)} when bidding closes, every deposit is refunded and no seats are sold. A new bid on the same seat counts deposits you already paid. Bidding closes ${publishedCloseLabelEt()}. A bid in the last ${minutes} minutes extends that close by ${minutes} minutes. If you win, pay the rest of your winning bid within ${days} days. Your deposit counts toward it. If you don't pay in time, the deposit is forfeited and the seat goes to the next-highest bidder, whose deposit is held until then. We may also reject or cancel a win for prohibited content or fraud.`}
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
        Read our <Link href="/privacy">Privacy policy</Link>.
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
