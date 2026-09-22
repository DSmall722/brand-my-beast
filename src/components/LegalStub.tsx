import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/campaign";

/**
 * Privacy page shell. Back control is a real button.
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

/** Short useful privacy policy — what we collect, why, and how to reach us. */
export function PrivacyStubBody() {
  return (
    <>
      <p data-testid="privacy-collect">
        We collect the email address you submit on the waitlist or when you
        sign in, plus basic technical logs needed to run the site (for example
        IP address, user agent, and request timing).
      </p>
      <p data-testid="privacy-why">
        We use that information to contact you when seats open, to keep your
        account working, and to operate and secure the board. We do not sell
        your personal information.
      </p>
      <p data-testid="privacy-providers">
        Providers that may process data on our behalf include our hosting and
        database vendors, email delivery for sign-in and waitlist mail, and
        analytics if enabled. They only receive what they need to perform that
        work.
      </p>
      <p data-testid="privacy-retention">
        Waitlist emails are kept until seats open or you ask us to delete them.
        Account data stays while your account is open. Server logs are kept only
        as long as needed for security and operations.
      </p>
      <p data-testid="privacy-access">
        To access or delete your information, email{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
      </p>
      <p data-testid="privacy-cookies">
        We use essential cookies for sign-in sessions. If analytics cookies are
        enabled, they help us understand aggregate traffic — not to sell ads.
      </p>
      <p data-testid="privacy-contact">
        Contact:{" "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
    </>
  );
}
