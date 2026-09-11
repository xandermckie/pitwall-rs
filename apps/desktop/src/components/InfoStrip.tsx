import type { LapSnapshot } from "../types/sim";
import type { JSX } from "react";
import { formatGap, formatLapTime, formatPosition } from "../utils/format";

interface InfoStripProps {
  snap: LapSnapshot;
  totalLaps: number;
  battleCount: number;
  isFinish: boolean;
}

export function InfoStrip({ snap, totalLaps, battleCount, isFinish }: InfoStripProps): JSX.Element {
  const leader = snap.cars[0];
  const lead = snap.cars.find((car) => car.isLead);
  const posClass =
    lead && lead.position <= 3 ? "warn" : lead && lead.position <= 10 ? "good" : "bad";
  const lastLap = snap.lap === totalLaps && totalLaps > 0;

  return (
    <div className={`info-strip ${lastLap ? "last-lap" : ""} ${isFinish ? "chequered" : ""}`}>
      <div className="strip-item">
        <span className="strip-label">LAP</span>
        <span className="strip-val">{snap.lap}</span>
        <span className="strip-label">/ {totalLaps}</span>
      </div>
      {lastLap ? (
        <div className="strip-item highlight">
          <span className="strip-val warn">{isFinish ? "FINISH" : "LAST LAP"}</span>
        </div>
      ) : null}
      <div className="strip-item">
        <span className="strip-label">LEADER</span>
        <span className="strip-val">{leader?.driver ?? "—"}</span>
      </div>
      <div className="strip-item">
        <span className="strip-label">LEAD DRIVER</span>
        <span className={`strip-val ${posClass}`}>{lead ? formatPosition(lead.position) : "—"}</span>
      </div>
      <div className="strip-item">
        <span className="strip-label">GAP</span>
        <span className="strip-val">{lead ? formatGap(lead.gap) : "—"}</span>
      </div>
      <div className="strip-item">
        <span className="strip-label">BATTLES</span>
        <span className={`strip-val ${battleCount > 0 ? "warn" : ""}`}>{battleCount}</span>
      </div>
      <div className="strip-item">
        <span className="strip-label">COMPOUND</span>
        <span className="strip-val">{lead?.compound ?? "—"}</span>
      </div>
      <div className="strip-item">
        <span className="strip-label">TYRE AGE</span>
        <span className="strip-val">{lead ? `L${lead.tyreAge}` : "—"}</span>
      </div>
      <div className="strip-item">
        <span className="strip-label">FL</span>
        <span className="strip-val good">
          {snap.fastestLap.driver
            ? `${snap.fastestLap.driver} ${formatLapTime(snap.fastestLap.time)}`
            : "—"}
        </span>
      </div>
    </div>
  );
}
