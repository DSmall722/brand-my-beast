"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  submitWholeTruckIntent,
  type IntentActionState,
} from "@/app/actions/intent";
import { GOAL_USD, formatUsd } from "@/lib/campaign";
import { PUBLIC_COPY, wholeTruckPackageCopy } from "@/lib/public-copy";
import { intentFormMode, intentWaitlistOnlyCopy } from "@/lib/seats-open";

const initial: IntentActionState = { ok: false };

export function WholeTruckIntentForm({
  seatsOpen = true,
}: {
  /** Slice 14.17 — when false, waitlist-only (not CLOSE_AT). */
  seatsOpen?: boolean;
}) {
  const [state, action, pending] = useActionState(
    submitWholeTruckIntent,
    initial,
  );

  if (intentFormMode(seatsOpen) === "waitlist-only") {
    return (
      <div
        className="auth-hint"
        data-testid="whole-truck-waitlist-only"
        data-seats-open="false"
      >
        <p data-testid="whole-truck-waitlist-only-copy">
          {intentWaitlistOnlyCopy()}
        </p>
        <p>
          <Link href="/#contactus" data-testid="whole-truck-waitlist-only-link">
            Join the waitlist
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="auth-form"
      data-testid="whole-truck-intent-form"
      data-seats-open="true"
    >
      <label className="auth-label" htmlFor="whole-truck-brand">
        Brand label
      </label>
      <input
        id="whole-truck-brand"
        name="brandLabel"
        type="text"
        required
        minLength={2}
        maxLength={80}
        placeholder="Your brand"
        data-testid="whole-truck-brand"
        className="auth-input"
      />
      <label className="auth-label" htmlFor="whole-truck-trade">
        Trade (one brand on every panel)
      </label>
      <input
        id="whole-truck-trade"
        name="tradeLabel"
        type="text"
        required
        minLength={2}
        maxLength={80}
        placeholder="Your trade"
        data-testid="whole-truck-trade"
        className="auth-input"
      />
      <p className="hint" data-testid="whole-truck-amount">
        {PUBLIC_COPY.board.wholeTruckAmountLabel}: {formatUsd(GOAL_USD)}
      </p>
      <p className="hint" data-testid="whole-truck-package">
        {wholeTruckPackageCopy()}
      </p>
      <button
        type="submit"
        className="btn btn-signal"
        data-testid="whole-truck-submit"
        disabled={pending}
      >
        {pending ? "Listing…" : PUBLIC_COPY.board.wholeTruckCta}
      </button>
      {state.error ? (
        <p className="form-error" data-testid="whole-truck-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="form-success" data-testid="whole-truck-success">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
