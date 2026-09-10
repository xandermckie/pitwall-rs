import { useEffect, useRef } from "react";
import type { JSX } from "react";
import type { MonteCarloReport } from "../types/sim";

interface PositionHistogramProps {
  report: MonteCarloReport;
  thisRun: number;
}

export function PositionHistogram({ report, thisRun }: PositionHistogramProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? 600;
    const height = parent?.clientHeight ?? 220;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = "#10141c";
    ctx.fillRect(0, 0, width, height);
    const pad = { top: 16, right: 16, bottom: 28, left: 28 };
    const max = Math.max(...report.positionHistogram, 1);
    const barW = (width - pad.left - pad.right) / 20;
    report.positionHistogram.forEach((count, index) => {
      const h = (count / max) * (height - pad.top - pad.bottom);
      const x = pad.left + index * barW;
      const y = height - pad.bottom - h;
      ctx.fillStyle = index + 1 === thisRun ? "#c4453c" : "#4d8ecf";
      ctx.fillRect(x + 2, y, barW - 4, h);
    });
    ctx.fillStyle = "rgba(231,237,246,0.45)";
    ctx.font = "10px IBM Plex Mono";
    ctx.textAlign = "center";
    for (let i = 0; i < 20; i += 1) {
      if ((i + 1) % 2 === 0) {
        ctx.fillText(`P${i + 1}`, pad.left + i * barW + barW / 2, height - 10);
      }
    }
  }, [report, thisRun]);

  return (
    <div className="histogram">
      <canvas ref={canvasRef} aria-label="Finish position histogram" />
    </div>
  );
}
