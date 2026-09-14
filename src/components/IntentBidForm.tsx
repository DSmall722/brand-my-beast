"use client";

import { useActionState, useState } from "react";
import {
  submitIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";
import { AdjacentClashHint } from "@/components/AdjacentClashHint";
import { HighwayLegibilityHint } from "@/components/HighwayLegibilityHint";
import { HometownLaneTags } from "@/components/HometownLaneTags";
import { formatUsd } from "@/lib/campaign";
import type { AdjacentSeatHolder } from "@/lib/panel-clash";

const initial: IntentActionState = { ok: false };

export function IntentBidForm({
  panelId,
  minimumUsd,
  adjacentNeighbors = [],
}: {
  panelId: string;
  minimumUsd: number;
  adjacentNeighbors?: readonly AdjacentSeatHolder[];
}) {
  const [state, action, pending] = useActionState(submitIntentBid, initial);
  const [brand, setBrand] = useState("");

  return (
    <form action={action} className="auth-form" data-testid="intent-bid-form">
      <input type="hidden" name="panelId" value={panelId} />
      <HometownLaneTags />
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
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />
      <HighwayLegibilityHint brandLabel={brand} finish="wrap" />
      <AdjacentClashHint
        panelId={panelId}
        brandLabel={brand}
        neighbors={adjacentNeighbors}
      />
      <label className="auth-label" htmlFor="tradeLabel">
        Trade (one brand per trade)
      </label>
      <input
        id="tradeLabel"
        name="tradeLabel"
        type="text"
        required
        minLength={2}
        maxLength={80}
        placeholder="e.g. cold brew"
        data-testid="intent-trade"
        className="auth-input"
      />
      <p className="auth-hint" data-testid="intent-trade-rule">
        One brand per trade. Challengers fight the same panel only — a held
        trade cannot open a second seat elsewhere.
      </p>
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
      <p className="auth-hint" data-testid="intent-amount-note">
        Amount is intent only. Minimum {formatUsd(minimumUsd)}. This page does
        not charge — the 20% deposit is shown later, never captured on P2.
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
