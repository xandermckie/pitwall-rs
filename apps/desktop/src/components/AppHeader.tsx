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
  onReset: () => void;
  isFullscreen: boolean;
  isFullscreenPending: boolean;
  fullscreenError: string | null;
  onFullscreenToggle: () => Promise<void>;
}

export function AppHeader({
  mode,
  canOpenRace,
  seed,
  inSafetyCar,
  isRaining,
  lastLap,
  onModeChange,
  onReset,
  isFullscreen,
  isFullscreenPending,
  fullscreenError,
  onFullscreenToggle,
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
        <span
          className="header-error"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {fullscreenError ?? ""}
        </span>
        <button
          className="btn btn-ghost"
          type="button"
          aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
          aria-pressed={isFullscreen}
          disabled={isFullscreenPending}
          onClick={() => void onFullscreenToggle()}
        >
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onReset}>
          New briefing
        </button>
      </div>
    </header>
  );
}
