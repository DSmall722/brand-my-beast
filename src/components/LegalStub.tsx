import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND, FLOOR_USD, formatUsd } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

/**
 * Slice 7.9 — stub pages. Copy only from CAMPAIGN / PUBLIC_COPY / BRAND.
 * No invented legal terms.
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
  const miss = PUBLIC_COPY.wreck.items.find(
    (item) => item.id === "campaign-miss",
  );
  const buying = PUBLIC_COPY.questions.items.find(
    (item) => item.q === "What am I buying?",
  );
  const when = PUBLIC_COPY.questions.items.find(
    (item) => item.q === "When does bidding start?",
  );

  return (
    <>
      <p data-testid="terms-independent">{PUBLIC_COPY.footer.independent}</p>
      <p data-testid="terms-intent">
        {buying?.a} Cards are not charged until the money path is live. The
        current page only records intent.{" "}
        <span data-testid="terms-intent-not-charge">
          {PUBLIC_COPY.footer.intentNotACharge}
        </span>
      </p>
      <p data-testid="terms-floor">
        Floor {formatUsd(FLOOR_USD)}. {miss?.a}
      </p>
      <p data-testid="terms-clock">{when?.a}</p>
      <p data-testid="terms-contact">
        Questions:{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
    </>
  );
}
