import {
  applyFit,
  circuitDef,
  makeFit,
  type TrackPoint,
  type TrackTheme,
} from "./tracks";

export function paintCircuit(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  circuitName: string,
): TrackPoint[] {
  const circuit = circuitDef(circuitName);
  const fit = makeFit(
    [...circuit.path, ...circuit.water.flat(), ...circuit.labels],
    width,
    height,
    Math.min(width, height) * 0.1,
  );
  const path = circuit.path.map((point) => applyFit(point, fit));
  const theme = circuit.theme;
  const minDim = Math.min(width, height);
  const asphaltW = Math.max(11, minDim * 0.034);
  const runoffW = asphaltW * 1.85;

  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, width, height);
  paintGrain(ctx, width, height);

  for (const lake of circuit.water) {
    const fitted = lake.map((point) => applyFit(point, fit));
    ctx.beginPath();
    trace(ctx, fitted);
    ctx.closePath();
    ctx.fillStyle = theme.water ?? "#15364a";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  strokePath(ctx, path, runoffW, theme.runoff);
  strokePath(ctx, path, asphaltW + 3, "rgba(0,0,0,0.45)");
  strokePath(ctx, path, asphaltW, theme.asphalt);
  strokePath(ctx, path, Math.max(1.2, asphaltW * 0.08), "rgba(255,255,255,0.08)");
  paintKerbs(ctx, path, asphaltW, theme);
  strokePath(ctx, path, 1, "rgba(255,255,255,0.12)", [4, 10]);
  paintPitLane(ctx, path, asphaltW);
  paintStartFinish(ctx, path, asphaltW);

  ctx.font = `600 ${Math.max(8, minDim * 0.018)}px IBM Plex Sans`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(231,237,246,0.32)";
  for (const label of circuit.labels) {
    const at = applyFit(label, fit);
    ctx.fillText(label.name.toUpperCase(), at.x, at.y);
  }

  ctx.textAlign = "left";
  ctx.font = "11px IBM Plex Mono";
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillText(circuit.name.toUpperCase(), 14, height - 32);
  return path;
}

function paintGrain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let x = 16; x < width; x += 28) {
    for (let y = 16; y < height; y += 28) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function trace(ctx: CanvasRenderingContext2D, path: TrackPoint[]): void {
  path.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
}

function strokePath(
  ctx: CanvasRenderingContext2D,
  path: TrackPoint[],
  width: number,
  color: string,
  dash: number[] = [],
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  trace(ctx, path);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function paintKerbs(
  ctx: CanvasRenderingContext2D,
  path: TrackPoint[],
  asphaltW: number,
  theme: TrackTheme,
): void {
  const offset = asphaltW * 0.52;
  ctx.lineWidth = Math.max(2, asphaltW * 0.16);
  ctx.lineCap = "butt";
  for (let i = 0; i < path.length; i += 1) {
    const prev = path[(i - 1 + path.length) % path.length];
    const curr = path[i];
    const next = path[(i + 1) % path.length];
    const ax = curr.x - prev.x;
    const ay = curr.y - prev.y;
    const bx = next.x - curr.x;
    const by = next.y - curr.y;
    const al = Math.hypot(ax, ay) || 1;
    const bl = Math.hypot(bx, by) || 1;
    const cross = (ax * by - ay * bx) / (al * bl);
    if (Math.abs(cross) < 0.18) {
      continue;
    }
    const nx = -ay / al;
    const ny = ax / al;
    const side = Math.sign(cross);
    ctx.strokeStyle = i % 2 === 0 ? theme.kerbA : theme.kerbB;
    ctx.beginPath();
    ctx.moveTo(curr.x + nx * offset * side, curr.y + ny * offset * side);
    ctx.lineTo(next.x + nx * offset * side, next.y + ny * offset * side);
    ctx.stroke();
  }
}

function paintPitLane(ctx: CanvasRenderingContext2D, path: TrackPoint[], asphaltW: number): void {
  const count = Math.max(8, Math.floor(path.length * 0.1));
  const offset = asphaltW * 1.15;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = Math.max(3, asphaltW * 0.28);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < count; i += 1) {
    const curr = path[i];
    const next = path[(i + 1) % path.length];
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const len = Math.hypot(dx, dy) || 1;
    const x = curr.x + (-dy / len) * offset;
    const y = curr.y + (dx / len) * offset;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function paintStartFinish(ctx: CanvasRenderingContext2D, path: TrackPoint[], asphaltW: number): void {
  if (path.length < 2) {
    return;
  }
  const a = path[0];
  const b = path[1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * asphaltW * 0.55;
  const ny = (dx / len) * asphaltW * 0.55;
  const cells = 6;
  for (let i = 0; i < cells; i += 1) {
    const t0 = i / cells - 0.5;
    const t1 = (i + 1) / cells - 0.5;
    ctx.fillStyle = i % 2 === 0 ? "#f2f4f8" : "#15181e";
    ctx.beginPath();
    ctx.moveTo(a.x + nx * t0 * 2, a.y + ny * t0 * 2);
    ctx.lineTo(a.x + nx * t1 * 2, a.y + ny * t1 * 2);
    ctx.lineTo(a.x + nx * t1 * 2 + dx * 0.9, a.y + ny * t1 * 2 + dy * 0.9);
    ctx.lineTo(a.x + nx * t0 * 2 + dx * 0.9, a.y + ny * t0 * 2 + dy * 0.9);
    ctx.closePath();
    ctx.fill();
  }
}
