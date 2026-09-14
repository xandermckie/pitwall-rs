import { describe, expect, it } from "vitest";
import type {
  CarSnapshot,
  LapSnapshot,
  LiveCarSnapshot,
  LiveLapSnapshot,
  RaceResult,
} from "../types/sim";
import { buildChartHistory, leadDriverCompletedLaps } from "./chartHistory";

function lead(lapNumber: number): CarSnapshot {
  return {
    id: 1,
    driver: "LEAD",
    team: "Test",
    color: "#ffffff",
    isUser: true,
    isLead: true,
    isTeammate: false,
    gridPos: 1,
    cumTime: lapNumber * 90,
    lapTime: 89 + lapNumber,
    compound: "MEDIUM",
    tyreAge: lapNumber,
    tyreDelta: lapNumber / 10,
    pitting: false,
    rainPen: 0,
    error: 0,
    position: 1,
    gap: lapNumber,
    interval: 0,
    drs: false,
  };
}

function raceResult(lapCount: number): RaceResult {
  const laps: LapSnapshot[] = Array.from({ length: lapCount }, (_, index) => ({
    lap: index + 1,
    inSc: false,
    isRaining: false,
    scLap: null,
    fastestLap: { time: 90, driver: "LEAD", lap: index + 1 },
    cars: [lead(index + 1)],
  }));

  return {
    meta: {
      race: {
        id: 1,
        name: "Test GP",
        circuit: "Test",
        laps: lapCount,
        scProb: 0,
        deg: 0,
        overtake: 0,
      },
      team: "Test",
      teamColor: "#ffffff",
      stints: [{ compound: "MEDIUM", laps: lapCount }],
      grid: 1,
      weather: "DRY",
      hasSc: false,
      scLap: null,
      scDur: 0,
      rainLap: null,
      totalLaps: lapCount,
    },
    stats: {
      finalPosition: 1,
      pointsScored: 25,
      teamPoints: 25,
      avgPosition: 1,
      gapToWinner: 0,
      fastestLap: { time: 90, driver: "LEAD", lap: 1 },
      practicality: 100,
    },
    laps,
  };
}

describe("buildChartHistory", () => {
  it("uses the configured lead driver's completion count", () => {
    const liveCars: LiveCarSnapshot[] = [
      {
        ...lead(2),
        id: 2,
        driver: "RACE LEADER",
        isLead: false,
        position: 1,
        completedLaps: 2,
        trackProgress: 0.1,
        finished: false,
      },
      {
        ...lead(2),
        position: 2,
        completedLaps: 1,
        trackProgress: 0.9,
        finished: false,
      },
    ];
    const liveSnapshot: LiveLapSnapshot = {
      lap: 3,
      inSc: false,
      isRaining: false,
      scLap: null,
      fastestLap: { time: 90, driver: "LEAD", lap: 1 },
      raceTime: 180,
      cars: liveCars,
    };

    expect(leadDriverCompletedLaps(liveSnapshot)).toBe(1);
  });

  it("samples only completed laps", () => {
    const history = buildChartHistory(raceResult(3), 2);

    expect(history.gap).toEqual([1, 2]);
    expect(history.tyreDelta).toEqual([0.1, 0.2]);
    expect(history.lapTime).toEqual([90, 91]);
  });

  it("limits history to the latest completed laps", () => {
    const history = buildChartHistory(raceResult(4), 4, 2);

    expect(history.gap).toEqual([3, 4]);
    expect(history.tyreDelta).toEqual([0.3, 0.4]);
    expect(history.lapTime).toEqual([92, 93]);
  });

  it("returns fresh empty history for a new result before lap completion", () => {
    expect(buildChartHistory(raceResult(3), 0)).toEqual({
      gap: [],
      tyreDelta: [],
      lapTime: [],
    });
  });
});
