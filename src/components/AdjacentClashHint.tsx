"use client";

import { useMemo } from "react";
import {
  findAdjacentClashes,
  type AdjacentSeatHolder,
} from "@/lib/panel-clash";

export function AdjacentClashHint({
  panelId,
  brandLabel,
  neighbors,
}: {
  panelId: string;
  brandLabel: string;
  neighbors: readonly AdjacentSeatHolder[];
}) {
  const clashes = useMemo(
    () => findAdjacentClashes({ panelId, brandLabel, neighbors }),
    [panelId, brandLabel, neighbors],
  );

  if (clashes.length === 0) return null;

  return (
    <div
      className="adjacent-clash-hint"
      data-testid="adjacent-clash-hint"
      data-severity="warn"
      role="status"
    >
      <p className="adjacent-clash-title">Adjacent panel clash</p>
      <ul className="adjacent-clash-list">
        {clashes.map((clash) => (
          <li
            key={`${clash.panelId}-${clash.reason}`}
            data-testid={`adjacent-clash-${clash.panelId}`}
          >
            {clash.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdjacentNeighborsCard({
  neighbors,
}: {
  neighbors: readonly AdjacentSeatHolder[];
}) {
  return (
    <div className="adjacent-neighbors" data-testid="adjacent-neighbors">
      <p className="adjacent-neighbors-title">Adjacent seats</p>
      {neighbors.length === 0 ? (
        <p className="auth-hint" data-testid="adjacent-neighbors-empty">
          No standing intents on neighboring panels yet.
        </p>
      ) : (
        <ul
          className="adjacent-neighbors-list"
          data-testid="adjacent-neighbors-list"
        >
          {neighbors.map((n) => (
            <li key={n.panelId} data-testid={`adjacent-neighbor-${n.panelId}`}>
              <a href={`/panels/${n.panelId}`}>{n.panelName}</a>
              {" · "}
              <strong>{n.brandLabel}</strong>
              {" · "}
              {n.tradeLabel}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
