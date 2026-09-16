"use client";

import { useActionState, useState } from "react";
import {
  editPendingIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";
import { ARTWORK_MAX_DATA_URL_CHARS } from "@/lib/intent-artwork";

const initial: IntentActionState = { ok: false };

/** Slice 9.8 — edit brand / trade / art while pending (listed) only. */
export function EditPendingIntentForm({
  bidId,
  brandLabel,
  tradeLabel,
  artworkUrl,
  updatedAt,
}: {
  bidId: string;
  brandLabel: string;
  tradeLabel: string;
  artworkUrl: string | null;
  /** Slice 12.2 — optimistic lock token from the row the user loaded. */
  updatedAt: string;
}) {
  const [state, action, pending] = useActionState(
    editPendingIntentBid,
    initial,
  );
  const [brand, setBrand] = useState(brandLabel);
  const [trade, setTrade] = useState(tradeLabel);
  const [artUrl, setArtUrl] = useState(artworkUrl ?? "");
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
      setArtUrl("");
    };
    reader.onerror = () => {
      setLocalError("Could not read that image.");
      setArtworkUpload("");
      setUploadName("");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="intent-edit-pending"
      data-testid={`intent-edit-pending-${bidId}`}
    >
      <p className="auth-hint" data-testid={`intent-edit-lead-${bidId}`}>
        Edit brand, trade, or art while pending. Standing mark stays. Still not
        charged.
      </p>
      <form action={action} className="auth-form intent-edit-form">
        <input type="hidden" name="bidId" value={bidId} />
        <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
        <label className="auth-label" htmlFor={`edit-brand-${bidId}`}>
          Brand label
        </label>
        <input
          id={`edit-brand-${bidId}`}
          name="brandLabel"
          type="text"
          required
          minLength={2}
          maxLength={80}
          className="auth-input"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          data-testid={`intent-edit-brand-${bidId}`}
        />
        <label className="auth-label" htmlFor={`edit-trade-${bidId}`}>
          Trade
        </label>
        <input
          id={`edit-trade-${bidId}`}
          name="tradeLabel"
          type="text"
          required
          minLength={2}
          maxLength={80}
          className="auth-input"
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          data-testid={`intent-edit-trade-${bidId}`}
        />
        <label className="auth-label" htmlFor={`edit-art-url-${bidId}`}>
          Artwork URL (optional)
        </label>
        <input
          id={`edit-art-url-${bidId}`}
          name="artworkUrl"
          type="url"
          className="auth-input"
          value={artUrl}
          onChange={(e) => {
            setArtUrl(e.target.value);
            if (e.target.value) {
              setArtworkUpload("");
              setUploadName("");
            }
          }}
          data-testid={`intent-edit-artwork-url-${bidId}`}
        />
        <label className="auth-label" htmlFor={`edit-art-file-${bidId}`}>
          Or upload artwork
        </label>
        <input
          id={`edit-art-file-${bidId}`}
          type="file"
          accept="image/*"
          className="auth-input"
          data-testid={`intent-edit-artwork-file-${bidId}`}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        {uploadName ? (
          <p className="auth-hint" data-testid={`intent-edit-upload-name-${bidId}`}>
            Selected: {uploadName}
          </p>
        ) : null}
        <input type="hidden" name="artworkUpload" value={artworkUpload} />
        <label className="auth-check" htmlFor={`edit-clear-art-${bidId}`}>
          <input
            id={`edit-clear-art-${bidId}`}
            name="clearArtwork"
            type="checkbox"
            value="1"
            data-testid={`intent-edit-clear-art-${bidId}`}
          />{" "}
          Clear artwork
        </label>
        <button
          type="submit"
          className="btn btn-signal"
          disabled={pending}
          data-testid={`intent-edit-submit-${bidId}`}
        >
          Save pending edits
        </button>
      </form>
      {localError ? (
        <p
          className="auth-error"
          role="alert"
          data-testid={`intent-edit-local-error-${bidId}`}
        >
          {localError}
        </p>
      ) : null}
      {state.error ? (
        <p
          className="auth-error"
          role="alert"
          data-testid={`intent-edit-error-${bidId}`}
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          className="auth-hint"
          data-testid={`intent-edit-message-${bidId}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
