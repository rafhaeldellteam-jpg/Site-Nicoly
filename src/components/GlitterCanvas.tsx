"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
  isStar: boolean;
}

const CORES = ["#d8a37d", "#f0cbb0", "#ffffff", "#b8825c"];

export default function GlitterCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let raf = 0;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };

    const reset = (p: Particle, inicial: boolean) => {
      p.x = Math.random() * canvas.width;
      p.y = inicial ? Math.random() * canvas.height : Math.random() * -100;
      p.size = Math.random() * 2.8 + 0.8;
      p.speedY = Math.random() * 0.9 + 0.3;
      p.speedX = Math.random() * 0.5 - 0.25;
      p.opacity = Math.random() * 0.8 + 0.2;
      p.fadeSpeed = Math.random() * 0.015 + 0.005;
      p.color = CORES[Math.floor(Math.random() * CORES.length)];
      p.isStar = Math.random() > 0.7;
    };

    const draw = (p: Particle) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;

      if (p.isStar) {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 2);
        ctx.lineTo(p.x + s * 0.5, p.y - s * 0.5);
        ctx.lineTo(p.x + s * 2, p.y);
        ctx.lineTo(p.x + s * 0.5, p.y + s * 0.5);
        ctx.lineTo(p.x, p.y + s * 2);
        ctx.lineTo(p.x - s * 0.5, p.y + s * 0.5);
        ctx.lineTo(p.x - s * 2, p.y);
        ctx.lineTo(p.x - s * 0.5, p.y - s * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += p.fadeSpeed;
        if (p.opacity >= 1 || p.opacity <= 0.15) p.fadeSpeed = -p.fadeSpeed;
        if (p.y > canvas.height + 10) reset(p, false);
        draw(p);
      }
      raf = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    particles = Array.from({ length: 70 }, () => {
      const p = {} as Particle;
      reset(p, true);
      return p;
    });
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}
