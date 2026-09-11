export interface TrackPoint {
  x: number;
  y: number;
}

export interface TrackLabel {
  name: string;
  x: number;
  y: number;
}

export interface TrackTheme {
  ground: string;
  asphalt: string;
  asphaltHi: string;
  runoff: string;
  water: string | null;
  kerbA: string;
  kerbB: string;
}

export interface CircuitDef {
  name: string;
  path: TrackPoint[];
  water: TrackPoint[][];
  labels: TrackLabel[];
  theme: TrackTheme;
}

const GRASS: TrackTheme = {
  ground: "#0b120e",
  asphalt: "#2a3038",
  asphaltHi: "#3a4250",
  runoff: "#1a241c",
  water: "#163044",
  kerbA: "#d4dce8",
  kerbB: "#c4453c",
};

const DESERT: TrackTheme = {
  ground: "#14110d",
  asphalt: "#2c3036",
  asphaltHi: "#3e4552",
  runoff: "#2a2218",
  water: null,
  kerbA: "#e8e4dc",
  kerbB: "#c4453c",
};

const STREET: TrackTheme = {
  ground: "#0c0e13",
  asphalt: "#2b3038",
  asphaltHi: "#404858",
  runoff: "#161a22",
  water: "#1a3a52",
  kerbA: "#f0f2f6",
  kerbB: "#c4453c",
};

const NIGHT: TrackTheme = {
  ground: "#0a0d12",
  asphalt: "#2a303a",
  asphaltHi: "#3c4656",
  runoff: "#141820",
  water: "#123044",
  kerbA: "#e8eef6",
  kerbB: "#c4453c",
};

function pts(...xy: number[]): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (let i = 0; i + 1 < xy.length; i += 2) {
    out.push({ x: xy[i], y: xy[i + 1] });
  }
  return out;
}

