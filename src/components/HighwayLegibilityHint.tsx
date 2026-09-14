"use client";

import { useMemo, useState } from "react";
import {
  checkHighwayLegibility,
  type LegibilityFinish,
} from "@/lib/legibility";

export function HighwayLegibilityHint({
  brandLabel,
  finish = "wrap",
}: {
  brandLabel: string;
  finish?: LegibilityFinish;
}) {
  const report = useMemo(
    () => checkHighwayLegibility({ brandLabel, finish }),
    [brandLabel, finish],
  );

  if (!brandLabel.trim() || report.severity === "pass") {
    return null;
  }

  return (
    <div
      className={`legibility-hint legibility-${report.severity}`}
      data-testid="highway-legibility"
      data-severity={report.severity}
      role="status"
    >
      <p className="legibility-title">Highway legibility</p>
      <ul className="legibility-list">
        {report.issues.map((issue) => (
          <li key={issue.id} data-testid={`legibility-${issue.id}`}>
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Controlled brand field + live highway check for intent list. */
export function BrandLabelWithLegibility({
  finish = "wrap",
}: {
  finish?: LegibilityFinish;
}) {
  const [brand, setBrand] = useState("");

  return (
    <>
      <label className="auth-label" htmlFor="brandLabel">
        Brand label
      </label>
      <input
        id="brandLabel"
        name="brandLabel"
        type="text"
        required
        minLength={2}
        maxLength={80}
        placeholder="Your brand"
        data-testid="intent-brand"
        className="auth-input"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />
      <HighwayLegibilityHint brandLabel={brand} finish={finish} />
    </>
  );
}
