import type { LapSnapshot } from "../types/sim";
import type { JSX } from "react";
import type { Battle } from "../utils/drama";
import { carPressureLine } from "../utils/drama";
import { formatDelta, formatGap, formatLapTime, formatPosition } from "../utils/format";

interface DriverCardsProps {
  snap: LapSnapshot;
  battles: Battle[];
  deltas: Map<number, number>;
}

export function DriverCards({ snap, battles, deltas }: DriverCardsProps): JSX.Element {
  const cars = snap.cars.filter((car) => car.isUser);
  return (
    <>
      <div className="panel-hdr">Your drivers</div>
      <div className="driver-cards">
        {cars.map((car) => {
          const pressure = carPressureLine(car, battles);
          const delta = deltas.get(car.id);
          return (
            <div className="dc" key={car.id} style={{ borderLeftColor: car.color }}>
              <div className="dc-name">{car.driver}</div>
              <div className="dc-pos">
                {formatPosition(car.position)}
                {delta ? <span className={`dc-delta ${delta > 0 ? "up" : "down"}`}>{formatDelta(delta)}</span> : null}
              </div>
              <div className="dc-meta">
                {car.isLead ? "Lead strategy" : "Autonomous"} · {car.compound} L{car.tyreAge}
              </div>
              <div className="dc-laptime">{formatLapTime(car.lapTime)}</div>
              <div className="dc-meta">{formatGap(car.gap)}</div>
              {pressure ? <div className="dc-pressure">{pressure}</div> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
