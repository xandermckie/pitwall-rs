import { describe, expect, it } from "vitest";
import {
  driverCode,
  formatDelta,
  formatGap,
  formatLapTime,
  formatPercent,
  formatPercentRange,
} from "./format";

describe("formatLapTime", () => {
  it("formats a 90s lap as 1:30.000", () => {
    expect(formatLapTime(90)).toBe("1:30.000");
  });

  it("returns a placeholder for invalid values", () => {
    expect(formatLapTime(Number.NaN)).toBe("--:--.---");
  });
});

describe("formatGap", () => {
  it("labels a zero gap as leader", () => {
    expect(formatGap(0)).toBe("LEADER");
  });

  it("prefixes positive gaps", () => {
    expect(formatGap(1.234)).toBe("+1.23");
  });
});

describe("formatPercent", () => {
  it("renders one decimal place", () => {
    expect(formatPercent(0.256)).toBe("25.6%");
  });
});

describe("formatPercentRange", () => {
  it("renders a compact inclusive percentage range", () => {
    expect(formatPercentRange(0.1234, 0.2876)).toBe("12.3–28.8%");
  });
});

describe("driverCode", () => {
  it("uses the first three letters of the surname", () => {
    expect(driverCode("Lando Norris")).toBe("NOR");
    expect(driverCode("Charles Leclerc")).toBe("LEC");
  });
});

describe("formatDelta", () => {
  it("renders gained and lost places", () => {
    expect(formatDelta(2)).toBe("↑2");
    expect(formatDelta(-1)).toBe("↓1");
    expect(formatDelta(0)).toBe("");
  });
});
