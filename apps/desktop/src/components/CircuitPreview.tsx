import { useEffect, useRef } from "react";
import type { JSX } from "react";
import { pathForCircuit } from "../utils/tracks";

interface CircuitPreviewProps {
  circuit: string;
}

export function CircuitPreview({ circuit }: CircuitPreviewProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, width, height);
    const raw = pathForCircuit(circuit);
    const padX = width * 0.1;
    const padY = height * 0.12;
    ctx.strokeStyle = "#2a3344";
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.beginPath();
    raw.forEach((point, index) => {
      const x = padX + point.x * (width - padX * 2);
      const y = padY + point.y * (height - padY * 2);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = "#9aa7bd";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(231,237,246,0.35)";
    ctx.font = "11px IBM Plex Mono";
    ctx.fillText(circuit.toUpperCase(), 14, height - 16);
  }, [circuit]);

  return (
    <div className="preview-track">
      <canvas ref={canvasRef} aria-label={`${circuit} outline`} />
    </div>
  );
}
