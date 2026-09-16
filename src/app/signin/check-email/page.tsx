import Link from "next/link";
import { BRAND } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 12.39 — check-email success line from PUBLIC_COPY. */
export default function CheckEmailPage() {
  const copy = PUBLIC_COPY.signIn;
  return (
    <main className="shell auth-page" data-testid="check-email-page">
      <p className="eyebrow">{BRAND.name}</p>
      <h1 data-testid="check-email-heading">{copy.checkEmailHeading}</h1>
      <p className="section-lead" data-testid="check-email-success">
        {copy.checkEmailSuccess}
      </p>
      <p className="auth-back">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </main>
  );
}
