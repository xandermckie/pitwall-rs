import { describe, expect, it } from "vitest";
import { isValidSeed, parseSeed } from "./seed";

describe("parseSeed", () => {
  it("treats blank input as a random seed request", () => {
    expect(parseSeed("  ")).toEqual({ value: null, error: null });
  });

  it("accepts zero and the largest safe integer", () => {
    expect(parseSeed("0")).toEqual({ value: 0, error: null });
    expect(parseSeed("9007199254740991")).toEqual({
      value: Number.MAX_SAFE_INTEGER,
      error: null,
    });
  });

  it.each(["1.5", "-1", "9007199254740992"])(
    "rejects unsafe seed input %s with a concise error",
    (input) => {
      expect(parseSeed(input)).toEqual({
        value: null,
        error: "Seed must be a non-negative safe integer.",
      });
    },
  );
});

describe("isValidSeed", () => {
  it("accepts null and safe non-negative integers", () => {
    expect(isValidSeed(null)).toBe(true);
    expect(isValidSeed(0)).toBe(true);
    expect(isValidSeed(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects unsafe numeric seed %s",
    (seed) => {
      expect(isValidSeed(seed)).toBe(false);
    },
  );
});
