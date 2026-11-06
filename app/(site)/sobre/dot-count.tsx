"use client";

// Contagem de 10 a 0 com números feitos de pontos que se rearranjam a cada segundo.
// Técnica do "Dotted Countdown" de davidope (garimpado no Godly/Recent Design), com o anel de 60 pontos marcando o tempo.

import { useEffect, useRef } from "react";

type P = { x: number; y: number; tx: number; ty: number; a: number; ta: number };

export function DotCount({ seconds, total = 10, size = 220, color = "#16181D", accent = "#2F7BEF" }: {
  seconds: number;
  total?: number;
  size?: number;
  color?: string;
  accent?: string;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ parts: P[]; shapes: Map<string, [number, number][]>; target: number }>({
    parts: [],
    shapes: new Map(),
    target: seconds,
  });
  state.current.target = seconds;

  useEffect(() => {
    const canvas = cv.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = state.current;
    let raf = 0;
    let alive = true;
    let shownKey = "";

    const sample = (txt: string) => {
      const cached = st.shapes.get(txt);
      if (cached) return cached;
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const o = off.getContext("2d")!;
      o.fillStyle = "#000";
      o.textAlign = "center";
      o.textBaseline = "middle";
      // a condensada é estreita demais pra virar pontos: alarga 1,6x na horizontal
      o.font = `900 ${Math.round(size * 0.6)}px "Sofia Sans Extra Condensed Variable", "Arial Narrow", sans-serif`;
      o.setTransform(1.6, 0, 0, 1, (size / 2) * (1 - 1.6), 0);
      o.fillText(txt, size / 2, size / 2 + size * 0.04);
      const data = o.getImageData(0, 0, size, size).data;
      const pts: [number, number][] = [];
      const step = Math.max(4, Math.round(size / 46));
      for (let y = 0; y < size; y += step)
        for (let x = 0; x < size; x += step) if (data[(y * size + x) * 4 + 3] > 128) pts.push([x, y]);
      st.shapes.set(txt, pts);
      return pts;
    };

    const retarget = (txt: string) => {
      const pts = sample(txt);
      while (st.parts.length < pts.length)
        st.parts.push({ x: size / 2, y: size / 2, tx: size / 2, ty: size / 2, a: 0, ta: 0 });
      // embaralha a ordem pra os pontos cruzarem a tela ao trocar de número
      const order = st.parts.map((_, i) => i).sort(() => Math.random() - 0.5);
      order.forEach((pi, k) => {
        const p = st.parts[pi];
        if (k < pts.length) {
          p.tx = pts[k][0];
          p.ty = pts[k][1];
          p.ta = 1;
        } else {
          const ang = Math.random() * Math.PI * 2;
          p.tx = size / 2 + Math.cos(ang) * size * 0.6;
          p.ty = size / 2 + Math.sin(ang) * size * 0.6;
          p.ta = 0;
        }
        if (reduce) {
          p.x = p.tx;
          p.y = p.ty;
          p.a = p.ta;
        }
      });
    };

    const frame = () => {
      if (!alive) return;
      const key = String(Math.max(0, Math.ceil(st.target)));
      if (key !== shownKey) {
        shownKey = key;
        retarget(key);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // anel: 60 pontos, os que restam ficam acesos
      const left = Math.max(0, st.target) / total;
      const ringR = size * 0.47;
      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const on = i / 60 < left;
        ctx.fillStyle = on ? accent : "rgba(22,24,29,0.14)";
        ctx.beginPath();
        ctx.arc(size / 2 + Math.cos(ang) * ringR, size / 2 + Math.sin(ang) * ringR, on ? 2.2 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const r = Math.max(1.1, size / 120);
      for (const p of st.parts) {
        p.x += (p.tx - p.x) * 0.14;
        p.y += (p.ty - p.y) * 0.14;
        p.a += (p.ta - p.a) * 0.18;
        if (p.a < 0.02) continue;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    document.fonts.load(`860 40px "Sofia Sans Extra Condensed Variable"`).finally(() => {
      st.shapes.clear();
      raf = requestAnimationFrame(frame);
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [size, total, color, accent]);

  return <canvas ref={cv} style={{ width: size, height: size }} aria-hidden />;
}
