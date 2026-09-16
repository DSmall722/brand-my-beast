"use client";

import { FormEvent, useState } from "react";
import { cabinPlaqueUiAllowed } from "@/lib/cabin-plaque";

type Status = "idle" | "loading" | "created" | "exists" | "error";

function statusCopy(status: Exclude<Status, "idle" | "loading" | "error">): string {
  switch (status) {
    case "created":
      return "Name reserved for the cabin plaque.";
    case "exists":
      return "That name is already on the cabin plaque.";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function CabinPlaqueForm() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  if (!cabinPlaqueUiAllowed()) {
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/plaque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
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
      setName("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  const disabled = status === "loading";

  return (
    <form
      onSubmit={onSubmit}
      className="waitlist-form"
      data-testid="cabin-plaque-form"
      noValidate
    >
      <label className="sr-only" htmlFor="cabin-plaque-name">
        Cabin plaque name
      </label>
      <div className="waitlist-row">
        <input
          id="cabin-plaque-name"
          name="name"
          type="text"
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name on the cabin plaque"
          disabled={disabled}
          data-testid="cabin-plaque-name"
        />
        <button
          type="submit"
          disabled={disabled}
          data-testid="cabin-plaque-submit"
        >
          {status === "loading" ? "Saving…" : "Reserve name"}
        </button>
      </div>
      <p
        className={`waitlist-msg ${status === "error" ? "is-error" : "is-ok"}`}
        role="status"
        data-testid="cabin-plaque-status"
      >
        {message || "Reserve a name for the cabin. Free — not a panel bid."}
      </p>
    </form>
  );
}
