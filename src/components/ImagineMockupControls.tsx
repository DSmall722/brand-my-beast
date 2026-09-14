"use client";

import { useActionState } from "react";
import {
  queueImagineMockupAction,
  type MockupActionState,
} from "@/app/actions/mockup";
import type { ImagineMockup } from "@/lib/mockup";

const initial: MockupActionState = { ok: false };

export function ImagineMockupControls({
  bidId,
  etchable,
  mockup,
}: {
  bidId: string;
  etchable: boolean;
  mockup: ImagineMockup | null;
}) {
  const [state, action, pending] = useActionState(
    queueImagineMockupAction,
    initial,
  );
  const current = state.mockup ?? mockup;

  return (
    <div
      className="imagine-mockup"
      data-testid={`imagine-mockup-${bidId}`}
      data-status={current?.status ?? "idle"}
    >
      {current ? (
        <div
          className="imagine-preview"
          data-testid={`imagine-preview-${bidId}`}
          data-preview-key={current.previewKey}
          data-finish={current.finish}
        >
          <span className="imagine-preview-brand">{current.brandLabel}</span>
          <span className="imagine-preview-meta">
            {current.finish === "etch" ? "Etch preview" : "Wrap preview"} ·{" "}
            {current.status}
          </span>
          <span className="imagine-preview-key">{current.previewKey}</span>
        </div>
      ) : (
        <p className="auth-hint" data-testid={`imagine-idle-${bidId}`}>
          No same-day mockup yet. Queue a wrap or etch placeholder — still no
          capture.
        </p>
      )}

      <form action={action} className="imagine-actions">
        <input type="hidden" name="bidId" value={bidId} />
        <input type="hidden" name="finish" value="wrap" />
        <button
          type="submit"
          className="btn btn-ghost"
          disabled={pending}
          data-testid={`imagine-queue-wrap-${bidId}`}
        >
          Queue wrap mockup
        </button>
      </form>
      <form action={action} className="imagine-actions">
        <input type="hidden" name="bidId" value={bidId} />
        <input type="hidden" name="finish" value="etch" />
        <button
          type="submit"
          className="btn btn-ghost"
          disabled={pending || !etchable}
          title={
            etchable
              ? "Etch placeholder — unlocks for real at buyout"
              : "Wrap-only panel"
          }
          data-testid={`imagine-queue-etch-${bidId}`}
        >
          Queue etch mockup
        </button>
      </form>
      {state.error ? (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="imagine-message">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
