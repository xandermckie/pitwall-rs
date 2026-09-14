import { describe, expect, it } from "vitest";
import type { SimConfig } from "../types/sim";
import {
  parseBoundedIntegerInput,
  SimulationInputError,
  simulationErrorMessage,
  validateSimConfig,
} from "./simulationValidation";

const VALID_CONFIG: SimConfig = {
  raceId: 5,
  team: "McLaren",
  gridPosition: 2,
  stints: [
    { compound: "MEDIUM", laps: 22 },
    { compound: "HARD", laps: 44 },
  ],
  weather: "DRY",
  safetyCarExpected: false,
  iterations: 2_000,
  seed: 42,
};

describe("parseBoundedIntegerInput", () => {
  it("accepts bounded whole numbers", () => {
    expect(parseBoundedIntegerInput("1", 1, 20)).toBe(1);
    expect(parseBoundedIntegerInput("20", 1, 20)).toBe(20);
  });

  it.each(["", "NaN", "1.5", "-1", "21"])(
    "rejects invalid controlled input %s",
    (input) => {
      expect(parseBoundedIntegerInput(input, 1, 20)).toBeNull();
    },
  );
});

describe("validateSimConfig", () => {
  it.each([Number.NaN, 1.5, -1, 0, 21])(
    "rejects invalid grid position %s",
    (gridPosition) => {
      expect(validateSimConfig({ ...VALID_CONFIG, gridPosition })).toBe(
        "Grid position must be a whole number from 1 to 20.",
      );
    },
  );

  it.each([Number.NaN, 1.5, -1, 0, 2, 79])(
    "rejects invalid stint lap count %s",
    (laps) => {
      expect(
        validateSimConfig({
          ...VALID_CONFIG,
          stints: [{ compound: "MEDIUM", laps }],
        }),
      ).toBe("Each stint must use a whole number of laps from 3 to 78.");
    },
  );

  it.each([Number.NaN, 1.5, -1, 0, 499, 5_001])(
    "rejects unsupported iteration count %s",
    (iterations) => {
      expect(validateSimConfig({ ...VALID_CONFIG, iterations })).toBe(
        "Select a supported iteration count.",
      );
    },
  );

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid seed %s",
    (seed) => {
      expect(validateSimConfig({ ...VALID_CONFIG, seed })).toBe(
        "Seed must be a non-negative safe integer.",
      );
    },
  );

  it("accepts all supported numeric boundaries", () => {
    expect(
      validateSimConfig({
        ...VALID_CONFIG,
        gridPosition: 20,
        stints: [{ compound: "HARD", laps: 78 }],
        iterations: 5_000,
        seed: Number.MAX_SAFE_INTEGER,
      }),
    ).toBeNull();
  });
});

describe("simulationErrorMessage", () => {
  it("preserves established safe validation errors", () => {
    expect(
      simulationErrorMessage(
        new SimulationInputError("Grid position must be a whole number from 1 to 20."),
      ),
    ).toBe("Grid position must be a whole number from 1 to 20.");
  });

  it("hides unexpected IPC details", () => {
    expect(
      simulationErrorMessage(
        new Error("invalid type at C:\\internal\\src-tauri\\commands.rs:42"),
      ),
    ).toBe("Simulation could not be started. Check your inputs and try again.");
  });
});
