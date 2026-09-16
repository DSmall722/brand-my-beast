"use client";

import { useActionState } from "react";
import {
  submitRetryMailDeadLetter,
  type MailDeadLetterActionState,
} from "@/app/actions/mail-dead-letter";

const initial: MailDeadLetterActionState = { ok: false };

export function RetryMailDeadLetterButton({
  deadLetterId,
}: {
  deadLetterId: string;
}) {
  const [state, action, pending] = useActionState(
    submitRetryMailDeadLetter,
    initial,
  );

  return (
    <form action={action} className="operator-inline-form">
      <input type="hidden" name="deadLetterId" value={deadLetterId} />
      <button
        type="submit"
        className="btn"
        disabled={pending}
        data-testid={`mail-dead-letter-retry-${deadLetterId}`}
      >
        {pending ? "Retrying…" : "Retry send"}
      </button>
      {state.error ? (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="auth-hint" data-testid="mail-dead-letter-retry-ok">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
