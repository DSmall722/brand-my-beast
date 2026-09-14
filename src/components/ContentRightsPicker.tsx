"use client";

import { useActionState } from "react";
import {
  saveContentRightsPrefs,
  type ContentRightsActionState,
} from "@/app/actions/content-rights";
import {
  CONTENT_RIGHTS_LOCKS,
  CONTENT_RIGHT_OPTIONS,
  type ContentRightId,
} from "@/lib/content-rights";

const initial: ContentRightsActionState = { ok: false };

export function ContentRightsPicker({
  selected,
}: {
  selected: readonly ContentRightId[];
}) {
  const [state, action, pending] = useActionState(
    saveContentRightsPrefs,
    initial,
  );
  const selectedSet = new Set(selected);

  return (
    <section
      className="content-rights"
      aria-labelledby="content-rights-title"
      data-testid="content-rights"
    >
      <h2 id="content-rights-title" className="auth-subhead">
        Content rights
      </h2>
      <p className="auth-hint" data-testid="content-rights-lead">
        Preference only. Proof stills wait until the truck exists. Floor
        $58,000. Buyout $120,000.
      </p>
      <ul className="content-rights-locks" data-testid="content-rights-locks">
        {CONTENT_RIGHTS_LOCKS.map((lock) => (
          <li key={lock.id} data-testid={`content-lock-${lock.id}`}>
            {lock.text}
          </li>
        ))}
      </ul>
      <form action={action} className="content-rights-form">
        <ul className="content-rights-options">
          {CONTENT_RIGHT_OPTIONS.map((option) => (
            <li key={option.id}>
              <label className="content-rights-option">
                <input
                  type="checkbox"
                  name="rights"
                  value={option.id}
                  defaultChecked={selectedSet.has(option.id)}
                  data-testid={`content-right-${option.id}`}
                />
                <span>{option.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <button
          type="submit"
          className="btn btn-ghost"
          disabled={pending}
          data-testid="content-rights-save"
        >
          {pending ? "Saving…" : "Save content rights"}
        </button>
      </form>
      {state.error ? (
        <p className="auth-error" role="alert" data-testid="content-rights-error">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="content-rights-saved">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
