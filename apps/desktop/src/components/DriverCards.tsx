import type { LapSnapshot } from "../types/sim";
import type { JSX } from "react";
import { formatGap, formatLapTime, formatPosition } from "../utils/format";

interface DriverCardsProps {
  snap: LapSnapshot;
}

export function DriverCards({ snap }: DriverCardsProps): JSX.Element {
  const cars = snap.cars.filter((car) => car.isUser);
  return (
    <>
      <div className="panel-hdr">Your drivers</div>
      <div className="driver-cards">
        {cars.map((car) => (
          <div className="dc" key={car.id} style={{ borderLeftColor: car.color }}>
            <div className="dc-name">{car.driver}</div>
            <div className="dc-pos">{formatPosition(car.position)}</div>
            <div className="dc-meta">
              {car.isLead ? "Lead strategy" : "Autonomous"} · {car.compound} L{car.tyreAge}
            </div>
            <div className="dc-laptime">{formatLapTime(car.lapTime)}</div>
            <div className="dc-meta">{formatGap(car.gap)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
