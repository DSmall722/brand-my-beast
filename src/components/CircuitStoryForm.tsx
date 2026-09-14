"use client";

import { FormEvent, useState } from "react";
import {
  CIRCUIT_STORY_CORRIDORS,
  type CircuitStoryCorridorId,
} from "@/lib/circuit-story";

type Status = "idle" | "loading" | "created" | "exists" | "error";

function statusCopy(
  status: Exclude<Status, "idle" | "loading" | "error">,
): string {
  switch (status) {
    case "created":
      return "Circuit story request saved. After the truck exists — still no auto-tweet.";
    case "exists":
      return "That corridor request is already on the list. Still no auto-tweet.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function CircuitStoryForm() {
  const [email, setEmail] = useState("");
  const [corridorId, setCorridorId] = useState<CircuitStoryCorridorId>("sc");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/circuit-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, corridorId, note }),
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
      data-testid="circuit-story-form"
      noValidate
    >
      <label className="sr-only" htmlFor="circuit-story-email">
        Email
      </label>
      <div className="waitlist-row">
        <input
          id="circuit-story-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@brand.com"
          disabled={disabled}
          data-testid="circuit-story-email"
        />
      </div>
      <fieldset className="circuit-story-corridors">
        <legend className="sr-only">Corridor</legend>
        <ul
          className="circuit-story-corridor-list"
          data-testid="circuit-story-corridors"
        >
          {CIRCUIT_STORY_CORRIDORS.map((corridor) => (
            <li key={corridor.id}>
              <label className="circuit-story-corridor">
                <input
                  type="radio"
                  name="corridorId"
                  value={corridor.id}
                  checked={corridorId === corridor.id}
                  onChange={() => setCorridorId(corridor.id)}
                  disabled={disabled}
                  data-testid={`circuit-story-corridor-${corridor.id}`}
                />
                <span>{corridor.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <label className="sr-only" htmlFor="circuit-story-note">
        Optional note
      </label>
      <textarea
        id="circuit-story-note"
        name="note"
        rows={2}
        maxLength={200}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note — still no auto-tweet"
        disabled={disabled}
        className="circuit-story-note"
        data-testid="circuit-story-note"
      />
      <button
        type="submit"
        disabled={disabled}
        data-testid="circuit-story-submit"
      >
        {status === "loading" ? "Saving…" : "Request a circuit story"}
      </button>
      <p
        className={`waitlist-msg ${status === "error" ? "is-error" : "is-ok"}`}
        role="status"
        data-testid="circuit-story-status"
      >
        {message ||
          "After the truck exists. No invented impressions. No auto-tweet."}
      </p>
    </form>
  );
}
