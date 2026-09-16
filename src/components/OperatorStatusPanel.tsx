import {
  formatWaitlistCountLabel,
  type OperatorStatus,
} from "@/lib/operator-status";

/**
 * Slice 11.5 — DB ping + waitlist count on `/operator` only.
 * No public URL, no homepage link.
 */
export function OperatorStatusPanel({ status }: { status: OperatorStatus }) {
  return (
    <aside
      className="operator-status-panel"
      data-testid="operator-status-panel"
      data-db-status={status.db.status}
      aria-label="Operator status"
    >
      <p className="operator-status-panel-lead">
        Operator status — DB ping and waitlist count. Not a public URL.
      </p>
      <dl className="operator-status-panel-grid">
        <div>
          <dt>Database</dt>
          <dd data-testid="operator-status-db">{status.db.label}</dd>
        </div>
        <div>
          <dt>Waitlist</dt>
          <dd data-testid="operator-status-waitlist-count">
            {formatWaitlistCountLabel(status.waitlistCount)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
