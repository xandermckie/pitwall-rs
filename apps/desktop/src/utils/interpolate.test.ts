import { describe, expect, it } from "vitest";
import type { CarSnapshot, LapSnapshot, RaceResult } from "../types/sim";
import { interpolateFrame, raceDuration } from "./interpolate";

function car(
  id: number,
  driver: string,
  cumTime: number,
  lapTime: number,
  position: number,
): CarSnapshot {
  return {
    id,
    driver,
    team: "Test",
    color: "#ffffff",
    isUser: id === 1,
    isLead: id === 1,
    isTeammate: false,
    gridPos: id,
    cumTime,
    lapTime,
    compound: "MEDIUM",
    tyreAge: 1,
    tyreDelta: 0,
    pitting: false,
    rainPen: 0,
    error: 0,
    position,
    gap: 0,
    interval: 0,
    drs: false,
  };
}

function lap(lapNumber: number, cars: CarSnapshot[]): LapSnapshot {
  return {
    lap: lapNumber,
    inSc: false,
    isRaining: false,
    scLap: null,
    fastestLap: { time: 90, driver: "ONE", lap: lapNumber },
    cars,
  };
}

function result(laps: LapSnapshot[]): RaceResult {
  return {
    meta: {
      race: {
        id: 1,
        name: "Test GP",
        circuit: "Test",
        laps: laps.length,
        scProb: 0,
        deg: 0,
        overtake: 0,
      },
      team: "Test",
      teamColor: "#ffffff",
      stints: [{ compound: "MEDIUM", laps: laps.length }],
      grid: 1,
      weather: "DRY",
      hasSc: false,
      scLap: null,
      scDur: 0,
      rainLap: null,
      totalLaps: laps.length,
    },
    stats: {
      finalPosition: 1,
      pointsScored: 25,
      teamPoints: 25,
      avgPosition: 1,
      gapToWinner: 0,
      fastestLap: { time: 90, driver: "ONE", lap: 1 },
      practicality: 100,
    },
    laps,
  };
}

