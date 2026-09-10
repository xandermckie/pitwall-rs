import type { Stint } from "../types/sim";

export function defaultStints(stops: number, raceLaps: number): Stint[] {
  const templates: Record<number, Stint[]> = {
    1: [
      { compound: "MEDIUM", laps: 0 },
      { compound: "HARD", laps: 0 },
    ],
    2: [
      { compound: "MEDIUM", laps: 0 },
      { compound: "HARD", laps: 0 },
      { compound: "SOFT", laps: 0 },
    ],
    3: [
      { compound: "SOFT", laps: 0 },
      { compound: "MEDIUM", laps: 0 },
      { compound: "HARD", laps: 0 },
      { compound: "SOFT", laps: 0 },
    ],
  };
  const base = templates[stops] ?? templates[2];
  const shares =
    stops === 1 ? [0.5, 0.5] : stops === 3 ? [0.2, 0.28, 0.32, 0.2] : [0.33, 0.4, 0.27];
  let remaining = raceLaps;
  return base.map((stint, index) => {
    const isLast = index === base.length - 1;
    const laps = isLast ? remaining : Math.max(8, Math.round(raceLaps * shares[index]));
    remaining -= laps;
    return { ...stint, laps: Math.max(3, laps) };
  });
}

export function stintTotal(stints: Stint[]): number {
  return stints.reduce((sum, stint) => sum + stint.laps, 0);
}
