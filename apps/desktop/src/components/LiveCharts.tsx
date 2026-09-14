import { useEffect, useRef } from "react";
import type { JSX } from "react";
import type { ChartHistory } from "../utils/chartHistory";

interface LiveChartsProps {
  history: ChartHistory;
}

export function LiveCharts({ history }: LiveChartsProps): JSX.Element {
  const gapRef = useRef<HTMLCanvasElement | null>(null);
  const degRef = useRef<HTMLCanvasElement | null>(null);
  const lapRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ChartHistory>({ gap: [], tyreDelta: [], lapTime: [] });

  useEffect(() => {
    historyRef.current = history;
    drawChart(gapRef.current, history.gap, "#4d8ecf", false);
    drawChart(degRef.current, history.tyreDelta, "#d7b15a", true);
    drawChart(lapRef.current, history.lapTime, "#3dba7e", false);
  }, [history]);

  useEffect(() => {
    const drawCharts = (): void => {
      const hist = historyRef.current;
      drawChart(gapRef.current, hist.gap, "#4d8ecf", false);
      drawChart(degRef.current, hist.tyreDelta, "#d7b15a", true);
      drawChart(lapRef.current, hist.lapTime, "#3dba7e", false);
    };
    const resizeObserver = new ResizeObserver(drawCharts);
    const canvases = [gapRef.current, degRef.current, lapRef.current];
    for (const canvas of canvases) {
      if (canvas) {
        resizeObserver.observe(canvas);
      }
    }
    drawCharts();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
  if (!canvas) {
    return;
  }
  const width = Math.floor(canvas.clientWidth);
  const height = Math.floor(canvas.clientHeight);
  if (width < 1 || height < 1) {
    return;
  }
  const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
  const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, width, height);
  if (data.length < 2) {
    return;
  }

  const pad = { top: 8, right: 10, bottom: 16, left: 36 };
  const cw = Math.max(1, width - pad.left - pad.right);
  const ch = Math.max(1, height - pad.top - pad.bottom);
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
