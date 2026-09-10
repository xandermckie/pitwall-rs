import type { LapSnapshot, RaceResult, TyreModel } from "../types/sim";

export type EventKind = "sc" | "sc-end" | "rain" | "pit" | "gain" | "drop" | "fl";

export interface RaceEvent {
  id: string;
  lap: number;
  kind: EventKind;
  text: string;
}

export function detectLapEvents(
  snap: LapSnapshot,
  result: RaceResult,
  tyreModel: TyreModel,
  previousLeadPos: Map<string, number>,
): RaceEvent[] {
  const events: RaceEvent[] = [];

  if (snap.inSc && snap.lap === snap.scLap) {
    events.push({
      id: `sc-${snap.lap}`,
      lap: snap.lap,
      kind: "sc",
      text: "Safety car deployed. Pit window is cheap.",
    });
  }

  const scEndLap = snap.scLap === null ? null : snap.scLap + result.meta.scDur;
  if (scEndLap !== null && snap.lap === scEndLap && !snap.inSc) {
    events.push({
      id: `sc-end-${snap.lap}`,
      lap: snap.lap,
      kind: "sc-end",
      text: "Safety car in. Green-flag racing resumes.",
    });
  }

  if (snap.isRaining && snap.lap === result.meta.rainLap) {
    events.push({
      id: `rain-${snap.lap}`,
      lap: snap.lap,
      kind: "rain",
      text: "Rain starts. Intermediate window is open.",
    });
  }

  for (const car of snap.cars) {
    if (!car.pitting) {
      continue;
    }
    const tyre = tyreModel[car.compound];
    events.push({
      id: `pit-${car.driver}-${snap.lap}`,
      lap: snap.lap,
      kind: "pit",
      text: `${car.driver} pits onto ${car.compound} (${tyre?.label ?? "?"}).`,
    });
  }

  for (const car of snap.cars.filter((item) => item.isLead || item.isTeammate)) {
    const prev = previousLeadPos.get(car.driver);
    if (prev !== undefined && prev !== car.position) {
      const gained = prev - car.position;
      if (gained > 0) {
        events.push({
          id: `gain-${car.driver}-${snap.lap}`,
          lap: snap.lap,
          kind: "gain",
          text: `${car.driver} gains ${gained} to P${car.position}.`,
        });
      } else if (gained < -1) {
        events.push({
          id: `drop-${car.driver}-${snap.lap}`,
          lap: snap.lap,
          kind: "drop",
          text: `${car.driver} drops to P${car.position}.`,
        });
      }
    }
    previousLeadPos.set(car.driver, car.position);
  }

  if (snap.fastestLap.lap === snap.lap && snap.fastestLap.driver) {
    events.push({
      id: `fl-${snap.lap}`,
      lap: snap.lap,
      kind: "fl",
      text: `Fastest lap — ${snap.fastestLap.driver}.`,
    });
  }

  return events;
}
