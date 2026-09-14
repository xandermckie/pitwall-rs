import type { LiveLapSnapshot, RaceResult } from "../types/sim";

export interface ChartHistory {
  gap: number[];
  tyreDelta: number[];
  lapTime: number[];
}

export function leadDriverCompletedLaps(snapshot: LiveLapSnapshot): number {
  return snapshot.cars.find((car) => car.isLead)?.completedLaps ?? 0;
}

export function buildChartHistory(
  result: RaceResult,
  completedLaps: number,
  limit = 45,
): ChartHistory {
  const completedCount = Math.min(
    Math.max(Math.trunc(completedLaps), 0),
    result.laps.length,
  );
  const historyLimit = Math.max(Math.trunc(limit), 0);
  const firstLap = Math.max(completedCount - historyLimit, 0);
  const history: ChartHistory = { gap: [], tyreDelta: [], lapTime: [] };

  for (const lap of result.laps.slice(firstLap, completedCount)) {
    const lead = lap.cars.find((car) => car.isLead);
    if (lead) {
      history.gap.push(lead.gap);
      history.tyreDelta.push(lead.tyreDelta);
      history.lapTime.push(lead.lapTime);
    }
  }

  return history;
}
