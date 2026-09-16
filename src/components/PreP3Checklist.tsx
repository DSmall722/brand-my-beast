"use client";

import { useState } from "react";
import {
  PRE_P3_CHECKLIST,
  assertPreP3ChecklistDoesNotSetCloseAt,
} from "@/lib/pre-p3-checklist";
import { CLOSE_AT } from "@/lib/campaign";

/**
 * Slice 11.8 — Pre-P3 checklist on `/operator`.
 * Checkboxes are local prep only. They do not set CLOSE_AT.
 * Visible copy says “auction clock” so operator HTML stays free of the
 * CLOSE_AT token (slice 6.3 / 8.3 merge-gates).
 */
export function PreP3Checklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // Hard fence — checklist UI must never mutate campaign close.
      if (!assertPreP3ChecklistDoesNotSetCloseAt(Object.keys(next))) {
        return prev;
      }
      return next;
    });
  }

  return (
    <aside
      className="pre-p3-checklist"
      data-testid="pre-p3-checklist"
      data-auction-clock={CLOSE_AT === null ? "unset" : "set"}
      aria-label="Pre-P3 checklist"
    >
      <p className="pre-p3-checklist-lead">
        Pre-P3 checklist — LLC, terms, Resend, Stripe not wired. Checkboxes do
        not start the auction clock.
      </p>
      <ul className="pre-p3-checklist-list" data-testid="pre-p3-checklist-list">
        {PRE_P3_CHECKLIST.map((item) => {
          const inputId = `pre-p3-${item.id}`;
          const isOn = Boolean(checked[item.id]);
          return (
            <li key={item.id} data-testid={`pre-p3-item-${item.id}`}>
              <label htmlFor={inputId} className="pre-p3-checklist-label">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(item.id)}
                  data-testid={`pre-p3-check-${item.id}`}
                />
                <span>{item.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="auth-hint" data-testid="pre-p3-close-at-fence">
        Auction clock stays unset. Floor $58,000. Buyout $120,000. No Stripe
        capture.
      </p>
    </aside>
  );
}
