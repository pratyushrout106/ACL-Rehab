import React, { useEffect, useRef } from 'react';

interface ConfettiCanvasProps {
  active: boolean;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  color: string;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
  gravity: number;
  drag: number;
}

const CONFETTI_COLORS = [
  '#10b981', // emerald
  '#00f2fe', // cyan
  '#3b82f6', // blue
  '#f59e0b', // gold/amber
  '#f43f5e', // coral rose
  '#a855f7', // purple
  '#eab308', // bright yellow
  '#ffffff'  // white sparkle
];

export function ConfettiCanvas({ active, durationMs = 4000 }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const startTime = Date.now();

    // Set canvas size to parent container
    const width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    const height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Generate ~110 celebratory confetti particles
    const particles: Particle[] = [];
    const count = 110;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI / 2; // outward spread
      const speed = Math.random() * 12 + 6;
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 80,
        y: height * 0.45 + (Math.random() - 0.5) * 60,
        w: Math.random() * 9 + 6,
        h: Math.random() * 14 + 8,
        vx: Math.sin(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 1.3,
        vy: -Math.cos(angle) * speed - Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.28,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        shape: Math.random() > 0.35 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'star',
        opacity: 1,
        gravity: 0.38 + Math.random() * 0.15,
        drag: 0.985
      });
    }

    const render = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / durationMs;

      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;

      for (const p of particles) {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        if (progress > 0.65) {
          p.opacity = Math.max(0, 1 - (progress - 0.65) / 0.35);
        }

        if (p.opacity > 0 && p.y < height + 40) {
          aliveCount++;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;

          if (p.shape === 'rect') {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          } else if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Star
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(Math.cos((18 + s * 72) * Math.PI / 180) * p.w, -Math.sin((18 + s * 72) * Math.PI / 180) * p.w);
              ctx.lineTo(Math.cos((54 + s * 72) * Math.PI / 180) * (p.w / 2), -Math.sin((54 + s * 72) * Math.PI / 180) * (p.w / 2));
            }
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      }

      if (progress < 1 && aliveCount > 0) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      if (ctx) ctx.clearRect(0, 0, width, height);
    };
  }, [active, durationMs]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50
      }}
    />
  );
}

export default ConfettiCanvas;
