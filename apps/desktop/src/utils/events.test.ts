import { describe, expect, it } from "vitest";
import type {
  CarSnapshot,
  Compound,
  LapSnapshot,
  LiveCarSnapshot,
  LiveLapSnapshot,
  RaceResult,
} from "../types/sim";
import { detectLapEvents, fullyCompletedFieldLaps } from "./events";

function car(partial: Partial<CarSnapshot> & Pick<CarSnapshot, "id" | "driver" | "position">): CarSnapshot {
  return {
    team: "McLaren",
    color: "#ff8000",
    isUser: false,
    isLead: false,
    isTeammate: false,
    gridPos: partial.position,
    cumTime: 0,
    lapTime: 90,
    compound: "MEDIUM" as Compound,
    tyreAge: 5,
    tyreDelta: 0,
    pitting: false,
    rainPen: 0,
    error: 0,
    gap: 0,
    interval: 1,
    drs: false,
    ...partial,
  };
}

function snap(lap: number, cars: CarSnapshot[]): LapSnapshot {
  return {
    lap,
    inSc: false,
    isRaining: false,
    scLap: null,
    fastestLap: { time: 88, driver: "", lap: 0 },
    cars,
  };
}

function resultStub(): RaceResult {
  return {
    meta: {
      race: { id: 1, name: "Test", circuit: "Barcelona", laps: 50, scProb: 0, deg: 1, overtake: 1 },
      team: "McLaren",
      teamColor: "#ff8000",
      stints: [],
      grid: 2,
      weather: "DRY",
      hasSc: false,
      scLap: null,
      scDur: 0,
      rainLap: null,
      totalLaps: 50,
    },
    stats: {
      finalPosition: 1,
      pointsScored: 25,
      teamPoints: 43,
      avgPosition: 2,
      gapToWinner: 0,
      fastestLap: { time: 88, driver: "", lap: 0 },
      practicality: 1,
    },
    laps: [],
  };
}

describe("detectLapEvents", () => {
  it("gates full-snapshot events on the slowest car's completed laps", () => {
    const liveCars: LiveCarSnapshot[] = [
      {
        ...car({ id: 1, driver: "LEADER", position: 1 }),
        completedLaps: 5,
        trackProgress: 0.1,
        finished: false,
      },
      {
        ...car({ id: 2, driver: "TRAILER", position: 2 }),
        completedLaps: 4,
        trackProgress: 0.9,
        finished: false,
      },
    ];
    const liveSnapshot: LiveLapSnapshot = {
      ...snap(6, liveCars),
      raceTime: 450,
      cars: liveCars,
    };

    expect(fullyCompletedFieldLaps(liveSnapshot)).toBe(4);
  });

  it("emits a lead change when P1 swaps", () => {
    const state = { positions: new Map<string, number>(), leader: null as string | null };
    const first = snap(4, [
      car({ id: 1, driver: "Max Verstappen", position: 1 }),
      car({ id: 2, driver: "Lando Norris", position: 2, isLead: true }),
    ]);
    const second = snap(5, [
      car({ id: 2, driver: "Lando Norris", position: 1, isLead: true }),
      car({ id: 1, driver: "Max Verstappen", position: 2 }),
    ]);
    detectLapEvents(first, resultStub(), {}, state);
    const events = detectLapEvents(second, resultStub(), {}, state);
    expect(events.some((event) => event.kind === "lead")).toBe(true);
  });
});
