import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";
import { BRAND } from "@/lib/campaign";
import { confirmWaitlistByToken } from "@/lib/waitlist";

type SearchParams = Promise<{ token?: string | string[] }>;

/**
 * Slice 12.14 — waitlist double-opt-in confirm landing.
 */
export default async function WaitlistConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  const result = token
    ? await confirmWaitlistByToken(token)
    : {
        ok: false as const,
        error: "That confirm link is missing or expired.",
        code: "invalid" as const,
      };

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page"
        data-testid="waitlist-confirm-page"
        data-ok={result.ok ? "true" : "false"}
      >
        <h1>Waitlist confirm</h1>
        {result.ok ? (
          <p className="section-lead" data-testid="waitlist-confirm-ok">
            {result.status === "already"
              ? `${result.email} was already confirmed.`
              : `${result.email} is confirmed on the ${BRAND.name} waitlist.`}{" "}
            Intent only — no card charged.
          </p>
        ) : (
          <p className="section-lead" data-testid="waitlist-confirm-error">
            {result.error}
          </p>
        )}
        <p>
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}
