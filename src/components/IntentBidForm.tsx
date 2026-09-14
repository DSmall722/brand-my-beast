"use client";

import { useActionState } from "react";
import {
  submitIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";
import { formatUsd } from "@/lib/campaign";

const initial: IntentActionState = { ok: false };

export function IntentBidForm({
  panelId,
  minimumUsd,
}: {
  panelId: string;
  minimumUsd: number;
}) {
  const [state, action, pending] = useActionState(submitIntentBid, initial);

  return (
    <form action={action} className="auth-form" data-testid="intent-bid-form">
      <input type="hidden" name="panelId" value={panelId} />
      <label className="auth-label" htmlFor="brandLabel">
        Brand label
      </label>
      <input
        id="brandLabel"
        name="brandLabel"
        type="text"
        required
        minLength={2}
        maxLength={80}
        placeholder="Your brand"
        data-testid="intent-brand"
        className="auth-input"
      />
      <label className="auth-label" htmlFor="standingUsd">
        Intent mark (USD)
      </label>
      <input
        id="standingUsd"
        name="standingUsd"
        type="number"
        min={minimumUsd}
        step={1}
        defaultValue={minimumUsd}
        required
        data-testid="intent-standing"
        className="auth-input"
      />
      <p className="auth-hint">
        Minimum {formatUsd(minimumUsd)}. 20% deposit is shown later — not
        charged on P2.
      </p>
      <button
        type="submit"
        className="btn btn-signal"
        disabled={pending}
        data-testid="intent-submit"
      >
        {pending ? "Listing…" : "List intent mark"}
      </button>
      {state.error ? (
        <p className="auth-error" data-testid="intent-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="intent-success">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
