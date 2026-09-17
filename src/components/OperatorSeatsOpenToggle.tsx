"use client";

import { useActionState } from "react";
import {
  submitSeatsOpenToggle,
  type SeatsOpenActionState,
} from "@/app/actions/seats-open";

const initial: SeatsOpenActionState = { ok: false };

/**
 * Slice 14.18 — operator SEATS_OPEN toggle. No date field. Never sets CLOSE_AT.
 */
export function OperatorSeatsOpenToggle({
  seatsOpen,
}: {
  seatsOpen: boolean;
}) {
  const [state, action, pending] = useActionState(
    submitSeatsOpenToggle,
    initial,
  );

  return (
    <aside
      className="operator-seats-open"
      data-testid="operator-seats-open-toggle"
      data-seats-open={seatsOpen ? "true" : "false"}
      aria-label="Seats open toggle"
    >
      <p className="auth-hint" data-testid="operator-seats-open-lead">
        Seats open — intent listing only. This toggle does not set a date and
        does not start the close clock.
      </p>
      <p
        className="auth-hint"
        data-testid="operator-seats-open-status"
        data-seats-open={seatsOpen ? "true" : "false"}
      >
        Currently: {seatsOpen ? "open" : "closed (waitlist only)"}
      </p>
      <div className="auth-actions">
        <form action={action}>
          <input type="hidden" name="seatsOpen" value="true" />
          <button
            type="submit"
            className="btn btn-signal"
            disabled={pending || seatsOpen}
            data-testid="operator-seats-open-on"
          >
            Open seats
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="seatsOpen" value="false" />
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={pending || !seatsOpen}
            data-testid="operator-seats-open-off"
          >
            Close seats
          </button>
        </form>
      </div>
      {state.error ? (
        <p className="auth-error" data-testid="operator-seats-open-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="operator-seats-open-message">
          {state.message}
        </p>
      ) : null}
    </aside>
  );
}
