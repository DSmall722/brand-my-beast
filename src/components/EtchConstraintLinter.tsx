"use client";

import { useMemo, useState } from "react";
import {
  ETCH_CONSTRAINTS,
  lintEtchArtNotes,
} from "@/lib/etch-linter";

/**
 * Etch constraint checklist + optional art-notes lint (FEATURES P2 #18).
 */
export function EtchConstraintLinter() {
  const [notes, setNotes] = useState("");
  const report = useMemo(() => lintEtchArtNotes(notes), [notes]);

  return (
    <div
      className="etch-notes"
      data-testid="etch-constraints"
      data-severity={report.severity}
    >
      <p className="etch-notes-title">Etch constraints</p>
      <ul className="etch-constraint-list" data-testid="etch-constraint-list">
        {ETCH_CONSTRAINTS.map((rule) => (
          <li key={rule.id} data-testid={`etch-constraint-${rule.id}`}>
            <strong>{rule.label}</strong>
            <span>{rule.detail}</span>
          </li>
        ))}
      </ul>
      <label className="auth-label" htmlFor="etch-art-notes">
        Art notes
      </label>
      <textarea
        id="etch-art-notes"
        className="auth-input etch-art-notes"
        rows={3}
        maxLength={400}
        placeholder="e.g. single-line wordmark, bold sans, no fill"
        data-testid="etch-art-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      {report.severity !== "pass" ? (
        <ul
          className={`etch-lint-issues etch-lint-${report.severity}`}
          data-testid="etch-lint-issues"
        >
          {report.issues.map((issue) => (
            <li key={issue.id} data-testid={`etch-lint-${issue.id}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      ) : notes.trim() ? (
        <p className="auth-hint" data-testid="etch-lint-pass">
          Notes look etch-safe so far — still no capture.
        </p>
      ) : (
        <p className="auth-hint" data-testid="etch-lint-idle">
          Etch art is rejected if the notes fail the constraints. Wrap art may still list.
        </p>
      )}
    </div>
  );
}
