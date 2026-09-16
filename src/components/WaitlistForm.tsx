"use client";

import { FormEvent, useState } from "react";
import { PUBLIC_COPY } from "@/lib/public-copy";

type Status = "idle" | "loading" | "created" | "exists" | "error";

const WAITLIST_STATUS_ID = "waitlist-status";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      <p
        id={WAITLIST_STATUS_ID}
        className={`waitlist-msg ${isError ? "is-error" : "is-ok"}`}
        role={isError ? "alert" : "status"}
        data-testid="waitlist-status"
      >
        {message || PUBLIC_COPY.waitlist.idleNote}
      </p>
      {showNext ? (
        <p className="waitlist-next" data-testid="waitlist-next">
          Next:{" "}
          <a href="/#panels" data-testid="waitlist-browse-panels">
            browse panels
          </a>
          {" · "}
          <a
            href="/signin?callbackUrl=/panels/hood"
            data-testid="waitlist-signin-intent"
          >
            sign in to list an intent
          </a>
          . Intent only — cards are not charged yet.
        </p>
      ) : null}
    </form>
  );
}
