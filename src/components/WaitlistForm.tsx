"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "created" | "exists" | "error";

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

      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        return;
      }

      setStatus(data.status === "exists" ? "exists" : "created");
      setMessage(
        data.status === "exists"
          ? "You are already on the list."
          : "You are on the list. We will email when seats open.",
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  const disabled = status === "loading";
  const showNext = status === "created" || status === "exists";

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
          placeholder="you@brand.com"
          disabled={disabled}
          data-testid="waitlist-email"
        />
        <button type="submit" disabled={disabled} data-testid="waitlist-submit">
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </button>
      </div>
      <p
        className={`waitlist-msg ${status === "error" ? "is-error" : "is-ok"}`}
        role="status"
        data-testid="waitlist-status"
      >
        {message || "Free to join. We will email when seats open."}
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
