import { useEffect, useRef } from "react";
import type { JSX } from "react";
import { paintCircuit } from "../utils/trackRender";

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
    paintCircuit(ctx, width, height, circuit);
  }, [circuit]);

  return (
    <div className="preview-track">
      <canvas ref={canvasRef} aria-label={`${circuit} outline`} />
    </div>
  );
}
