export interface ParsedSeed {
  value: number | null;
  error: string | null;
}

const INVALID_SEED_ERROR = "Seed must be a non-negative safe integer.";

export function isValidSeed(seed: number | null): boolean {
  return seed === null || (Number.isSafeInteger(seed) && seed >= 0);
}

export function parseSeed(input: string): ParsedSeed {
  const normalized = input.trim();
  if (normalized === "") {
    return { value: null, error: null };
  }

  const value = Number(normalized);
  if (!isValidSeed(value)) {
    return { value: null, error: INVALID_SEED_ERROR };
  }

  return { value, error: null };
}
