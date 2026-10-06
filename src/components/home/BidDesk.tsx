"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { track } from "@vercel/analytics";
import { DEPOSIT_PERCENT, formatUsd } from "@/lib/campaign";
import type { BidDeskMode, BidPanelQuote } from "@/lib/bid-desk";
import { depositUsdForMark } from "@/lib/intent";
import { panelDisplayName } from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Public panel id only. Swallow errors so analytics cannot break a bid. */
function trackPanel(name: "bid_start" | "deposit_checkout", panelId: string) {
  try {
    track(name, { panelId });
  } catch {
    // ponytail: library throw must not reach submit or checkout
  }
}

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
  const openerRef = useRef<HTMLElement | null>(null);
  const closeBid = useCallback(() => setPanelId(null), []);
  const openBid = useMemo(
    () => (nextId: string) => {
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement ? active : null;
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
          openerRef={openerRef}
          onPanelId={setPanelId}
          onClose={closeBid}
        />
      ) : null}
    </BidDeskContext.Provider>
  );
}

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    ),
  ].filter((el) => el.tabIndex !== -1);
}

function trapTab(event: ReactKeyboardEvent<HTMLElement>, root: HTMLElement) {
  if (event.key !== "Tab") return;
  const items = focusableIn(root);
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !root.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function BidModal({
  quotes,
  mode,
  panelId,
  openerRef,
  onPanelId,
  onClose,
}: {
  quotes: readonly BidPanelQuote[];
  mode: BidDeskMode;
  panelId: string;
  openerRef: RefObject<HTMLElement | null>;
  onPanelId: (panelId: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const quote = quotes.find((row) => row.id === panelId) ?? quotes[0] ?? null;
  const copy = PUBLIC_COPY.bidDesk;
  const hideSeatLink = pathname === `/panels/${quote?.id ?? ""}`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const previousHtml = html.style.overflow;
    const previousBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const opener = openerRef.current;
    const root = dialogRef.current;
    const amount = root?.querySelector<HTMLElement>(
      "[data-testid='bid-modal-amount']",
    );
    const closeBtn = root?.querySelector<HTMLElement>(
      "[data-testid='bid-modal-close']",
    );
    (amount ?? closeBtn)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = previousHtml;
      document.body.style.overflow = previousBody;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [onClose, openerRef]);

  if (!quote) return null;

  return (
    <div className="bid-modal-root" data-testid="bid-modal-root">
      <button
        type="button"
        tabIndex={-1}
        className="bid-modal-backdrop"
        aria-label="Close bid"
        data-testid="bid-modal-backdrop"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bid-modal"
        data-testid="bid-modal"
        data-bid-window={mode.kind}
        data-panel-id={quote.id}
        onKeyDown={(event) => {
          if (dialogRef.current) trapTab(event, dialogRef.current);
        }}
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

        {mode.kind === "closed" ? (
          <ClosedBidNotice
            quote={quote}
            quotes={quotes}
            hideSeatLink={hideSeatLink}
            onPanelId={onPanelId}
            onClose={onClose}
          />
        ) : (
          <BidModalForm
            key={quote.id}
            quote={quote}
            quotes={quotes}
            mode={mode}
            hideSeatLink={hideSeatLink}
            onPanelId={onPanelId}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function ClosedBidNotice({
  quote,
  quotes,
  hideSeatLink,
  onPanelId,
  onClose,
}: {
  quote: BidPanelQuote;
  quotes: readonly BidPanelQuote[];
  hideSeatLink: boolean;
  onPanelId: (panelId: string) => void;
  onClose: () => void;
}) {
  const copy = PUBLIC_COPY.bidDesk;
  return (
    <div className="bid-modal-form" data-testid="bid-modal-closed-fields">
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
            {panelDisplayName(row.name)}
          </option>
        ))}
      </select>
      <dl className="bid-modal-money">
        <div>
          <dt>{quote.hasStanding ? copy.currentBid : copy.openingPrice}</dt>
          <dd data-testid="bid-modal-current">{formatUsd(quote.currentBidUsd)}</dd>
        </div>
        <div>
          <dt>{copy.minimumBid}</dt>
          <dd data-testid="bid-modal-minimum">
            {formatUsd(quote.minimumBidUsd)}
          </dd>
        </div>
      </dl>
      <div className="bid-modal-actions">
        <a
          className="btn btn-signal"
          href="/#contactus"
          data-testid="bid-modal-join"
          onClick={onClose}
        >
          {copy.joinList}
        </a>
        {hideSeatLink ? null : (
          <Link
            className="nav-link"
            href={`/panels/${quote.id}`}
            data-testid="bid-modal-seat-link"
          >
            {copy.viewSeat}
          </Link>
        )}
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

function liveDepositLine(markUsd: number): string | null {
  if (!Number.isFinite(markUsd) || markUsd <= 0) return null;
  return PUBLIC_COPY.bidDesk.depositChargeTemplate
    .replace("{percent}", String(DEPOSIT_PERCENT))
    .replace("{amount}", formatUsd(depositUsdForMark(markUsd)));
}

/** Whole dollars only. Zero, negatives, and fractions are not a bid. */
function wholeDollarBid(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isInteger(amount) || amount <= 0) return null;
  return amount;
}

function bidFieldMessage(raw: string, minimumBidUsd: number): string | null {
  const amount = wholeDollarBid(raw);
  if (amount == null) return "Enter a bid in whole dollars.";
  if (amount < minimumBidUsd) {
    return `Minimum bid for this seat is ${formatUsd(minimumBidUsd)}.`;
  }
  return null;
}

function brandFieldMessage(raw: string): string | null {
  if (raw.trim() === "") return "Enter your brand name.";
  return null;
}

function BidModalForm({
  quote,
  quotes,
  mode,
  hideSeatLink,
  onPanelId,
  onClose,
}: {
  quote: BidPanelQuote;
  quotes: readonly BidPanelQuote[];
  mode: BidDeskMode;
  hideSeatLink: boolean;
  onPanelId: (panelId: string) => void;
  onClose: () => void;
}) {
  const [bidText, setBidText] = useState(String(quote.minimumBidUsd));
  const [brand, setBrand] = useState("");
  const [trade, setTrade] = useState("");
  const [email, setEmail] = useState("");
  const [logoName, setLogoName] = useState("");
  const [outcome, setOutcome] = useState<"closed" | "intent" | "covered" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const brandErrorId = useId();
  const amountErrorId = useId();
  const copy = PUBLIC_COPY.bidDesk;
  const amountMessage = bidFieldMessage(bidText, quote.minimumBidUsd);
  const brandMessage = brandFieldMessage(brand);
  const standingUsd = wholeDollarBid(bidText);
  const deposit =
    amountMessage == null && standingUsd != null
      ? liveDepositLine(standingUsd)
      : null;
  const ready =
    brandMessage == null &&
    brand.trim().length >= 2 &&
    amountMessage == null &&
    trade.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const depositUsd =
    amountMessage == null && standingUsd != null
      ? depositUsdForMark(standingUsd)
      : null;
  const submitLabel =
    depositUsd == null
      ? copy.placeBid
      : `Place bid · Pay ${formatUsd(depositUsd)} deposit`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || standingUsd == null) return;
    if (mode.kind !== "intent") {
      setOutcome(placeBidOutcome(mode));
      return;
    }
    trackPanel("bid_start", quote.id);
    const brandLabel = brand.trim();
    const tradeLabel = trade.trim();
    const emailValue = email.trim();
    setPending(true);
    setError(null);
    setOutcome(null);
    try {
      const response = await fetch("/api/bid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          panelId: quote.id,
          standingUsd,
          brandLabel,
          tradeLabel,
          email: emailValue,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        checkoutUrl?: string | null;
        covered?: boolean;
      };
      if (!response.ok || !body.ok) {
        setError(body.error ?? "Bid was not placed.");
        return;
      }
      if (body.checkoutUrl) {
        trackPanel("deposit_checkout", quote.id);
        window.location.assign(body.checkoutUrl);
        return;
      }
      setOutcome("covered");
    } catch {
      setError("Bid was not placed.");
    } finally {
      setPending(false);
    }
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
            {panelDisplayName(row.name)}
          </option>
        ))}
      </select>

      <dl className="bid-modal-money">
        <div>
          <dt>{quote.hasStanding ? copy.currentBid : copy.openingPrice}</dt>
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
        type="text"
        inputMode="decimal"
        required
        value={bidText}
        aria-invalid={amountMessage ? true : undefined}
        aria-describedby={amountMessage ? amountErrorId : undefined}
        onChange={(event) => setBidText(event.target.value)}
      />
      {amountMessage ? (
        <p
          id={amountErrorId}
          className="auth-error"
          data-testid="bid-modal-amount-error"
        >
          {amountMessage}
        </p>
      ) : null}
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
        name="brand"
        className="auth-input"
        data-testid="bid-modal-brand"
        type="text"
        required
        minLength={2}
        maxLength={80}
        autoComplete="organization"
        value={brand}
        aria-invalid={brandMessage ? true : undefined}
        aria-describedby={brandMessage ? brandErrorId : undefined}
        onChange={(event) => setBrand(event.target.value)}
      />
      {brandMessage ? (
        <p
          id={brandErrorId}
          className="auth-error"
          data-testid="bid-modal-brand-error"
        >
          {brandMessage}
        </p>
      ) : null}

      <label className="auth-label" htmlFor="bid-trade">
        {copy.trade}
      </label>
      <input
        id="bid-trade"
        name="trade"
        className="auth-input"
        data-testid="bid-modal-trade"
        type="text"
        required
        minLength={2}
        maxLength={80}
        value={trade}
        onChange={(event) => setTrade(event.target.value)}
      />
      <p className="auth-hint" data-testid="bid-modal-trade-hint">
        {copy.tradeHint}
      </p>

      <label className="auth-label" htmlFor="bid-email">
        Email
      </label>
      <input
        id="bid-email"
        className="auth-input"
        name="email"
        data-testid="bid-modal-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@brand.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <p className="auth-hint" data-testid="bid-modal-magic">
        {copy.depositMagicLink}
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
          disabled={pending || !ready}
        >
          {submitLabel}
        </button>
        <a className="btn btn-panel" href="/#contactus" onClick={onClose}>
          {copy.contact}
        </a>
        {hideSeatLink ? null : (
          <Link
            className="nav-link"
            href={`/panels/${quote.id}`}
            data-testid="bid-modal-seat-link"
          >
            {copy.viewSeat}
          </Link>
        )}
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
      {outcome === "covered" ? (
        <p className="bid-modal-note" role="status" data-testid="bid-modal-result">
          {copy.coveredResult}
        </p>
      ) : null}
      {error ? (
        <p className="bid-modal-note" role="status" data-testid="bid-modal-result">
          {error}
        </p>
      ) : null}
    </form>
  );
}
