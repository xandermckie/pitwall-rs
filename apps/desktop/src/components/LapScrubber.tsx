import type { JSX } from "react";

interface LapScrubberProps {
  lap: number;
  total: number;
  raceTime: number;
  duration: number;
  disabled: boolean;
  onScrub: (seconds: number) => void;
}

export function LapScrubber({
  lap,
  total,
  raceTime,
  duration,
  disabled,
  onScrub,
}: LapScrubberProps): JSX.Element {
  return (
    <div className="scrubber">
      <span>L{lap}</span>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        step={0.1}
        value={raceTime}
        disabled={disabled}
        aria-label="Race time timeline"
        onChange={(event) => onScrub(Number(event.target.value))}
      />
      <span>/ {total}</span>
    </div>
  );
}
