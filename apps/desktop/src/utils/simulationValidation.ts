import type { SimConfig } from "../types/sim";
import { isValidSeed } from "./seed";

const ITERATION_PRESETS = [500, 2_000, 5_000] as const;
const GENERIC_SIMULATION_ERROR =
  "Simulation could not be started. Check your inputs and try again.";

export class SimulationInputError extends Error {}

export function parseBoundedIntegerInput(
  input: string,
  minimum: number,
  maximum: number,
): number | null {
  if (input.trim() === "") {
    return null;
  }
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return null;
  }
  return value;
}

export function validateSimConfig(config: SimConfig): string | null {
  if (!Number.isSafeInteger(config.raceId) || config.raceId < 0) {
    return "Select a valid race.";
  }
  if (
    !Number.isSafeInteger(config.gridPosition) ||
    config.gridPosition < 1 ||
    config.gridPosition > 20
  ) {
    return "Grid position must be a whole number from 1 to 20.";
  }
  if (
    config.stints.length === 0 ||
    config.stints.some(
      (stint) =>
        !Number.isSafeInteger(stint.laps) ||
        stint.laps < 3 ||
        stint.laps > 78,
    )
  ) {
    return "Each stint must use a whole number of laps from 3 to 78.";
  }
  if (!ITERATION_PRESETS.some((preset) => preset === config.iterations)) {
    return "Select a supported iteration count.";
  }
  if (!isValidSeed(config.seed)) {
    return "Seed must be a non-negative safe integer.";
  }
  return null;
}

export function simulationErrorMessage(error: unknown): string {
  return error instanceof SimulationInputError
    ? error.message
    : GENERIC_SIMULATION_ERROR;
}
