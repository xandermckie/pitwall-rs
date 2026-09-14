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
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;
    const draw = (width: number, height: number): void => {
      const nextWidth = Math.floor(width);
      const nextHeight = Math.floor(height);
      const nextPixelRatio = Math.max(1, window.devicePixelRatio || 1);
      if (
        nextWidth < 1 ||
        nextHeight < 1 ||
        (nextWidth === canvasWidth &&
          nextHeight === canvasHeight &&
          nextPixelRatio === pixelRatio)
      ) {
        return;
      }

      canvasWidth = nextWidth;
      canvasHeight = nextHeight;
      pixelRatio = nextPixelRatio;
      canvas.width = Math.max(1, Math.round(canvasWidth * pixelRatio));
      canvas.height = Math.max(1, Math.round(canvasHeight * pixelRatio));
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      paintCircuit(ctx, canvasWidth, canvasHeight, circuit);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        draw(entry.contentRect.width, entry.contentRect.height);
      }
    });
    draw(parent.clientWidth, parent.clientHeight);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [circuit]);

  return (
    <div className="preview-track">
      <canvas ref={canvasRef} aria-label={`${circuit} outline`} />
    </div>
  );
}
