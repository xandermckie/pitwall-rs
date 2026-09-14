import type { JSX } from "react";
import { formatRaceClock, PLAYBACK_SPEEDS } from "../utils/playback";

interface PlaybackControlsProps {
  isPaused: boolean;
  speed: number;
  raceTime: number;
  onTogglePause: () => void;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
}

export function PlaybackControls({
  isPaused,
  speed,
  raceTime,
  onTogglePause,
  onSpeedChange,
  onRestart,
}: PlaybackControlsProps): JSX.Element {
  return (
    <section className="playback-controls" aria-label="Playback controls">
      <div className="playback-actions">
        <button
          className="playback-button playback-button-primary"
          type="button"
          onClick={onTogglePause}
          aria-label={isPaused ? "Play race" : "Pause race"}
          aria-pressed={!isPaused}
        >
          {isPaused ? "Play" : "Pause"}
        </button>
        <button
          className="playback-button"
          type="button"
          onClick={onRestart}
          aria-label="Restart race playback"
        >
          Restart
        </button>
      </div>

      <div className="playback-clock" aria-label="Elapsed race time">
        <span>Elapsed</span>
        <output>{formatRaceClock(raceTime)}</output>
      </div>

      <div className="speed-controls" role="group" aria-label="Playback speed">
        {PLAYBACK_SPEEDS.map((preset) => (
          <button
            className="speed-button"
            type="button"
            key={preset}
            onClick={() => onSpeedChange(preset)}
            aria-label={`Set playback speed to ${preset} times`}
            aria-pressed={speed === preset}
          >
            {preset}x
          </button>
        ))}
      </div>

      <div className="playback-shortcuts" aria-label="Keyboard shortcuts">
        <span><kbd>Space</kbd> play/pause</span>
        <span><kbd>←</kbd><kbd>→</kbd> lap</span>
      </div>
    </section>
  );
}
