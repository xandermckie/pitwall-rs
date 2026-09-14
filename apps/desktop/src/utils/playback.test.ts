import { describe, expect, it } from "vitest";
import {
  advanceRaceTime,
  formatRaceClock,
  PLAYBACK_SPEEDS,
  targetCompletedLap,
} from "./playback";

describe("advanceRaceTime", () => {
  it("advances simulated seconds by elapsed real time and speed", () => {
    expect(advanceRaceTime(10, 250, 16, 500)).toBe(14);
  });

  it("clamps playback at the race duration", () => {
    expect(advanceRaceTime(498, 1000, 4, 500)).toBe(500);
  });
});

describe("formatRaceClock", () => {
  it("formats elapsed race time with tenths", () => {
    expect(formatRaceClock(724.34)).toBe("12:04.3");
  });

  it("clamps invalid and negative values to zero", () => {
    expect(formatRaceClock(-5)).toBe("00:00.0");
    expect(formatRaceClock(Number.NaN)).toBe("00:00.0");
  });
});

describe("PLAYBACK_SPEEDS", () => {
  it("provides the approved playback speed presets", () => {
    expect(PLAYBACK_SPEEDS).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });
});

describe("targetCompletedLap", () => {
  it("moves exactly one boundary backward from race completion", () => {
    expect(targetCompletedLap(66, -1, 66)).toBe(65);
  });

  it("clamps boundary jumps to the race range", () => {
    expect(targetCompletedLap(0, -1, 66)).toBe(0);
    expect(targetCompletedLap(65, 2, 66)).toBe(66);
  });
});
