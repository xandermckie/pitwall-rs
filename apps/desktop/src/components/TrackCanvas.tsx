import { useEffect, useRef } from "react";
import type { JSX } from "react";
import type { LapSnapshot } from "../types/sim";
import { driverCode } from "../utils/format";
import { paintCircuit } from "../utils/trackRender";
import { pathLengths, type TrackPoint } from "../utils/tracks";

interface TrackCanvasProps {
  circuit: string;
  snap: LapSnapshot | null;
  focusId: number | null;
  scrub: boolean;
  overtakeIds: number[];
  battleIds: number[];
  isFinish: boolean;
  totalLaps: number;
}

const LAP_REF = 92;
const TRAIL = 10;

interface PlacedCar {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
  position: number;
  driver: string;
  isUser: boolean;
  isLead: boolean;
  drs: boolean;
  pitting: boolean;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export function TrackCanvas({
  circuit,
  snap,
  focusId,
  scrub,
  overtakeIds,
  battleIds,
  isFinish,
  totalLaps,
}: TrackCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const snapRef = useRef<LapSnapshot | null>(snap);
  const focusRef = useRef<number | null>(focusId);
  const battleRef = useRef<Set<number>>(new Set(battleIds));
  const finishRef = useRef(isFinish);
  const totalRef = useRef(totalLaps);
  const flashStart = useRef(0);
  const flashIds = useRef<Set<number>>(new Set());
  const phaseTarget = useRef(0);
  const phaseCurrent = useRef(0);

  useEffect(() => {
    snapRef.current = snap;
    if (snap) {
      phaseTarget.current = snap.lap;
      if (scrub) {
        phaseCurrent.current = snap.lap;
      }
    }
  }, [snap, scrub]);

  useEffect(() => {
    focusRef.current = focusId;
  }, [focusId]);

  useEffect(() => {
    battleRef.current = new Set(battleIds);
  }, [battleIds]);

  useEffect(() => {
    finishRef.current = isFinish;
    totalRef.current = totalLaps;
  }, [isFinish, totalLaps]);

  useEffect(() => {
    if (overtakeIds.length === 0) {
      return;
    }
    flashStart.current = performance.now();
    flashIds.current = new Set(overtakeIds);
  }, [overtakeIds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return undefined;
    }
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      return undefined;
    }

    let offscreen = document.createElement("canvas");
    let scaled: TrackPoint[] = [];
    let lengths: number[] = [];
    let total = 0;
    let raf = 0;
    let last = 0;
    const trails = new Map<number, TrackPoint[]>();
    const rain: RainDrop[] = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = (): void => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const layer = offscreen.getContext("2d", { alpha: false });
      if (!layer) {
        return;
      }
      scaled = paintCircuit(layer, canvas.width, canvas.height, circuit);
      const measured = pathLengths(scaled, true);
      lengths = measured.lengths;
      total = measured.total;
      rain.length = 0;
      for (let i = 0; i < 48; i += 1) {
        rain.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          len: 6 + Math.random() * 10,
          speed: 4 + Math.random() * 6,
        });
      }
    };

    const positionAt = (t: number): TrackPoint => {
      const target = (((t % 1) + 1) % 1) * total;
      let lo = 0;
      let hi = lengths.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (lengths[mid] <= target) lo = mid;
        else hi = mid;
      }
      const seg = lengths[hi] - lengths[lo];
      const frac = seg > 0 ? (target - lengths[lo]) / seg : 0;
      const a = scaled[lo % scaled.length];
      const b = scaled[hi % scaled.length];
      return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
    };

    const frame = (ts: number): void => {
      raf = requestAnimationFrame(frame);
      if (ts - last < 14) return;
      last = ts;
      ctx.drawImage(offscreen, 0, 0);
      const current = snapRef.current;
      if (!current || scaled.length === 0) return;

      if (current.inSc) {
        const pulse = reduceMotion ? 0.1 : 0.08 + 0.07 * Math.sin(ts / 220);
        ctx.fillStyle = `rgba(215,177,90,${pulse})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (current.isRaining) {
        ctx.fillStyle = "rgba(77,142,207,0.08)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!reduceMotion) {
          ctx.strokeStyle = "rgba(170,200,230,0.28)";
          ctx.lineWidth = 1;
          for (const drop of rain) {
            drop.y += drop.speed;
            drop.x += 0.6;
            if (drop.y > canvas.height) {
              drop.y = -drop.len;
              drop.x = Math.random() * canvas.width;
            }
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - 1.4, drop.y + drop.len);
            ctx.stroke();
          }
        }
      }

      phaseCurrent.current += (phaseTarget.current - phaseCurrent.current) * 0.12;
      const placed: PlacedCar[] = current.cars.map((car) => {
        const t = (((phaseCurrent.current - car.gap / LAP_REF) % 1) + 1) % 1;
        const pos = positionAt(t);
        const ahead = positionAt(t + 0.004);
        const trail = trails.get(car.id) ?? [];
        trail.push(pos);
        if (trail.length > TRAIL) trail.shift();
        trails.set(car.id, trail);
        return {
          id: car.id,
          x: pos.x,
          y: pos.y,
          angle: Math.atan2(ahead.y - pos.y, ahead.x - pos.x),
          color: car.color,
          position: car.position,
          driver: car.driver,
          isUser: car.isUser,
          isLead: car.isLead || car.position === 1,
          drs: car.drs,
          pitting: car.pitting,
        };
      });
      const byPos = new Map(placed.map((item) => [item.position, item]));
      const isHi = (car: PlacedCar): boolean => car.isUser || car.id === focusRef.current;

      for (const item of placed) {
        const trail = trails.get(item.id);
        if (!trail || trail.length < 2) continue;
        ctx.strokeStyle = `${item.color}55`;
        ctx.lineWidth = isHi(item) ? 3 : 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        trail.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
        ctx.stroke();
      }

      ctx.setLineDash([4, 4]);
      for (const item of placed) {
        const ahead = byPos.get(item.position - 1);
        if (!ahead) continue;
        const battling = battleRef.current.has(item.id) && battleRef.current.has(ahead.id);
        if (!item.drs && !battling) continue;
        ctx.strokeStyle = battling ? "rgba(215,177,90,0.7)" : "rgba(61,186,126,0.5)";
        ctx.lineWidth = battling ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(ahead.x, ahead.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const flashAge = ts - flashStart.current;
      if (flashAge < 700) {
        const radius = 10 + flashAge / 18;
        const alpha = 0.7 * (1 - flashAge / 700);
        ctx.lineWidth = 2;
        for (const item of placed) {
          if (!flashIds.current.has(item.id)) continue;
          ctx.beginPath();
          ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(61,186,126,${alpha})`;
          ctx.stroke();
        }
      }

      const drawCar = (item: PlacedCar, highlighted: boolean): void => {
        const size = highlighted ? 9 : 6.2;
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.angle);
        if (item.isLead) {
          ctx.beginPath();
          ctx.arc(0, 0, size + 6, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fill();
        }
        if (highlighted) {
          ctx.beginPath();
          ctx.arc(0, 0, size + 5, 0, Math.PI * 2);
          ctx.fillStyle = `${item.color}33`;
          ctx.fill();
        }
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.roundRect(-size, -size * 0.4, size * 2, size * 0.8, 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(-size * 0.1, -size * 0.22, size * 0.55, size * 0.44);
        ctx.strokeStyle = item.drs
          ? "rgba(61,186,126,0.95)"
          : highlighted
            ? "rgba(255,255,255,0.9)"
            : "rgba(255,255,255,0.25)";
        ctx.lineWidth = highlighted ? 1.6 : 1;
        ctx.stroke();
        if (item.pitting) {
          ctx.beginPath();
          ctx.arc(0, 0, size + 7, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(215,177,90,0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      };

      for (const item of [...placed].reverse()) {
        if (isHi(item)) continue;
        drawCar(item, false);
      }
      for (const item of [...placed].reverse()) {
        if (!isHi(item)) continue;
        drawCar(item, true);
      }

      ctx.font = "bold 9px IBM Plex Sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      for (const item of placed) {
        const labeled =
          item.position <= 6 || isHi(item) || battleRef.current.has(item.id) || flashIds.current.has(item.id);
        if (!labeled) continue;
        const lift = isHi(item) ? 16 : 12;
        ctx.fillText(driverCode(item.driver), item.x, item.y - lift);
      }

      ctx.textAlign = "left";
      ctx.font = "10px IBM Plex Mono";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(`LAP ${current.lap}`, 14, canvas.height - 14);
      if (current.inSc) {
        ctx.fillStyle = "rgba(215,177,90,0.9)";
        ctx.fillText("SAFETY CAR", 86, canvas.height - 14);
      } else if (current.isRaining) {
        ctx.fillStyle = "rgba(77,142,207,0.9)";
        ctx.fillText("RAIN", 86, canvas.height - 14);
      }

      const lastLap = current.lap === totalRef.current && totalRef.current > 0;
      if (finishRef.current || lastLap) {
        ctx.textAlign = "center";
        ctx.font = "bold 13px IBM Plex Sans";
        ctx.fillStyle = finishRef.current ? "rgba(231,237,246,0.9)" : "rgba(196,69,60,0.92)";
        ctx.fillText(finishRef.current ? "CHEQUERED FLAG" : "LAST LAP", canvas.width / 2, 22);
      }
    };

    resize();
    const onResize = (): void => resize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(frame);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [circuit]);

  return (
    <div className="track-wrap" ref={wrapRef}>
      <canvas id="track-canvas" ref={canvasRef} />
    </div>
  );
}
