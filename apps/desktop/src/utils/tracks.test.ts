import { describe, expect, it } from "vitest";
import {
  CIRCUITS,
  alignCircuitPath,
  applyFit,
  makeFit,
  pathForCircuit,
  resampleClosed,
} from "./tracks";

describe("pathForCircuit", () => {
  it("uses a dense GPS outline for every named grand prix", () => {
    const names = Object.keys(CIRCUITS);
    expect(names.length).toBeGreaterThanOrEqual(12);
    for (const name of names) {
      const path = pathForCircuit(name);
      expect(path.length).toBeGreaterThan(80);
    }
  });

  it("rotates and reverses a trace around its start line", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];

    expect(alignCircuitPath(path, 2, false)).toEqual([
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(alignCircuitPath(path, 2, true)).toEqual([
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ]);
  });

  it("anchors every circuit label to its GPS trace", () => {
    for (const circuit of Object.values(CIRCUITS)) {
      for (const label of circuit.labels) {
        const isOnTrace = circuit.path.some(
          (point) => point.x === label.x && point.y === label.y,
        );
        expect(isOnTrace, `${circuit.name}: ${label.name}`).toBe(true);
      }
    }
  });

  it("preserves Suzuka's GPS aspect ratio", () => {
    const path = pathForCircuit("Suzuka");
    const xs = path.map((point) => point.x);
    const ys = path.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width / height).toBeGreaterThan(1.7);
    expect(width / height).toBeLessThan(2);
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
