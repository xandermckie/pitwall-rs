import { describe, expect, it } from "vitest";
import type { CarSnapshot, Compound, LapSnapshot } from "../types/sim";
import {
  buildLapDrama,
  detectBattles,
  detectOvertakes,
  pickCallout,
  positionDeltas,
} from "./drama";

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
    gap: Math.max(0, partial.position - 1),
    interval: partial.position === 1 ? 0 : 1.4,
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
    fastestLap: { time: 88, driver: cars[0]?.driver ?? "", lap: 1 },
    cars,
  };
}

describe("positionDeltas", () => {
  it("returns gained places as a positive delta", () => {
    const prev = snap(3, [car({ id: 1, driver: "Lando Norris", position: 4 })]);
    const curr = snap(4, [car({ id: 1, driver: "Lando Norris", position: 2 })]);
    expect(positionDeltas(prev, curr).get(1)).toBe(2);
  });
});

describe("detectOvertakes", () => {
  it("records a pass for P1 as a lead change", () => {
    const prev = snap(8, [
      car({ id: 1, driver: "Max Verstappen", position: 1 }),
      car({ id: 2, driver: "Lando Norris", position: 2, isUser: true }),
    ]);
    const curr = snap(9, [
      car({ id: 2, driver: "Lando Norris", position: 1, isUser: true }),
      car({ id: 1, driver: "Max Verstappen", position: 2 }),
    ]);
    const overtakes = detectOvertakes(prev, curr);
    expect(overtakes[0]).toMatchObject({
      passer: "Lando Norris",
      passed: "Max Verstappen",
      newPosition: 1,
      isLeadChange: true,
      isUser: true,
    });
  });
});

describe("detectBattles", () => {
  it("flags a sub-second interval as a battle", () => {
    const current = snap(12, [
      car({ id: 1, driver: "Oscar Piastri", position: 1, interval: 0 }),
      car({ id: 2, driver: "Charles Leclerc", position: 2, interval: 0.28 }),
    ]);
    const battles = detectBattles(current);
    expect(battles).toHaveLength(1);
    expect(battles[0].hunter).toBe("Charles Leclerc");
  });

  it("ignores cars that are pitting", () => {
    const current = snap(12, [
      car({ id: 1, driver: "Oscar Piastri", position: 1, interval: 0 }),
      car({ id: 2, driver: "Charles Leclerc", position: 2, interval: 0.2, pitting: true }),
    ]);
    expect(detectBattles(current)).toHaveLength(0);
  });
});

describe("pickCallout", () => {
  it("prefers a chequered flag at the finish", () => {
    const current = snap(50, [car({ id: 1, driver: "Lando Norris", position: 1 })]);
    const callout = pickCallout(null, current, [], [], { totalLaps: 50, isFinish: true });
    expect(callout?.kind).toBe("chequered");
  });

  it("calls last lap when nothing more dramatic happened", () => {
    const current = snap(50, [car({ id: 1, driver: "Lando Norris", position: 1 })]);
    const callout = pickCallout(null, current, [], [], { totalLaps: 50, isFinish: false });
    expect(callout?.kind).toBe("last-lap");
  });
});

describe("buildLapDrama", () => {
  it("collects battle ids for both cars", () => {
    const prev = snap(4, [
      car({ id: 1, driver: "A", position: 1, interval: 0 }),
      car({ id: 2, driver: "B", position: 2, interval: 0.4 }),
    ]);
    const curr = snap(5, [
      car({ id: 1, driver: "A", position: 1, interval: 0 }),
      car({ id: 2, driver: "B", position: 2, interval: 0.4 }),
    ]);
    const drama = buildLapDrama(prev, curr, { totalLaps: 50, isFinish: false });
    expect(drama.battleIds.has(1)).toBe(true);
    expect(drama.battleIds.has(2)).toBe(true);
  });
});
