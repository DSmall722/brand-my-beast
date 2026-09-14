"use client";

import { useState } from "react";
import { EtchConstraintLinter } from "@/components/EtchConstraintLinter";
import {
  GOAL_USD,
  formatUsd,
  isEtchable,
  type Panel,
} from "@/lib/campaign";
import { DIRTY_CLEAN_PAIR_LEAD } from "@/lib/dirty-clean-pair";
import {
  FINISH_CONDITIONS,
  type FinishCondition,
} from "@/lib/finish-conditions";
import {
  STAINLESS_COMPOSITOR_LEAD,
  compositorFinishLabel,
  type CompositorFinish,
} from "@/lib/stainless-compositor";

type FinishMode = CompositorFinish;

/**
 * PROCESS-safe stainless compositor: CSS preview of wrap vs etch on the steel
 * face, plus day/night/wet/dirty condition shaders and a dirty-vs-clean pair.
 * Etch stays preview-only until buyout — no capture, no clock.
 */
export function PanelMockup({ panel }: { panel: Panel }) {
  const etchable = isEtchable(panel);
  const [mode, setMode] = useState<FinishMode>("wrap");
  const [condition, setCondition] = useState<FinishCondition>("day");
  const [pair, setPair] = useState(false);
  const showingEtch = etchable && mode === "etch";

  return (
    <div
      className="panel-mockup stainless-compositor"
      data-testid="panel-mockup"
      data-panel={panel.id}
      data-etchable={etchable ? "true" : "false"}
      data-finish={showingEtch ? "etch" : "wrap"}
      data-condition={condition}
      data-pair={pair ? "true" : "false"}
    >
      <p
        className="auth-hint stainless-compositor-lead"
        data-testid="stainless-compositor-lead"
      >
        {STAINLESS_COMPOSITOR_LEAD}
      </p>
      <div
        className="compositor-toolbar"
        data-testid="stainless-compositor"
        role="group"
        aria-label="Stainless finish preview"
      >
        <button
          type="button"
          className={
            mode === "wrap" ? "compositor-tab is-active" : "compositor-tab"
          }
          data-testid="compositor-mode-wrap"
          aria-pressed={mode === "wrap"}
          onClick={() => setMode("wrap")}
        >
          Wrap
        </button>
        <button
          type="button"
          className={
            mode === "etch" ? "compositor-tab is-active" : "compositor-tab"
          }
          data-testid="compositor-mode-etch"
          aria-pressed={mode === "etch"}
          disabled={!etchable}
          title={
            etchable
              ? `Etch preview — unlocks at ${formatUsd(GOAL_USD)}`
              : "This panel is wrap only"
          }
          onClick={() => {
            if (etchable) setMode("etch");
          }}
        >
          Etch
        </button>
      </div>

      <div
        className="compositor-conditions"
        data-testid="finish-conditions"
        role="group"
        aria-label="Finish condition shaders"
      >
        {FINISH_CONDITIONS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={
              condition === row.id
                ? "compositor-condition is-active"
                : "compositor-condition"
            }
            data-testid={`finish-condition-${row.id}`}
            aria-pressed={condition === row.id}
            title={row.hint}
            onClick={() => setCondition(row.id)}
          >
            {row.label}
          </button>
        ))}
        <button
          type="button"
          className={
            pair ? "compositor-condition is-active" : "compositor-condition"
          }
          data-testid="dirty-clean-pair-toggle"
          aria-pressed={pair}
          onClick={() => setPair((open) => !open)}
        >
          Pair
        </button>
      </div>
      <p className="auth-hint dirty-clean-pair-lead" data-testid="dirty-clean-pair-lead">
        {DIRTY_CLEAN_PAIR_LEAD}
      </p>

      {pair ? (
        <div className="dirty-clean-pair" data-testid="dirty-clean-pair">
          <div
            className="pair-half"
            data-condition="day"
            data-testid="dirty-clean-clean"
          >
            <div className="panel-mockup-face" aria-hidden="true">
              <span className="panel-mockup-label">{panel.name}</span>
              <span className="compositor-condition-label">Clean</span>
              <span
                className="compositor-shader"
                data-testid="dirty-clean-clean-shader"
                data-condition="day"
              />
            </div>
          </div>
          <div
            className="pair-half"
            data-condition="dirty"
            data-testid="dirty-clean-dirty"
          >
            <div className="panel-mockup-face" aria-hidden="true">
              <span className="panel-mockup-label">{panel.name}</span>
              <span className="compositor-condition-label">Dirty</span>
              <span
                className="compositor-shader"
                data-testid="dirty-clean-dirty-shader"
                data-condition="dirty"
              />
            </div>
          </div>
        </div>
      ) : (
      <div className="panel-mockup-face" aria-hidden="true">
        <span className="panel-mockup-label">{panel.name}</span>
        <span
          className="panel-mockup-finish"
          data-testid="compositor-finish-label"
        >
          {compositorFinishLabel(showingEtch ? "etch" : "wrap", etchable)}
        </span>
        <span
          className="compositor-condition-label"
          data-testid="finish-condition-label"
        >
          {FINISH_CONDITIONS.find((row) => row.id === condition)?.hint}
        </span>
        {showingEtch ? (
          <span
            className="compositor-etch-mark"
            data-testid="compositor-etch-mark"
          >
            Laser on stainless
          </span>
        ) : (
          <span
            className="compositor-wrap-film"
            data-testid="compositor-wrap-film"
          >
            Vinyl film layer
          </span>
        )}
        <span
          className="compositor-shader"
          data-testid="finish-condition-shader"
          data-condition={condition}
        />
      </div>
      )}
      {showingEtch ? <EtchConstraintLinter /> : null}
    </div>
  );
}
