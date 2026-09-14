import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="shell auth-page" data-testid="check-email-page">
      <p className="eyebrow">BrandMyBeast</p>
      <h1>Check your email</h1>
      <p className="section-lead">
        If that address is valid, a sign-in link is on the way. The link expires
        soon. No card is charged on this path.
      </p>
      <p className="auth-back">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </main>
  );
}
