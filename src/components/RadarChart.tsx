import { useEffect, useRef } from "react";
import type { Metrics } from "../types";

type RadarChartProps = {
  metrics: Metrics;
  labels: string[];
};

export default function RadarChart({ metrics, labels }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 76;
    const values = [metrics.affection, metrics.chemistry, metrics.understanding].map((v) => v / 100);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(143,117,212,0.35)";
    ctx.fillStyle = "rgba(143,117,212,0.1)";

    for (let r = 1; r <= 4; r++) {
      const rr = (radius * r) / 4;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
        const x = centerX + Math.cos(angle) * rr;
        const y = centerY + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
      const x = centerX + Math.cos(angle) * radius * values[i];
      const y = centerY + Math.sin(angle) * radius * values[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255,123,169,0.35)";
    ctx.strokeStyle = "rgba(255,123,169,0.95)";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "currentColor";
    ctx.font = "12px Quicksand";
    labels.forEach((label, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 3;
      const x = centerX + Math.cos(angle) * (radius + 24);
      const y = centerY + Math.sin(angle) * (radius + 24);
      ctx.fillText(label, x - 22, y + 4);
    });
  }, [labels, metrics]);

  return <canvas id="radar-canvas" ref={canvasRef} width="280" height="220" />;
}
