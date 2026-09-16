"use client";

import { useActionState } from "react";
import {
  decideIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";
import { GOAL_USD, formatUsd } from "@/lib/campaign";

const initial: IntentActionState = { ok: false };

/**
 * Slice 12.28 — approve may choose etch finish only when pledged >= buyout.
 */
export function ApprovalButtons({
  bidId,
  etchable = false,
  etchUnlocked = false,
}: {
  bidId: string;
  etchable?: boolean;
  etchUnlocked?: boolean;
}) {
  const [state, action, pending] = useActionState(decideIntentBid, initial);
  const noteId = `approval-note-${bidId}`;
  const hintId = `approval-note-hint-${bidId}`;
  const errorId = `approval-error-${bidId}`;
  const finishId = `approval-finish-${bidId}`;
  const noteDescribedBy = state.error ? `${hintId} ${errorId}` : hintId;

  return (
    <div className="approval-actions" data-testid={`approval-actions-${bidId}`}>
      <label className="auth-label" htmlFor={noteId}>
        Operator note
      </label>
      <p id={hintId} className="sr-only" data-testid={`note-required-hint-${bidId}`}>
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
      {etchable ? (
        <div
          className="approval-finish"
          data-testid={`approval-finish-${bidId}`}
          data-etch-unlocked={etchUnlocked ? "true" : "false"}
        >
          <label className="auth-label" htmlFor={finishId}>
            Finish on approve
          </label>
          <select
            id={finishId}
            name="finish"
            form={`approval-approve-${bidId}`}
            className="auth-input"
            defaultValue="wrap"
            data-testid={`approval-finish-select-${bidId}`}
          >
            <option value="wrap">Wrap</option>
            <option value="etch" disabled={!etchUnlocked}>
              Etch
              {!etchUnlocked
                ? ` (locked under ${formatUsd(GOAL_USD)})`
                : ""}
            </option>
          </select>
          {!etchUnlocked ? (
            <p
              className="auth-hint"
              data-testid={`approval-etch-locked-${bidId}`}
            >
              Etch finish stays locked while pledged is under{" "}
              {formatUsd(GOAL_USD)}.
            </p>
          ) : (
            <>
              <label className="auth-label" htmlFor={`etch-art-notes-${bidId}`}>
                Etch art notes
              </label>
              <textarea
                id={`etch-art-notes-${bidId}`}
                name="artNotes"
                form={`approval-approve-${bidId}`}
                className="auth-input approval-note"
                rows={2}
                maxLength={400}
                placeholder="1-color brief — no gradients / photo / 8-pt type"
                data-testid={`approval-etch-art-notes-${bidId}`}
              />
              <p
                className="auth-hint"
                data-testid={`approval-etch-lint-hint-${bidId}`}
              >
                Etch art is rejected if the linter fails. Wrap art may still
                list.
              </p>
            </>
          )}
        </div>
      ) : null}
      <div className="approval-action-row">
        <form id={`approval-approve-${bidId}`} action={action}>
          <input type="hidden" name="bidId" value={bidId} />
          <input type="hidden" name="decision" value="approved" />
          {!etchable ? (
            <input type="hidden" name="finish" value="wrap" />
          ) : null}
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
