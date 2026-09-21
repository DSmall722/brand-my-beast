"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { WANT_WHOLE_TRUCK_EVENT } from "@/components/home/WantAllPanelsLink";
import { PUBLIC_COPY } from "@/lib/public-copy";

type Status = "idle" | "loading" | "created" | "exists" | "error";

const WAITLIST_STATUS_ID = "waitlist-status";
const WAITLIST_WHOLE_TRUCK_HINT_ID = "waitlist-want-whole-truck-hint";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [wantWholeTruck, setWantWholeTruck] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);

  // Slice 12.38 — restore focus to the status line after submit settles.
  useEffect(() => {
    if (status === "idle" || status === "loading") return;
    statusRef.current?.focus();
  }, [status]);

  useEffect(() => {
    function onWantWholeTruck() {
      setWantWholeTruck(true);
    }
    window.addEventListener(WANT_WHOLE_TRUCK_EVENT, onWantWholeTruck);
    return () => {
      window.removeEventListener(WANT_WHOLE_TRUCK_EVENT, onWantWholeTruck);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wantWholeTruck }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        status?: "created" | "exists";
        error?: string;
      };

      // Slice 6.5 — never paint success / "on the list" / "joined" unless ok.
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? PUBLIC_COPY.waitlist.failed);
        return;
      }

      setStatus(data.status === "exists" ? "exists" : "created");
      setMessage(
        data.status === "exists"
          ? PUBLIC_COPY.waitlist.already
          : PUBLIC_COPY.waitlist.success,
      );
      setEmail("");
      setWantWholeTruck(false);
    } catch {
      setStatus("error");
      setMessage(PUBLIC_COPY.waitlist.failed);
    }
  }

  const disabled = status === "loading";
  const showNext = status === "created" || status === "exists";
  const isError = status === "error";

  return (
    <form
      onSubmit={onSubmit}
      className="waitlist-form"
      data-testid="waitlist-form"
      noValidate
    >
      <label className="sr-only" htmlFor="waitlist-email">
        Email
      </label>
      <div className="waitlist-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={PUBLIC_COPY.waitlist.placeholder}
          disabled={disabled}
          aria-invalid={isError ? true : undefined}
          aria-describedby={WAITLIST_STATUS_ID}
          data-testid="waitlist-email"
        />
        <button type="submit" disabled={disabled} data-testid="waitlist-submit">
          {status === "loading" ? "Notifying…" : PUBLIC_COPY.waitlist.button}
        </button>
      </div>
      {/* Slice 16.0e — whole-truck interest checkbox. Not pledged. */}
      <label className="waitlist-whole-truck" htmlFor="waitlist-want-whole-truck">
        <input
          id="waitlist-want-whole-truck"
          name="wantWholeTruck"
          type="checkbox"
          checked={wantWholeTruck}
          onChange={(event) => setWantWholeTruck(event.target.checked)}
          disabled={disabled}
          aria-describedby={WAITLIST_WHOLE_TRUCK_HINT_ID}
          data-testid="waitlist-want-whole-truck"
        />
        <span>{PUBLIC_COPY.waitlist.wholeTruckCheckboxLabel}</span>
      </label>
      <p
        id={WAITLIST_WHOLE_TRUCK_HINT_ID}
        className="waitlist-whole-truck-hint"
        data-testid="waitlist-want-whole-truck-hint"
      >
        {PUBLIC_COPY.waitlist.wholeTruckCheckboxHint}
      </p>
      <p
        ref={statusRef}
        id={WAITLIST_STATUS_ID}
        className={`waitlist-msg ${isError ? "is-error" : "is-ok"}`}
        role={isError ? "alert" : "status"}
        tabIndex={-1}
        data-testid="waitlist-status"
      >
        {message}
      </p>
      {showNext ? (
        <p className="waitlist-next" data-testid="waitlist-next">
          Next:{" "}
          <a href="/#panels" data-testid="waitlist-browse-panels">
            browse panels
          </a>
          {" · "}
          stay on the list. Intent only — cards are not charged yet.
        </p>
      ) : null}
    </form>
  );
}