export const CIRCUITS: Record<string, CircuitDef> = {
  "Albert Park": {
    name: "Albert Park",
    theme: GRASS,
    path: pts(
      20, 68, 20, 56, 21, 44, 24, 34, 30, 26, 38, 20, 48, 16, 60, 16, 72, 20, 80, 28,
      84, 38, 84, 48, 80, 56, 74, 62, 72, 70, 68, 78, 60, 84, 50, 88, 40, 88, 32, 84,
      26, 78, 22, 72,
    ),
    water: [pts(36, 36, 50, 30, 64, 34, 70, 46, 66, 58, 52, 64, 40, 58, 34, 46)],
    labels: [
      { name: "Jones", x: 28, y: 28 },
      { name: "Lakeside", x: 78, y: 32 },
      { name: "Ascari", x: 70, y: 76 },
    ],
  },
  Shanghai: {
    name: "Shanghai",
    theme: GRASS,
    path: pts(
      32, 88, 50, 88, 66, 86, 78, 82, 88, 76, 94, 66, 92, 56, 84, 52, 76, 56, 74, 66,
      72, 54, 74, 40, 70, 26, 58, 18, 42, 16, 28, 22, 20, 34, 16, 46, 22, 54, 36, 60,
      54, 66, 72, 74, 84, 80, 88, 86, 78, 92, 58, 94, 40, 92, 32, 90,
    ),
    water: [],
    labels: [
      { name: "T1 snail", x: 86, y: 60 },
      { name: "T13", x: 18, y: 38 },
      { name: "Back straight", x: 52, y: 66 },
    ],
  },
  Suzuka: {
    name: "Suzuka",
    theme: GRASS,
    path: pts(
      47, 86, 58, 84, 70, 78, 80, 70, 86, 58, 84, 46, 76, 40, 66, 42, 72, 34, 64, 28,
      70, 22, 62, 18, 74, 16, 82, 22, 78, 30, 66, 34, 54, 38, 40, 40, 26, 44, 16, 52,
      10, 62, 8, 72, 16, 78, 26, 74, 32, 64, 30, 52, 26, 42, 34, 34, 46, 30, 58, 32,
      64, 40, 66, 52, 70, 64, 66, 74, 58, 82, 50, 86,
    ),
    water: [],
    labels: [
      { name: "Esses", x: 66, y: 30 },
      { name: "Hairpin", x: 10, y: 64 },
      { name: "Spoon", x: 28, y: 50 },
      { name: "130R", x: 58, y: 34 },
      { name: "Casio", x: 68, y: 72 },
    ],
  },
  "Bahrain Int'l": {
    name: "Bahrain Int'l",
    theme: DESERT,
    path: pts(
      22, 78, 40, 78, 56, 76, 64, 70, 62, 62, 52, 58, 44, 54, 48, 46, 58, 44, 68, 48,
      76, 44, 80, 34, 76, 24, 64, 20, 50, 22, 40, 28, 36, 38, 40, 48, 36, 56, 28, 58,
      22, 52, 18, 44, 16, 34, 20, 24, 30, 18, 44, 16, 58, 18, 70, 24, 78, 34, 82, 46,
      80, 58, 74, 68, 64, 74, 50, 78, 36, 80, 24, 80,
    ),
    water: [],
    labels: [
      { name: "T1", x: 64, y: 72 },
      { name: "Oasis", x: 76, y: 28 },
      { name: "T10", x: 18, y: 40 },
    ],
  },
  "Jeddah Corniche": {
    name: "Jeddah Corniche",
    theme: { ...STREET, water: "#0f3348" },
    path: pts(
      38, 88, 42, 80, 40, 72, 44, 64, 40, 56, 46, 48, 42, 40, 48, 32, 44, 24, 50, 18,
      58, 14, 68, 16, 74, 22, 70, 30, 64, 36, 68, 44, 62, 52, 66, 60, 60, 68, 64, 76,
      58, 82, 52, 88, 44, 92, 38, 90,
    ),
    water: [pts(76, 10, 96, 8, 98, 50, 96, 92, 78, 94, 72, 70, 74, 40)],
    labels: [
      { name: "T1", x: 40, y: 84 },
      { name: "T22", x: 70, y: 22 },
      { name: "T27", x: 52, y: 88 },
    ],
  },
  Barcelona: {
    name: "Barcelona",
    theme: GRASS,
    path: pts(
      78, 78, 62, 78, 46, 76, 32, 72, 22, 64, 18, 52, 22, 42, 30, 34, 28, 24, 36, 18,
      48, 16, 60, 20, 70, 28, 76, 38, 74, 48, 66, 54, 58, 58,       52, 66, 56, 74, 66, 78,
    ),
    water: [],
    labels: [
      { name: "Elf", x: 22, y: 66 },
      { name: "Campsa", x: 70, y: 26 },
      { name: "La Caixa", x: 52, y: 62 },
    ],
  },
  "Monte Carlo": {
    name: "Monte Carlo",
    theme: STREET,
    path: pts(
      26, 80, 40, 78, 52, 76, 58, 68, 60, 54, 58, 40, 52, 28, 42, 18, 32, 20, 26, 28,
      22, 38, 16, 48, 12, 54, 16, 60, 24, 62, 36, 58, 50, 54, 66, 54, 78, 58, 88, 66,
      86, 74, 80, 78, 86, 84, 80, 88, 72, 86, 68, 82, 64, 90, 56, 94, 48, 90, 42, 94,
      34, 90, 28, 84,
    ),
    water: [pts(36, 68, 54, 64, 68, 68, 70, 80, 56, 86, 40, 82)],
    labels: [
      { name: "Ste Devote", x: 54, y: 70 },
      { name: "Casino", x: 36, y: 18 },
      { name: "Hairpin", x: 12, y: 56 },
      { name: "Piscine", x: 76, y: 86 },
      { name: "Rascasse", x: 34, y: 90 },
    ],
  },
  "Gilles Villeneuve": {
    name: "Gilles Villeneuve",
    theme: { ...GRASS, water: "#15364a" },
    path: pts(
      18, 62, 32, 60, 48, 58, 64, 56, 78, 54, 88, 50, 92, 42, 86, 34, 74, 32, 58, 34,
      42, 36, 26, 38, 16, 42, 10, 50, 12, 58, 16, 62,
    ),
    water: [
      pts(-8, 20, 110, 16, 112, 80, -6, 84, -8, 20),
      pts(22, 44, 50, 40, 78, 38, 86, 44, 78, 50, 48, 52, 24, 54),
    ],
    labels: [
      { name: "L'Epingle", x: 92, y: 40 },
      { name: "Casino", x: 50, y: 58 },
      { name: "Wall of Champions", x: 12, y: 48 },
    ],
  },
  Silverstone: {
    name: "Silverstone",
    theme: GRASS,
    path: pts(
      60, 36, 72, 32, 82, 28, 90, 34, 88, 44, 80, 50, 86, 58, 82, 66, 90, 74, 84, 84,
      70, 88, 58, 84, 50, 76, 42, 82, 32, 80, 24, 72, 18, 60, 20, 48, 12, 40, 18, 30,
      28, 28, 36, 36, 26, 42, 24, 52, 32, 58, 22, 50, 26, 40, 38, 38, 50, 36,
    ),
    water: [],
    labels: [
      { name: "Copse", x: 70, y: 32 },
      { name: "Maggots", x: 86, y: 40 },
      { name: "Becketts", x: 80, y: 58 },
      { name: "Stowe", x: 82, y: 78 },
      { name: "Club", x: 50, y: 80 },
      { name: "Luffield", x: 18, y: 42 },
    ],
  },
  Monza: {
    name: "Monza",
    theme: GRASS,
    path: pts(
      18, 78, 18, 58, 18, 38, 18, 24, 14, 18, 20, 12, 30, 16, 46, 16, 64, 20, 76, 28,
      84, 38, 76, 44, 86, 48, 88, 58, 82, 64, 90, 70, 88, 78, 78, 84, 68, 80, 62, 88,
      50, 92, 34, 90, 22, 84, 16, 78,
    ),
    water: [],
    labels: [
      { name: "Rettifilo", x: 18, y: 18 },
      { name: "Lesmo", x: 88, y: 60 },
      { name: "Ascari", x: 64, y: 84 },
      { name: "Parabolica", x: 20, y: 82 },
    ],
  },
  "Marina Bay": {
    name: "Marina Bay",
    theme: NIGHT,
    path: pts(
      78, 48, 80, 60, 74, 70, 64, 76, 52, 80, 40, 78, 30, 72, 24, 62, 22, 50, 26, 40,
      22, 30, 28, 22, 40, 20, 50, 24, 58, 20, 66, 26, 70, 36, 76, 32, 82, 38, 80, 46,
    ),
    water: [pts(36, 36, 56, 32, 68, 40, 66, 56, 54, 64, 40, 60, 34, 48)],
    labels: [
      { name: "Memorial", x: 78, y: 64 },
      { name: "Anderson", x: 24, y: 58 },
      { name: "Stamford", x: 28, y: 24 },
    ],
  },
  "Yas Marina": {
    name: "Yas Marina",
    theme: { ...DESERT, water: "#12384c" },
    path: pts(
      28, 28, 44, 24, 58, 22, 70, 26, 78, 34, 80, 46, 74, 54, 78, 64, 72, 74, 60, 80,
      48, 78, 40, 70, 42, 60, 36, 52, 28, 54, 22, 48, 20, 38, 24, 30,
    ),
    water: [pts(44, 40, 64, 36, 72, 48, 68, 62, 54, 66, 46, 54)],
    labels: [
      { name: "Northern", x: 50, y: 22 },
      { name: "Marina", x: 76, y: 50 },
      { name: "Hotel", x: 42, y: 68 },
    ],
  },
};

