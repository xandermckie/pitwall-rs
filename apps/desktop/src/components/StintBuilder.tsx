import type { Compound, Stint } from "../types/sim";
import type { JSX } from "react";

interface StintBuilderProps {
  stints: Stint[];
  raceLaps: number;
  onChange: (stints: Stint[]) => void;
}

const COMPOUNDS: Compound[] = ["SOFT", "MEDIUM", "HARD", "INTER", "WET"];

export function StintBuilder({ stints, raceLaps, onChange }: StintBuilderProps): JSX.Element {
  const total = stints.reduce((sum, stint) => sum + stint.laps, 0);
  const drift = Math.abs(total - raceLaps);

  return (
    <div>
      <div className="stint-list">
        {stints.map((stint, index) => (
          <div className="stint-row" key={`stint-${index}-${stint.compound}`}>
            <span className="stint-label">STINT {index + 1}</span>
            <select
              value={stint.compound}
              onChange={(event) => {
                const next = stints.map((item, i) =>
                  i === index ? { ...item, compound: event.target.value as Compound } : item,
                );
                onChange(next);
              }}
            >
              {COMPOUNDS.map((compound) => (
                <option key={compound} value={compound}>
                  {compound}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={3}
              max={78}
              value={stint.laps}
              onChange={(event) => {
                const next = stints.map((item, i) =>
                  i === index ? { ...item, laps: Number(event.target.value) } : item,
                );
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className={`stint-total ${drift > 3 ? "warn" : ""}`}>
        {total} / {raceLaps} laps{drift > 3 ? " — must be within 3 laps of race distance" : ""}
      </div>
    </div>
  );
}
