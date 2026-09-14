"use client";

import { FormEvent, useState } from "react";
import {
  EVENT_REQUEST_KINDS,
  type EventRequestKindId,
} from "@/lib/event-request";

type Status = "idle" | "loading" | "created" | "exists" | "error";

function statusCopy(
  status: Exclude<Status, "idle" | "loading" | "error">,
): string {
  switch (status) {
    case "created":
      return "Event request saved. After the truck exists — still no livestream.";
    case "exists":
      return "That event request is already on the list. Still no livestream.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function EventRequestForm() {
  const [email, setEmail] = useState("");
  const [kindId, setKindId] = useState<EventRequestKindId>("shop-night");
  const [requestedDate, setRequestedDate] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/event-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, kindId, requestedDate, note }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        status?: "created" | "exists";
        error?: string;
      };

      if (!response.ok || !data.ok || !data.status) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        return;
      }

      setStatus(data.status);
      setMessage(statusCopy(data.status));
      setNote("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  const disabled = status === "loading";

  return (
    <form
      onSubmit={onSubmit}
      className="waitlist-form circuit-story-form"
      data-testid="event-calendar-form"
      noValidate
    >
      <label className="sr-only" htmlFor="event-calendar-email">
        Email
      </label>
      <div className="waitlist-row">
        <input
          id="event-calendar-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@brand.com"
          disabled={disabled}
          data-testid="event-calendar-email"
        />
      </div>
      <fieldset className="circuit-story-corridors">
        <legend className="sr-only">Event kind</legend>
        <ul
          className="circuit-story-corridor-list"
          data-testid="event-calendar-kinds"
        >
          {EVENT_REQUEST_KINDS.map((kind) => (
            <li key={kind.id}>
              <label className="circuit-story-corridor">
                <input
                  type="radio"
                  name="kindId"
                  value={kind.id}
                  checked={kindId === kind.id}
                  onChange={() => setKindId(kind.id)}
                  disabled={disabled}
                  data-testid={`event-calendar-kind-${kind.id}`}
                />
                <span>{kind.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <label className="sr-only" htmlFor="event-calendar-date">
        Requested day (optional)
      </label>
      <input
        id="event-calendar-date"
        name="requestedDate"
        type="date"
        value={requestedDate}
        onChange={(event) => setRequestedDate(event.target.value)}
        disabled={disabled}
        className="event-calendar-date"
        data-testid="event-calendar-date"
      />
      <label className="sr-only" htmlFor="event-calendar-note">
        Optional note
      </label>
      <textarea
        id="event-calendar-note"
        name="note"
        rows={2}
        maxLength={200}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note — still no livestream"
        disabled={disabled}
        className="circuit-story-note"
        data-testid="event-calendar-note"
      />
      <button
        type="submit"
        disabled={disabled}
        data-testid="event-calendar-submit"
      >
        {status === "loading" ? "Saving…" : "Request an event"}
      </button>
      <p
        className={`waitlist-msg ${status === "error" ? "is-error" : "is-ok"}`}
        role="status"
        data-testid="event-calendar-status"
      >
        {message ||
          "After the truck exists. No livestream. Requested day is not a close clock."}
      </p>
    </form>
  );
}
