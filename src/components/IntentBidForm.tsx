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
import { ARTWORK_MAX_DATA_URL_CHARS } from "@/lib/intent-artwork";
import type { AdjacentSeatHolder } from "@/lib/panel-clash";
import { PUBLIC_COPY } from "@/lib/public-copy";

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
  const [artworkUrl, setArtworkUrl] = useState("");
  const [artworkUpload, setArtworkUpload] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

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
        defaultValue={minimumUsd}
        required
        data-testid="intent-standing"
        className="auth-input"
      />
      <p className="auth-hint" data-testid="intent-amount-note">
        Amount is intent only. Minimum {formatUsd(minimumUsd)}. This page does
        not charge — the 20% deposit is shown later, never captured on P2.
      </p>
      <p className="auth-hint" data-testid="intent-increment-rule">
        Next intent must be at least standing + max($250, 10%). The minimum
        above already applies that floor.
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
