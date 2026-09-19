import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { BRAND } from "@/lib/campaign";
import {
  CAN_SPAM_PHYSICAL_ADDRESS,
  CAN_SPAM_UNSUBSCRIBE_PATH,
} from "@/emails/can-spam";

/**
 * Slice 12.13 — CAN-SPAM unsubscribe stub. Preference center later.
 */
export default function UnsubscribePage() {
  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="unsubscribe-page"
        data-path={CAN_SPAM_UNSUBSCRIBE_PATH}
      >
        <h1>Unsubscribe</h1>
        <p className="section-lead">
          Email{" "}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> with subject
          “unsubscribe” to stop campaign notices. Intent marks are not a
          subscription.
        </p>
        <p className="auth-hint" data-testid="unsubscribe-physical-address">
          {CAN_SPAM_PHYSICAL_ADDRESS}
        </p>
        <p>
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}
