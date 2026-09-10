import type { JSX } from "react";
interface LapScrubberProps {
  lap: number;
  total: number;
  disabled: boolean;
  onScrub: (lap: number) => void;
}

export function LapScrubber({ lap, total, disabled, onScrub }: LapScrubberProps): JSX.Element {
  return (
    <div className="scrubber">
      <span>L{lap}</span>
      <input
        type="range"
        min={1}
        max={Math.max(total, 1)}
        value={lap}
        disabled={disabled}
        aria-label="Race lap timeline"
        onChange={(event) => onScrub(Number(event.target.value))}
      />
      <span>/ {total}</span>
    </div>
  );
}
