import { useEffect, useRef } from "react";
import type { JSX } from "react";

interface LiveChartsProps {
  gap: number;
  tyreDelta: number;
  lapTime: number;
  resetKey: string;
}

const HISTORY = 45;

export function LiveCharts({ gap, tyreDelta, lapTime, resetKey }: LiveChartsProps): JSX.Element {
  const gapRef = useRef<HTMLCanvasElement | null>(null);
  const degRef = useRef<HTMLCanvasElement | null>(null);
  const lapRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef({ gap: [] as number[], deg: [] as number[], lap: [] as number[] });

  useEffect(() => {
    historyRef.current = { gap: [], deg: [], lap: [] };
  }, [resetKey]);

  useEffect(() => {
    const hist = historyRef.current;
    hist.gap.push(gap);
    hist.deg.push(tyreDelta);
    hist.lap.push(lapTime);
    if (hist.gap.length > HISTORY) hist.gap.shift();
    if (hist.deg.length > HISTORY) hist.deg.shift();
    if (hist.lap.length > HISTORY) hist.lap.shift();
    drawChart(gapRef.current, hist.gap, "#4d8ecf", false);
    drawChart(degRef.current, hist.deg, "#d7b15a", true);
    drawChart(lapRef.current, hist.lap, "#3dba7e", false);
  }, [gap, tyreDelta, lapTime]);

  return (
    <div className="chart-strip">
      <div className="chart-box">
        <div className="chart-label">Gap to leader (s)</div>
        <canvas ref={gapRef} />
      </div>
      <div className="chart-box">
        <div className="chart-label">Tyre delta (s)</div>
        <canvas ref={degRef} />
      </div>
      <div className="chart-box">
        <div className="chart-label">Lap time (s)</div>
        <canvas ref={lapRef} />
      </div>
    </div>
  );
}

function drawChart(
  canvas: HTMLCanvasElement | null,
  data: number[],
  color: string,
  zeroCentre: boolean,
): void {
  if (!canvas || data.length < 2) {
    return;
  }
  const parent = canvas.parentElement;
  const width = parent?.clientWidth ?? 200;
  const height = (parent?.clientHeight ?? 120) - 22;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const pad = { top: 8, right: 10, bottom: 16, left: 36 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, width, height);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 0.2);
  const lo = min - range * 0.1;
  const hi = max + range * 0.1;
  const toY = (value: number): number => pad.top + ch * (1 - (value - lo) / (hi - lo));
  const toX = (i: number): number => pad.left + (i / (data.length - 1)) * cw;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "9px IBM Plex Mono";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i += 1) {
    const value = lo + (i / 4) * (hi - lo);
    const y = toY(value);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + cw, y);
    ctx.stroke();
    ctx.fillText(value.toFixed(1), pad.left - 4, y + 3);
  }
  ctx.beginPath();
  data.forEach((value, i) => {
    const x = toX(i);
    const y = toY(value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (zeroCentre && lo < 0 && hi > 0) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(pad.left, toY(0));
    ctx.lineTo(pad.left + cw, toY(0));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