describe("interpolateFrame", () => {
  const race = result([
    lap(1, [car(1, "ONE", 90, 90, 1), car(2, "TWO", 92, 92, 2)]),
    lap(2, [car(1, "ONE", 180, 90, 1), car(2, "TWO", 181, 89, 2)]),
  ]);

  it("places a car halfway around a 90-second lap", () => {
    const frame = interpolateFrame(race, 45);
    expect(frame.cars.find((item) => item.id === 1)?.trackProgress).toBeCloseTo(0.5);
  });

  it("starts the next lap at the start line on an exact lap boundary", () => {
    const frame = interpolateFrame(race, 90);
    const lead = frame.cars.find((item) => item.id === 1);
    expect(lead?.completedLaps).toBe(1);
    expect(lead?.trackProgress).toBe(0);
    expect(frame.lap).toBe(2);
  });

  it("does not reveal the current lap's fastest lap before completion", () => {
    const frame = interpolateFrame(race, 100);
    expect(frame.lap).toBe(2);
    expect(frame.fastestLap.lap).toBe(1);
  });

  it("does not expose terminal telemetry from an in-progress lap", () => {
    const telemetryRace = result([
      lap(1, [car(1, "ONE", 90, 90, 1)]),
      lap(2, [{
        ...car(1, "ONE", 180, 90, 1),
        tyreDelta: 1.25,
        rainPen: 3.5,
        error: 0.8,
        drs: true,
      }]),
    ]);

    const live = interpolateFrame(telemetryRace, 120).cars[0];

    expect(live.driver).toBe("ONE");
    expect(live.completedLaps).toBe(1);
    expect(live.trackProgress).toBeCloseTo(1 / 3);
    expect(live.lapTime).toBe(0);
    expect(live.tyreDelta).toBe(0);
    expect(live.rainPen).toBe(0);
    expect(live.error).toBe(0);
    expect(live.drs).toBe(false);
    expect(live.cumTime).toBe(90);
  });

  it("carries completed-lap DRS eligibility into the following live lap", () => {
    const drsRace = result([
      lap(1, [{ ...car(1, "ONE", 90, 90, 1), drs: true }]),
      lap(2, [{ ...car(1, "ONE", 180, 90, 1), drs: false }]),
    ]);

    expect(interpolateFrame(drsRace, 120).cars[0].drs).toBe(true);
  });

  it("does not reveal DRS eligibility calculated at the end of the live lap", () => {
    const drsRace = result([
      lap(1, [{ ...car(1, "ONE", 90, 90, 1), drs: false }]),
      lap(2, [{ ...car(1, "ONE", 180, 90, 1), drs: true }]),
    ]);

    expect(interpolateFrame(drsRace, 120).cars[0].drs).toBe(false);
  });

  it("keeps lap-start pit state without exposing that lap's result", () => {
    const pitRace = result([
      lap(1, [car(1, "ONE", 90, 90, 1)]),
      lap(2, [{
        ...car(1, "ONE", 200, 90, 1),
        compound: "HARD",
        tyreAge: 0,
        tyreDelta: 0.6,
        pitting: true,
      }]),
    ]);

    const live = interpolateFrame(pitRace, 100).cars[0];

    expect(live.compound).toBe("HARD");
    expect(live.tyreAge).toBe(0);
    expect(live.pitting).toBe(true);
    expect(live.lapTime).toBe(0);
    expect(live.tyreDelta).toBe(0);
  });

  it("reveals final telemetry once a lap is complete", () => {
    const telemetryRace = result([
      lap(1, [{
        ...car(1, "ONE", 90, 90, 1),
        tyreDelta: 1.25,
        error: 0.8,
        drs: true,
      }]),
    ]);

    const finished = interpolateFrame(telemetryRace, 90).cars[0];

    expect(finished.finished).toBe(true);
    expect(finished.lapTime).toBe(90);
    expect(finished.tyreDelta).toBe(1.25);
    expect(finished.error).toBe(0.8);
    expect(finished.drs).toBe(true);
  });

  it("orders cars by completed distance during the lap", () => {
    const changingLead = result([
      lap(1, [car(1, "ONE", 90, 90, 1), car(2, "TWO", 100, 100, 2)]),
      lap(2, [car(2, "TWO", 170, 70, 1), car(1, "ONE", 180, 90, 2)]),
    ]);

    const frame = interpolateFrame(changingLead, 150);
    expect(frame.cars[0].driver).toBe("TWO");
    expect(frame.cars[0].position).toBe(1);
    expect(frame.cars[1].interval).toBeGreaterThan(0);
  });

  it("keeps grid order before the cars start moving", () => {
    const gridRace = result([
      lap(1, [
        { ...car(2, "POLE", 90, 90, 1), gridPos: 1 },
        { ...car(1, "SECOND", 90.15, 90, 2), gridPos: 2 },
      ]),
    ]);

    const frame = interpolateFrame(gridRace, 0);
    expect(frame.cars.map((item) => item.driver)).toEqual(["POLE", "SECOND"]);
  });

  it("holds a pitting car before it starts the next lap", () => {
    const pitRace = result([
      lap(1, [car(1, "ONE", 90, 90, 1)]),
      lap(2, [{ ...car(1, "ONE", 200, 90, 1), pitting: true }]),
    ]);

    expect(interpolateFrame(pitRace, 100).cars[0].trackProgress).toBe(0);
    expect(interpolateFrame(pitRace, 155).cars[0].trackProgress).toBeCloseTo(0.5);
  });

  it("freezes each finished car at the start line", () => {
    const frame = interpolateFrame(race, 200);
    const winner = frame.cars.find((item) => item.id === 1);
    const runnerUp = frame.cars.find((item) => item.id === 2);
    expect(winner?.finished).toBe(true);
    expect(winner?.trackProgress).toBe(0);
    expect(runnerUp?.finished).toBe(false);
    expect(raceDuration(race)).toBe(180);
  });
});
