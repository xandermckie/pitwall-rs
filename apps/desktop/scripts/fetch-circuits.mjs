/**
 * Downloads satellite-digitized F1 circuit LineStrings and writes
 * local-coordinate polylines for the desktop map.
 *
 * Source: https://github.com/bacinger/f1-circuits (GeoJSON track traces)
 */
const CIRCUITS = [
  { id: "au-1953", name: "Albert Park" },
  { id: "cn-2004", name: "Shanghai" },
  { id: "jp-1962", name: "Suzuka" },
  { id: "bh-2002", name: "Bahrain Int'l" },
  { id: "sa-2021", name: "Jeddah Corniche" },
  { id: "es-1991", name: "Barcelona" },
  { id: "mc-1929", name: "Monte Carlo" },
  { id: "ca-1978", name: "Gilles Villeneuve" },
  { id: "gb-1948", name: "Silverstone" },
  { id: "it-1922", name: "Monza" },
  { id: "sg-2008", name: "Marina Bay" },
  { id: "ae-2009", name: "Yas Marina" },
];

const OUT = new URL("../src/data/circuit-paths.json", import.meta.url);

async function main() {
  const result = {};
  for (const circuit of CIRCUITS) {
    const url = `https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits/${circuit.id}.geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed ${circuit.id}: ${response.status}`);
    }
    const geo = await response.json();
    const coords = geo.features[0].geometry.coordinates;
    result[circuit.name] = project(coords);
    console.log(`${circuit.name}: ${result[circuit.name].length} points`);
  }
  await import("node:fs/promises").then(async (fs) => {
    await fs.mkdir(new URL(".", OUT), { recursive: true });
    await fs.writeFile(OUT, JSON.stringify(result), "utf8");
  });
  console.log(`wrote ${OUT.pathname}`);
}

function project(coords) {
  const closed =
    coords.length > 1 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords.slice(0, -1)
      : coords;
  const lat0 = closed.reduce((sum, c) => sum + c[1], 0) / closed.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const raw = closed.map(([lon, lat]) => ({
    x: lon * k,
    y: -lat,
  }));
  const minX = Math.min(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y));
  const maxX = Math.max(...raw.map((p) => p.x));
  const maxY = Math.max(...raw.map((p) => p.y));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = 100 / Math.max(w, h);
  return raw.map((p) => ({
    x: round((p.x - minX) * scale),
    y: round((p.y - minY) * scale),
  }));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
