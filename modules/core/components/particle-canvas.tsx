"use client";

import { useEffect, useRef } from "react";

const ACCENT_RGB = "45, 212, 191";

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const c = canvas;
    const cx = ctx;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const NUM = 150;
    const CONNECT = 110;
    const REPEL = 120;
    const CENTER_X = c.width / 2;
    const CENTER_Y = 400;
    const CENTER_ZONE = 400;

    const COLORS = [
      `rgba(${ACCENT_RGB}, 0.4)`,
      "rgba(16,185,129,0.3)",
      "rgba(99,102,241,0.2)",
      "rgba(255,255,255,0.15)",
    ];

    const particles = Array.from({ length: NUM }, (_, i) => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r: i < 5 ? Math.random() * 1.5 + 2.5 : Math.random() * 1.2 + 0.3,
      color: COLORS[i % COLORS.length],
    }));

    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    function draw() {
      const W = c.width;
      const H = c.height;
      cx.clearRect(0, 0, W, H);

      for (const p of particles) {
        // Mouse repulsion (stronger)
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const d = Math.hypot(dx, dy);
        if (d < REPEL && d > 0) {
          const f = ((REPEL - d) / REPEL) * 0.82;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        // Weak center attraction
        const cdx = CENTER_X - p.x;
        const cdy = CENTER_Y - p.y;
        const cd = Math.hypot(cdx, cdy);
        if (cd > 0) {
          const af = 0.0002 * cd;
          p.vx += (cdx / cd) * af;
          p.vy += (cdy / cd) * af;
        }
        p.vx *= 0.975;
        p.vy *= 0.975;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fillStyle = (p as typeof particles[0]).color ?? `rgba(${ACCENT_RGB}, 0.42)`;
        cx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.hypot(dx, dy);
          if (d < CONNECT) {
            cx.beginPath();
            cx.moveTo(particles[i].x, particles[i].y);
            cx.lineTo(particles[j].x, particles[j].y);
            cx.strokeStyle = `rgba(${ACCENT_RGB}, ${(1 - d / CONNECT) * 0.16})`;
            cx.lineWidth = 0.5;
            cx.stroke();
          }
          // Faint web lines near center
          if (d < 80 && d > 0) {
            const pi_cd = Math.hypot(particles[i].x - CENTER_X, particles[i].y - CENTER_Y);
            const pj_cd = Math.hypot(particles[j].x - CENTER_X, particles[j].y - CENTER_Y);
            if (pi_cd < CENTER_ZONE && pj_cd < CENTER_ZONE) {
              cx.beginPath();
              cx.moveTo(particles[i].x, particles[i].y);
              cx.lineTo(particles[j].x, particles[j].y);
              cx.strokeStyle = `rgba(${ACCENT_RGB}, 0.06)`;
              cx.lineWidth = 0.3;
              cx.stroke();
            }
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
