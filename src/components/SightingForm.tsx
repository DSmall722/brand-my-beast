"use client";

import { FormEvent, useState } from "react";
import {
  SIGHTING_CORRIDORS,
  type SightingCorridorId,
} from "@/lib/sighting";

type Status = "idle" | "loading" | "created" | "exists" | "error";

function statusCopy(
  status: Exclude<Status, "idle" | "loading" | "error">,
): string {
  switch (status) {
    case "created":
      return "Sighting posted. After the truck exists — still no bounty, still no auto-tweet.";
    case "exists":
      return "That sighting is already on the board. Still no bounty.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function SightingForm() {
  const [corridorId, setCorridorId] = useState<SightingCorridorId>("sc");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/sighting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corridorId, note }),
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
      className="waitlist-form sighting-form"
      data-testid="sighting-form"
      noValidate
    >
      <fieldset className="circuit-story-corridors">
        <legend className="sr-only">Corridor</legend>
        <ul
          className="circuit-story-corridor-list"
          data-testid="sighting-corridors"
        >
          {SIGHTING_CORRIDORS.map((corridor) => (
            <li key={corridor.id}>
              <label className="circuit-story-corridor">
                <input
                  type="radio"
                  name="corridorId"
                  value={corridor.id}
                  checked={corridorId === corridor.id}
                  onChange={() => setCorridorId(corridor.id)}
                  disabled={disabled}
                  data-testid={`sighting-corridor-${corridor.id}`}
                />
                <span>{corridor.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <label className="sr-only" htmlFor="sighting-note">
        Sighting note
      </label>
      <textarea
        id="sighting-note"
        name="note"
        rows={2}
        maxLength={200}
        required
        minLength={4}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What you saw — no invented impressions"
        disabled={disabled}
        className="circuit-story-note"
        data-testid="sighting-note"
      />
      <button type="submit" disabled={disabled} data-testid="sighting-submit">
        {status === "loading" ? "Posting…" : "Post sighting"}
      </button>
      <p
        className={`waitlist-msg ${status === "error" ? "is-error" : "is-ok"}`}
        role="status"
        data-testid="sighting-status"
      >
        {message || "No bounty. No invented impressions. No auto-tweet."}
      </p>
    </form>
  );
}
