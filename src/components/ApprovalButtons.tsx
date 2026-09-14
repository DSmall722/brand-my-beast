"use client";

import { useActionState } from "react";
import {
  decideIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";

const initial: IntentActionState = { ok: false };

export function ApprovalButtons({ bidId }: { bidId: string }) {
  const [state, action, pending] = useActionState(decideIntentBid, initial);

  return (
    <div className="approval-actions" data-testid={`approval-actions-${bidId}`}>
      <label className="auth-label" htmlFor={`approval-note-${bidId}`}>
        Operator note
      </label>
      <textarea
        id={`approval-note-${bidId}`}
        name="note"
        form={`approval-reject-${bidId}`}
        className="auth-input approval-note"
        rows={2}
        maxLength={280}
        placeholder="Required on reject — optional on approve"
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
