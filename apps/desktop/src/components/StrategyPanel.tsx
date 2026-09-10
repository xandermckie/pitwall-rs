import type { Stint, TyreModel } from "../types/sim";
import type { JSX } from "react";

interface StrategyPanelProps {
  stints: Stint[];
  totalLaps: number;
  currentLap: number;
  tyreModel: TyreModel;
}

export function StrategyPanel({
  stints,
  totalLaps,
  currentLap,
  tyreModel,
}: StrategyPanelProps): JSX.Element {
  let cumulative = 0;
  const pitLaps: number[] = [];
  stints.slice(0, -1).forEach((stint) => {
    cumulative += stint.laps;
    pitLaps.push(cumulative);
  });

  let cursor = 0;
  return (
    <>
      <div className="panel-hdr">Strategy</div>
      <div className="stint-bar">
        {stints.map((stint) => {
          const start = cursor;
          const end = cursor + stint.laps;
          cursor = end;
          const width = currentLap > end ? 100 : currentLap > start ? ((currentLap - start) / stint.laps) * 100 : 0;
          const tyre = tyreModel[stint.compound];
          const flex = (stint.laps / totalLaps) * 100;
          return (
            <div
              className="stint-seg"
              key={`${stint.compound}-${start}-${end}`}
              style={{ flex, background: tyre?.color ?? "#666" }}
              title={`${stint.compound} — ${stint.laps} laps`}
            >
              <div className="stint-seg-progress" style={{ width: `${width}%` }} />
              {stint.laps > 8 ? tyre?.label : ""}
            </div>
          );
        })}
      </div>
      <div className="pit-notes">
        {pitLaps.length ? `Pit windows: ${pitLaps.map((lap) => `L${lap}`).join(" · ")}` : "No planned stops"}
      </div>
    </>
  );
}
