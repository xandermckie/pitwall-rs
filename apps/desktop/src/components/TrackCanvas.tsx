import { useEffect, useRef } from "react";
import type { JSX } from "react";
import type { LapSnapshot } from "../types/sim";
import { pathForCircuit, type TrackPoint } from "../utils/tracks";

interface TrackCanvasProps {
  circuit: string;
  snap: LapSnapshot | null;
  focusId: number | null;
  scrub: boolean;
}

const LAP_REF = 92;

export function TrackCanvas({ circuit, snap, focusId, scrub }: TrackCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const snapRef = useRef<LapSnapshot | null>(snap);
  const focusRef = useRef<number | null>(focusId);
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

    const resize = (): void => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      const raw = pathForCircuit(circuit);
      const padX = canvas.width * 0.08;
      const padY = canvas.height * 0.1;
      const drawW = canvas.width - padX * 2;
      const drawH = canvas.height - padY * 2;
      scaled = raw.map((point) => ({ x: padX + point.x * drawW, y: padY + point.y * drawH }));
      lengths = [0];
      for (let i = 1; i < scaled.length; i += 1) {
        const dx = scaled[i].x - scaled[i - 1].x;
        const dy = scaled[i].y - scaled[i - 1].y;
        lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
      }
      total = lengths[lengths.length - 1] ?? 1;
      offscreen = bake(canvas.width, canvas.height, scaled, circuit);
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
      const a = scaled[lo];
      const b = scaled[Math.min(hi, scaled.length - 1)];
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
        ctx.fillStyle = "rgba(215,177,90,0.06)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (current.isRaining) {
        ctx.fillStyle = "rgba(77,142,207,0.07)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      phaseCurrent.current += (phaseTarget.current - phaseCurrent.current) * 0.12;
      const placed = current.cars.map((car) => {
        const t = (((phaseCurrent.current - car.gap / LAP_REF) % 1) + 1) % 1;
        return { car, ...positionAt(t) };
      });
      const byPos = new Map(placed.map((item) => [item.car.position, item]));
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 3]);
      for (const item of placed) {
        if (!item.car.drs) continue;
        const ahead = byPos.get(item.car.position - 1);
        if (!ahead) continue;
        ctx.strokeStyle = "rgba(61,186,126,0.55)";
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
        ctx.lineTo(ahead.x, ahead.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const isHi = (id: number, user: boolean): boolean => user || id === focusRef.current;
      for (const item of [...placed].reverse()) {
        if (isHi(item.car.id, item.car.isUser)) continue;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 5.2, 0, Math.PI * 2);
        ctx.fillStyle = item.car.color;
        ctx.fill();
        ctx.strokeStyle = item.car.drs ? "rgba(61,186,126,0.9)" : "rgba(255,255,255,0.2)";
        ctx.stroke();
      }
      for (const item of [...placed].reverse()) {
        if (!isHi(item.car.id, item.car.isUser)) continue;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = `${item.car.color}33`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(item.x, item.y, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = item.car.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (item.car.pitting) {
          ctx.beginPath();
          ctx.arc(item.x, item.y, 15, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(215,177,90,0.9)";
          ctx.stroke();
        }
      }
      ctx.font = "bold 9px IBM Plex Sans";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      for (const item of placed) {
        if (item.car.position > 5 && !isHi(item.car.id, item.car.isUser)) continue;
        const radius = isHi(item.car.id, item.car.isUser) ? 9 : 5.5;
        ctx.fillText(`P${item.car.position}`, item.x, item.y - radius - 6);
      }
      ctx.textAlign = "left";
      ctx.font = "10px IBM Plex Mono";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(`LAP ${current.lap}`, 14, canvas.height - 14);
      if (current.inSc) {
        ctx.fillStyle = "rgba(215,177,90,0.8)";
        ctx.fillText("SAFETY CAR", 86, canvas.height - 14);
      } else if (current.isRaining) {
        ctx.fillStyle = "rgba(77,142,207,0.85)";
        ctx.fillText("RAIN", 86, canvas.height - 14);
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

function bake(width: number, height: number, scaled: TrackPoint[], circuit: string): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const ctx = off.getContext("2d", { alpha: false });
  if (!ctx) {
    return off;
  }
  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let x = 18; x < width; x += 36) {
    for (let y = 18; y < height; y += 36) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const stroke = (lineWidth: number, color: string, dash: number[] = []): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    scaled.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  };
  stroke(28, "#151b24");
  stroke(20, "#1c2430");
  stroke(1, "rgba(255,255,255,0.08)", [5, 12]);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.font = "11px IBM Plex Mono";
  ctx.fillText(circuit.toUpperCase(), 14, height - 32);
  return off;
}
