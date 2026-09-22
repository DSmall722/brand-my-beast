import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

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
    <main className="shell auth-page" data-testid={testId}>
      <p className="eyebrow">{BRAND.name}</p>
      <h1>{title}</h1>
      <div className="section-lead legal-stub-body">{children}</div>
      <p className="auth-back">
        <Link href="/">Back to the board</Link>
      </p>
    </main>
  );
}

export function PrivacyStubBody() {
  return (
    <>
      <p data-testid="privacy-contact">
        Contact:{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
      <p data-testid="privacy-waitlist">{PUBLIC_COPY.waitlist.idleNote}</p>
      <p data-testid="privacy-waitlist-retention">
        {PUBLIC_COPY.waitlist.retention}
      </p>
      <p data-testid="privacy-independent">{PUBLIC_COPY.footer.independent}</p>
      <p data-testid="privacy-identity">
        Public brand: {BRAND.name}. Public handle: {BRAND.handle}. Domain:{" "}
        {BRAND.domain}. Operator on this site is called {BRAND.operator}.
      </p>
    </>
  );
}

export function TermsStubBody() {
  return (
    <>
      <p data-testid="terms-intro">
        {BRAND.name} (&quot;we,&quot; &quot;us&quot;) operates {BRAND.domain}.
        By using the site, joining the waitlist, creating an account, or
        placing a bid, you agree to these terms.
      </p>
      <h2>The product</h2>
      <p data-testid="terms-product">
        {BRAND.name} auctions advertising inventory on panels of a Tesla
        Cybertruck (the &quot;Beast&quot;). Inventory may be vinyl wrap,
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
        Opening prices and buyout levels are shown on the board. Displayed
        &quot;Current Bid&quot; amounts are opening prices until a live bid is
        placed on that seat. A bid you place is an offer to buy that seat at
        that price. If you win, you owe the winning amount (or the buyout
        amount, if you buy out) under the payment instructions we send.
        Deposits shown on the board apply toward the balance when you win. If
        you win and do not pay the remaining balance as required, your deposit
        is non-refundable and the seat passes to the next highest bidder under
        the same payment rules. We may also reject or cancel a win for
        prohibited content or fraud.
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
