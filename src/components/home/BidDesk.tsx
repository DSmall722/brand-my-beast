"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { formatUsd } from "@/lib/campaign";
import type { BidDeskMode, BidPanelQuote } from "@/lib/bid-desk";
import { tryDepositPreviewCopy } from "@/lib/deposit-preview";
import { PUBLIC_COPY } from "@/lib/public-copy";

type BidDeskContextValue = {
  openBid: (panelId: string) => void;
};

const BidDeskContext = createContext<BidDeskContextValue | null>(null);

export function useOpenBid(): (panelId: string) => void {
  const value = useContext(BidDeskContext);
  if (!value) {
    throw new Error("useOpenBid requires BidDeskProvider");
  }
  return value.openBid;
}

export function BidDeskProvider({
  quotes,
  mode,
  children,
}: {
  quotes: readonly BidPanelQuote[];
  mode: BidDeskMode;
  children: ReactNode;
}) {
  const [panelId, setPanelId] = useState<string | null>(null);
  const openBid = useMemo(
    () => (nextId: string) => {
      setPanelId(nextId);
    },
    [],
  );

  return (
    <BidDeskContext.Provider value={{ openBid }}>
      {children}
      {panelId ? (
        <BidModal
          quotes={quotes}
          mode={mode}
          panelId={panelId}
          onPanelId={setPanelId}
          onClose={() => setPanelId(null)}
        />
      ) : null}
    </BidDeskContext.Provider>
  );
}

function BidModal({
  quotes,
  mode,
  panelId,
  onPanelId,
  onClose,
}: {
  quotes: readonly BidPanelQuote[];
  mode: BidDeskMode;
  panelId: string;
  onPanelId: (panelId: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const quote = quotes.find((row) => row.id === panelId) ?? quotes[0] ?? null;
  const copy = PUBLIC_COPY.bidDesk;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!quote) return null;

  return (
    <div className="bid-modal-root" data-testid="bid-modal-root">
      <button
        type="button"
        className="bid-modal-backdrop"
        aria-label="Close bid"
        data-testid="bid-modal-backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bid-modal"
        data-testid="bid-modal"
        data-bid-window={mode.kind}
        data-panel-id={quote.id}
      >
        <div className="bid-modal-bar">
          <h2 id={titleId}>{copy.modalTitle}</h2>
          <button
            type="button"
            className="bid-modal-close"
            data-testid="bid-modal-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {mode.kind === "closed" ? (
          <p className="bid-modal-note" data-testid="bid-modal-closed">
            {copy.closedLead}
          </p>
        ) : null}

        <BidModalForm
          key={quote.id}
          quote={quote}
          quotes={quotes}
          mode={mode}
          onPanelId={onPanelId}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function placeBidOutcome(mode: BidDeskMode): "closed" | "intent" {
  switch (mode.kind) {
    case "closed":
      return "closed";
    case "intent":
      return "intent";
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}

function BidModalForm({
  quote,
  quotes,
  mode,
  onPanelId,
  onClose,
}: {
  quote: BidPanelQuote;
  quotes: readonly BidPanelQuote[];
  mode: BidDeskMode;
  onPanelId: (panelId: string) => void;
  onClose: () => void;
}) {
  const [yourBid, setYourBid] = useState(quote.minimumBidUsd);
  const [logoName, setLogoName] = useState("");
  const [outcome, setOutcome] = useState<"closed" | "intent" | null>(null);
  const copy = PUBLIC_COPY.bidDesk;
  const deposit = tryDepositPreviewCopy(yourBid);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(placeBidOutcome(mode));
  }

  return (
    <form className="bid-modal-form" onSubmit={onSubmit}>
      <label className="auth-label" htmlFor="bid-panel">
        {copy.panel}
      </label>
      <select
        id="bid-panel"
        className="auth-input"
        data-testid="bid-modal-panel"
        value={quote.id}
        onChange={(event) => onPanelId(event.target.value)}
      >
        {quotes.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>

      <dl className="bid-modal-money">
        <div>
          <dt>{copy.currentBid}</dt>
          <dd data-testid="bid-modal-current">{formatUsd(quote.currentBidUsd)}</dd>
        </div>
        <div>
          <dt>{copy.minimumBid}</dt>
          <dd data-testid="bid-modal-minimum">
            {formatUsd(quote.minimumBidUsd)}
          </dd>
        </div>
      </dl>

      <label className="auth-label" htmlFor="bid-amount">
        {copy.yourBid}
      </label>
      <input
        id="bid-amount"
        className="auth-input"
        data-testid="bid-modal-amount"
        type="number"
        min={quote.minimumBidUsd}
        step={1}
        required
        value={yourBid}
        onChange={(event) => {
          const next = Number(event.target.value);
          setYourBid(Number.isFinite(next) ? next : 0);
        }}
      />
      {deposit ? (
        <p className="auth-hint" data-testid="bid-modal-deposit">
          {deposit}
        </p>
      ) : null}

      <label className="auth-label" htmlFor="bid-brand">
        {copy.brandName}
      </label>
      <input
        id="bid-brand"
        className="auth-input"
        data-testid="bid-modal-brand"
        type="text"
        required
        minLength={2}
        maxLength={80}
        autoComplete="organization"
      />

      <label className="auth-label" htmlFor="bid-email">
        Email
      </label>
      <input
        id="bid-email"
        className="auth-input"
        data-testid="bid-modal-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@brand.com"
      />
      <p className="auth-hint" data-testid="bid-modal-magic">
        {copy.magicLink}
      </p>

      <label className="auth-label" htmlFor="bid-logo">
        {copy.logo}
      </label>
      <input
        id="bid-logo"
        className="auth-input"
        data-testid="bid-modal-logo"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setLogoName(file?.name ?? "");
        }}
      />
      {logoName ? (
        <p className="auth-hint" data-testid="bid-modal-logo-name">
          {logoName}
        </p>
      ) : null}
      <p className="auth-hint" data-testid="bid-modal-artwork">
        {copy.artwork}
      </p>

      <label className="auth-label" htmlFor="bid-website">
        {copy.website}
      </label>
      <input
        id="bid-website"
        className="auth-input"
        data-testid="bid-modal-website"
        type="url"
        placeholder="https://"
      />

      <div className="bid-modal-actions">
        <button
          type="submit"
          className="btn btn-signal"
          data-testid="bid-modal-submit"
        >
          {copy.placeBid}
        </button>
        <a className="btn btn-panel" href="#waitlist" onClick={onClose}>
          {copy.contact}
        </a>
        <Link
          className="nav-link"
          href={`/panels/${quote.id}`}
          data-testid="bid-modal-seat-link"
        >
          {copy.viewSeat}
        </Link>
      </div>

      {outcome === "closed" ? (
        <p className="bid-modal-note" role="status" data-testid="bid-modal-result">
          {copy.closedResult}
        </p>
      ) : null}
      {outcome === "intent" ? (
        <p className="bid-modal-note" role="status" data-testid="bid-modal-result">
          {copy.intentResult}
        </p>
      ) : null}
    </form>
  );
}
