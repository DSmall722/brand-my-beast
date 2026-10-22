"use client";

import { useState, type FormEvent } from "react";
import { CLAIM_COPY, claimDepositUsd } from "@/lib/panel-claim";
import type { ClaimStatus } from "@/lib/panel-claim";

export function PanelClaimBlock({
  panelId,
  panelName,
  claimUsd,
  status,
  claimable,
  claimedBrand,
  buyoutOpen,
}: {
  panelId: string;
  panelName: string;
  claimUsd: number;
  status: ClaimStatus;
  claimable: boolean;
  claimedBrand: string | null;
  buyoutOpen: boolean;
}) {
  const [brandLabel, setBrandLabel] = useState("");
  const [tradeLabel, setTradeLabel] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const depositUsd = claimDepositUsd(claimUsd);

  if (status === "claimed") {
    return (
      <section className="seat-claim" data-testid="panel-claim" data-claim-state="claimed">
        <p data-testid="panel-claim-claimed">
          {CLAIM_COPY.claimed(claimedBrand || "a brand")}
        </p>
      </section>
    );
  }

  if (status === "withdrawn") {
    return (
      <section className="seat-claim" data-testid="panel-claim" data-claim-state="withdrawn">
        <p data-testid="panel-claim-withdrawn">{CLAIM_COPY.withdrawn}</p>
      </section>
    );
  }

  if (!claimable) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          panelId,
          brandLabel,
          tradeLabel,
          email,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        checkoutUrl?: string | null;
      };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Claim was not placed.");
        return;
      }
      if (body.checkoutUrl) {
        window.location.assign(body.checkoutUrl);
        return;
      }
      window.location.reload();
    } catch {
      setError("Claim was not placed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="seat-claim" data-testid="panel-claim" data-claim-state="available">
      <h2 className="claim-heading" data-testid="panel-claim-heading">
        {CLAIM_COPY.availableHeading(panelName, claimUsd)}
      </h2>
      <p data-testid="claim-skips-line">{CLAIM_COPY.claimSkips}</p>
      <p data-testid="claim-funds-line">{CLAIM_COPY.allClaimFunds}</p>
      <p data-testid="panel-claim-lead">{CLAIM_COPY.availableDeposit(depositUsd)}</p>
      <p data-testid="panel-claim-lock">{CLAIM_COPY.availableLock}</p>
      <p>{CLAIM_COPY.availableRefund}</p>
      <form className="claim-form" onSubmit={onSubmit} data-testid="panel-claim-form">
        <label className="auth-label" htmlFor="claim-brand">
          Brand
          <input
            id="claim-brand"
            name="brandLabel"
            className="auth-input claim-input"
            required
            minLength={2}
            value={brandLabel}
            onChange={(event) => setBrandLabel(event.target.value)}
            data-testid="claim-brand"
          />
        </label>
        <label className="auth-label" htmlFor="claim-trade">
          Trade
          <input
            id="claim-trade"
            name="tradeLabel"
            className="auth-input claim-input"
            required
            minLength={2}
            aria-describedby="claim-trade-hint"
            value={tradeLabel}
            onChange={(event) => setTradeLabel(event.target.value)}
            data-testid="claim-trade"
          />
          <span id="claim-trade-hint" className="claim-field-hint">
            {CLAIM_COPY.tradeHint}
          </span>
        </label>
        <label className="auth-label" htmlFor="claim-email">
          Email
          <input
            id="claim-email"
            name="email"
            type="email"
            className="auth-input claim-input"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            data-testid="claim-email"
          />
        </label>
        <p className="claim-submit">
          <button
            type="submit"
            className="btn btn-signal"
            disabled={pending}
            data-testid="panel-claim-cta"
          >
            {CLAIM_COPY.availableCta}
          </button>
        </p>
        {error ? (
          <p className="form-error" role="alert" data-testid="panel-claim-error">
            {error}
          </p>
        ) : null}
      </form>
      {buyoutOpen ? (
        <p data-testid="whole-truck-buyout">{CLAIM_COPY.availableFoot}</p>
      ) : null}
    </section>
  );
}
