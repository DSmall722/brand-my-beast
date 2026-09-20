"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  submitIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";
import { AdjacentClashHint } from "@/components/AdjacentClashHint";
import { HighwayLegibilityHint } from "@/components/HighwayLegibilityHint";
import { formatIntegerUsd, formatUsd } from "@/lib/campaign";
import { tryDepositPreviewCopy } from "@/lib/deposit-preview";
import { ARTWORK_MAX_DATA_URL_CHARS } from "@/lib/intent-artwork";
import type { AdjacentSeatHolder } from "@/lib/panel-clash";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { intentFormMode, intentWaitlistOnlyCopy } from "@/lib/seats-open";

const initial: IntentActionState = { ok: false };

export function IntentBidForm({
  panelId,
  minimumUsd,
  adjacentNeighbors = [],
  suggestedStandingUsd,
  suggestedBrand = "",
  suggestedTrade = "",
  seatsOpen = true,
}: {
  panelId: string;
  minimumUsd: number;
  adjacentNeighbors?: readonly AdjacentSeatHolder[];
  /** Slice 9.6 — failed-winner offer prefill (explicit; not silent). */
  suggestedStandingUsd?: number;
  suggestedBrand?: string;
  suggestedTrade?: string;
  /** Slice 14.17 — when false, form is waitlist-only (not CLOSE_AT). */
  seatsOpen?: boolean;
}) {
  const [state, action, pending] = useActionState(submitIntentBid, initial);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [brand, setBrand] = useState(suggestedBrand);
  const standingDefault = Math.max(
    minimumUsd,
    suggestedStandingUsd ?? minimumUsd,
  );
  const [standingUsd, setStandingUsd] = useState(standingDefault);
  const [artworkUrl, setArtworkUrl] = useState("");
  const [artworkUpload, setArtworkUpload] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const depositPreview = tryDepositPreviewCopy(standingUsd);

  if (intentFormMode(seatsOpen) === "waitlist-only") {
    return (
      <div
        className="auth-hint"
        data-testid="intent-waitlist-only"
        data-seats-open="false"
      >
        <p data-testid="intent-waitlist-only-copy">
          {intentWaitlistOnlyCopy()}
        </p>
        <p>
          <Link href="/#waitlist" data-testid="intent-waitlist-only-link">
            Join the waitlist
          </Link>
        </p>
      </div>
    );
  }

  function onFileChange(file: File | null) {
    setLocalError(null);
    if (!file) {
      setArtworkUpload("");
      setUploadName("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLocalError("Artwork upload must be an image file.");
      setArtworkUpload("");
      setUploadName("");
      return;
    }
    if (file.size > ARTWORK_MAX_DATA_URL_CHARS * 0.7) {
      setLocalError("Artwork upload is too large (keep under ~90KB).");
      setArtworkUpload("");
      setUploadName("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        setLocalError("Could not read that image.");
        setArtworkUpload("");
        setUploadName("");
        return;
      }
      if (result.length > ARTWORK_MAX_DATA_URL_CHARS) {
        setLocalError("Artwork upload is too large (keep under ~90KB).");
        setArtworkUpload("");
        setUploadName("");
        return;
      }
      setArtworkUpload(result);
      setUploadName(file.name);
      setArtworkUrl("");
    };
    reader.onerror = () => {
      setLocalError("Could not read that image.");
      setArtworkUpload("");
      setUploadName("");
    };
    reader.readAsDataURL(file);
  }

  return (
    <form
      action={action}
      className="auth-form"
      data-testid="intent-bid-form"
      data-seats-open="true"
    >
      <input type="hidden" name="panelId" value={panelId} />
      <input
        type="hidden"
        name="idempotencyKey"
        value={idempotencyKey}
        data-testid="intent-idempotency-key"
      />
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
        defaultValue={suggestedTrade}
      />
      <p className="auth-hint" data-testid="intent-trade-rule">
        {PUBLIC_COPY.seatExclusivity.formHint}
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
        value={standingUsd}
        required
        data-testid="intent-standing"
        className="auth-input"
        onChange={(e) => {
          const next = Number(e.target.value);
          setStandingUsd(Number.isFinite(next) ? next : 0);
        }}
      />
      {suggestedStandingUsd != null ? (
        <p className="auth-hint" data-testid="intent-failed-winner-prefill">
          Prefills the failed-winner offer {formatUsd(standingDefault)}. You
          still submit — no silent reopen. Not charged.
        </p>
      ) : null}
      {depositPreview ? (
        <p
          className="auth-hint"
          data-testid="intent-deposit-preview"
          data-deposit-mark={standingUsd}
        >
          {depositPreview}
        </p>
      ) : null}
      <p className="auth-hint" data-testid="intent-amount-note">
        Amount is intent only. Minimum {formatIntegerUsd(minimumUsd)}. This page does
        not charge cards — deposit is preview only on P2.
      </p>
      <p className="auth-hint" data-testid="intent-increment-rule">
        Next intent must be at least standing + max($250, 10%). The minimum
        above already applies that floor.
      </p>
      <label className="auth-label" htmlFor="proxyMaxUsd">
        Proxy max (USD, optional)
      </label>
      <input
        id="proxyMaxUsd"
        name="proxyMaxUsd"
        type="number"
        min={minimumUsd}
        step={1}
        data-testid="intent-proxy-max"
        className="auth-input"
      />
      <p className="auth-hint" data-testid="intent-proxy-note">
        Optional ceiling. If outbid, the agent steps standing + max($250, 10%)
        up to this max. Still intent only — no card on P2.
      </p>
      <label className="auth-check" htmlFor="floorSave">
        <input
          id="floorSave"
          name="floorSave"
          type="checkbox"
          value="1"
          data-testid="intent-floor-save"
        />{" "}
        Floor-save — if short of $58,000, raise this seat to the mark above
      </label>
      <p className="auth-hint" data-testid="intent-floor-save-note">
        Stored, not charged. Floor-save does not displace a standing holder
        until it fires. No card on P2.
      </p>

      <fieldset
        className="intent-artwork-fields"
        data-testid="intent-artwork-fields"
      >
        <legend className="auth-label">Artwork (optional)</legend>
        <p className="auth-hint" data-testid="intent-artwork-note">
          URL or a small image upload. Intent only — not a charge, not proof the
          truck exists.
        </p>
        <label className="auth-label" htmlFor="artworkUrl">
          Artwork URL
        </label>
        <input
          id="artworkUrl"
          name="artworkUrl"
          type="url"
          inputMode="url"
          placeholder="https://…"
          data-testid="intent-artwork-url"
          className="auth-input"
          value={artworkUrl}
          disabled={Boolean(artworkUpload)}
          onChange={(e) => {
            setArtworkUrl(e.target.value);
            if (e.target.value.trim()) {
              setArtworkUpload("");
              setUploadName("");
            }
          }}
        />
        <label className="auth-label" htmlFor="artworkFile">
          Or upload image
        </label>
        <input
          id="artworkFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          data-testid="intent-artwork-file"
          className="auth-input"
          disabled={Boolean(artworkUrl.trim())}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <input
          type="hidden"
          name="artworkUpload"
          value={artworkUpload}
          data-testid="intent-artwork-upload"
        />
        {uploadName ? (
          <p className="auth-hint" data-testid="intent-artwork-filename">
            Ready: {uploadName}
          </p>
        ) : null}
      </fieldset>

      <button
        type="submit"
        className="btn btn-signal"
        disabled={pending}
        data-testid="intent-submit"
      >
        {pending ? "Listing…" : "List intent mark"}
      </button>
      {localError ? (
        <p
          className="auth-error"
          data-testid="intent-artwork-local-error"
          role="alert"
        >
          {localError}
        </p>
      ) : null}
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