export function genericPath(): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2 - Math.PI / 2;
    out.push({
      x: 50 + (34 + 6 * Math.sin(angle * 3)) * Math.cos(angle),
      y: 50 + (28 + 5 * Math.cos(angle * 2)) * Math.sin(angle),
    });
  }
  return out;
}

export function circuitDef(name: string): CircuitDef {
  return (
    CIRCUITS[name] ?? {
      name,
      path: genericPath(),
      water: [],
      labels: [],
      theme: GRASS,
    }
  );
}

export function pathForCircuit(name: string): TrackPoint[] {
  return circuitDef(name).path;
}

export interface FitTransform {
  minX: number;
  minY: number;
  scale: number;
  ox: number;
  oy: number;
}

export function makeFit(points: TrackPoint[], width: number, height: number, pad: number): FitTransform {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const scale = Math.min((width - pad * 2) / bw, (height - pad * 2) / bh);
  return {
    minX,
    minY,
    scale,
    ox: (width - bw * scale) / 2,
    oy: (height - bh * scale) / 2,
  };
}

export function applyFit(point: TrackPoint, fit: FitTransform): TrackPoint {
  return {
    x: fit.ox + (point.x - fit.minX) * fit.scale,
    y: fit.oy + (point.y - fit.minY) * fit.scale,
  };
}

export function resampleClosed(path: TrackPoint[], count: number): TrackPoint[] {
  if (path.length < 3) {
    return path.slice();
  }
  const out: TrackPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const f = t * path.length;
    const i1 = Math.floor(f) % path.length;
    const i0 = (i1 - 1 + path.length) % path.length;
    const i2 = (i1 + 1) % path.length;
    const i3 = (i1 + 2) % path.length;
    const local = f - Math.floor(f);
    out.push(catmull(path[i0], path[i1], path[i2], path[i3], local));
  }
  return out;
}

function catmull(p0: TrackPoint, p1: TrackPoint, p2: TrackPoint, p3: TrackPoint, t: number): TrackPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function pathLengths(path: TrackPoint[], closed = true): { lengths: number[]; total: number } {
  const lengths = [0];
  const last = closed ? path.length : path.length - 1;
  for (let i = 1; i <= last; i += 1) {
    const a = path[i - 1];
    const b = path[i % path.length];
    lengths.push(lengths[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { lengths, total: lengths[lengths.length - 1] ?? 1 };
}
