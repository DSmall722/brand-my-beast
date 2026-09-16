"use client";

import { useActionState } from "react";
import {
  decideIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";

const initial: IntentActionState = { ok: false };

export function ApprovalButtons({ bidId }: { bidId: string }) {
  const [state, action, pending] = useActionState(decideIntentBid, initial);
  const noteId = `approval-note-${bidId}`;
  const hintId = `approval-note-hint-${bidId}`;
  const errorId = `approval-error-${bidId}`;
  const noteDescribedBy = state.error ? `${hintId} ${errorId}` : hintId;

  return (
    <div className="approval-actions" data-testid={`approval-actions-${bidId}`}>
      <label className="auth-label" htmlFor={noteId}>
        Operator note
      </label>
      <p id={hintId} className="sr-only" data-testid={`approval-note-hint-${bidId}`}>
        Required on reject. Optional on approve.
      </p>
      <textarea
        id={noteId}
        name="note"
        form={`approval-reject-${bidId}`}
        className="auth-input approval-note"
        rows={2}
        maxLength={280}
        placeholder="Required on reject — optional on approve"
        aria-required="true"
        aria-invalid={state.error ? true : undefined}
        aria-describedby={noteDescribedBy}
        data-testid={`approval-note-${bidId}`}
      />
      <div className="approval-action-row">
        <form action={action}>
          <input type="hidden" name="bidId" value={bidId} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            className="btn btn-signal"
            disabled={pending}
            data-testid={`approve-${bidId}`}
          >
            Approve
          </button>
        </form>
        <form id={`approval-reject-${bidId}`} action={action}>
          <input type="hidden" name="bidId" value={bidId} />
          <input type="hidden" name="decision" value="rejected" />
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={pending}
            data-testid={`reject-${bidId}`}
          >
            Reject
          </button>
        </form>
      </div>
      {state.error ? (
        <p
          id={errorId}
          className="auth-error"
          role="alert"
          data-testid={`approval-error-${bidId}`}
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="approval-message">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
