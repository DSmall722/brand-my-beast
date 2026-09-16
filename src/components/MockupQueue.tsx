import Link from "next/link";
import { PANELS } from "@/lib/campaign";
import type { ImagineMockup } from "@/lib/mockup";

/**
 * Slice 10.4 — same-day Imagine placeholder queue on /operator.
 * Memory rows only. No billable Imagine call. No Stripe.
 */
export function MockupQueue({ mockups }: { mockups: ImagineMockup[] }) {
  return (
    <section
      className="mockup-queue"
      data-testid="mockup-queue"
      aria-labelledby="mockup-queue-heading"
    >
      <h2 id="mockup-queue-heading">Mockup queue</h2>
      <p className="auth-hint" data-testid="mockup-queue-lead">
        Same-day wrap / etch placeholders. Not billed. No Imagine API call.
      </p>
      {mockups.length === 0 ? (
        <p className="auth-hint" data-testid="mockup-queue-empty">
          No mockups queued yet. Queue one from a listed intent below.
        </p>
      ) : (
        <ul className="mockup-queue-list" data-testid="mockup-queue-list">
          {mockups.map((mockup) => {
            const panel = PANELS.find((row) => row.id === mockup.panelId);
            return (
              <li
                key={mockup.id}
                className="mockup-queue-row"
                data-testid={`mockup-queue-row-${mockup.bidId}`}
                data-bid-id={mockup.bidId}
                data-finish={mockup.finish}
                data-status={mockup.status}
                data-preview-key={mockup.previewKey}
              >
                <div className="mockup-queue-row-main">
                  <strong data-testid={`mockup-queue-brand-${mockup.bidId}`}>
                    {mockup.brandLabel}
                  </strong>
                  <span className="auth-hint">
                    <Link href={`/panels/${mockup.panelId}`}>
                      {panel?.name ?? mockup.panelId}
                    </Link>
                    {" · "}
                    {mockup.finish === "etch" ? "Etch" : "Wrap"}
                    {" · "}
                    {mockup.status}
                  </span>
                </div>
                <span
                  className="mockup-queue-badge"
                  data-testid={`mockup-queue-badge-${mockup.bidId}`}
                >
                  Placeholder — not billed
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
