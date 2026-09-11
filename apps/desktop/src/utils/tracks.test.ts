import { describe, expect, it } from "vitest";
import { CIRCUITS, applyFit, makeFit, pathForCircuit, resampleClosed } from "./tracks";

describe("pathForCircuit", () => {
  it("keeps a distinct outline for every named grand prix", () => {
    const names = Object.keys(CIRCUITS);
    expect(names.length).toBeGreaterThanOrEqual(12);
    for (const name of names) {
      const path = pathForCircuit(name);
      expect(path.length).toBeGreaterThan(12);
    }
  });

  it("does not collapse Suzuka into a simple oval", () => {
    const path = pathForCircuit("Suzuka");
    const xs = path.map((point) => point.x);
    const ys = path.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width / height).toBeGreaterThan(0.7);
    expect(width / height).toBeLessThan(1.6);
  });
});

describe("makeFit", () => {
  it("preserves aspect ratio and stays inside the canvas", () => {
    const path = pathForCircuit("Jeddah Corniche");
    const fit = makeFit(path, 400, 300, 20);
    const fitted = path.map((point) => applyFit(point, fit));
    for (const point of fitted) {
      expect(point.x).toBeGreaterThanOrEqual(20);
      expect(point.x).toBeLessThanOrEqual(380);
      expect(point.y).toBeGreaterThanOrEqual(20);
      expect(point.y).toBeLessThanOrEqual(280);
    }
    const rawW = Math.max(...path.map((p) => p.x)) - Math.min(...path.map((p) => p.x));
    const rawH = Math.max(...path.map((p) => p.y)) - Math.min(...path.map((p) => p.y));
    const fitW = Math.max(...fitted.map((p) => p.x)) - Math.min(...fitted.map((p) => p.x));
    const fitH = Math.max(...fitted.map((p) => p.y)) - Math.min(...fitted.map((p) => p.y));
    expect(fitW / fitH).toBeCloseTo(rawW / rawH, 3);
  });
});

describe("resampleClosed", () => {
  it("returns a denser smooth loop", () => {
    const path = pathForCircuit("Monza");
    const sampled = resampleClosed(path, 80);
    expect(sampled).toHaveLength(80);
  });
});
