import type { AppMode } from "../types/sim";
import type { JSX } from "react";

interface AppHeaderProps {
  mode: AppMode;
  canOpenRace: boolean;
  seed: number | null;
  inSafetyCar: boolean;
  isRaining: boolean;
  lastLap: boolean;
  onModeChange: (mode: AppMode) => void;
  onPause: () => void;
  isPaused: boolean;
  pauseDisabled: boolean;
  speedMs: number;
  onSpeedChange: (ms: number) => void;
  onReset: () => void;
}

export function AppHeader({
  mode,
  canOpenRace,
  seed,
  inSafetyCar,
  isRaining,
  lastLap,
  onModeChange,
  onPause,
  isPaused,
  pauseDisabled,
  speedMs,
  onSpeedChange,
  onReset,
}: AppHeaderProps): JSX.Element {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <div className="brand-name">PITWALL</div>
          <div className="brand-sub">Strategy desk · Rust engine</div>
        </div>
      </div>

      <nav className="mode-tabs" aria-label="App modes">
        <button className={`mode-tab ${mode === "briefing" ? "active" : ""}`} onClick={() => onModeChange("briefing")} type="button">
          Briefing
        </button>
        <button className={`mode-tab ${mode === "race" ? "active" : ""}`} onClick={() => onModeChange("race")} type="button" disabled={!canOpenRace}>
          Race
        </button>
        <button className={`mode-tab ${mode === "analysis" ? "active" : ""}`} onClick={() => onModeChange("analysis")} type="button" disabled={!canOpenRace}>
          Analysis
        </button>
      </nav>

      <div className="header-meta">
        {lastLap ? <span className="last-flag">LAST LAP</span> : null}
        {inSafetyCar ? <span className="sc-flag">SAFETY CAR</span> : null}
        {isRaining && !inSafetyCar ? <span className="rain-flag">RAIN</span> : null}
        {seed !== null ? <span>SEED {seed}</span> : null}
      </div>

      <div className="header-actions">
        <select
          className="btn"
          value={speedMs}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          aria-label="Playback speed"
          disabled={!canOpenRace}
        >
          <option value={900}>Slow</option>
          <option value={400}>Normal</option>
          <option value={120}>Fast</option>
          <option value={30}>Ultra</option>
        </select>
        <button className="btn" type="button" onClick={onPause} disabled={pauseDisabled}>
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onReset}>
          New briefing
        </button>
      </div>
    </header>
  );
}
