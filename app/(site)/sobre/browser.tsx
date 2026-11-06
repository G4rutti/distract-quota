"use client";

// A extensão do Chrome: digita o endereço, a porta desce por cima. Roda em loop pelos três sites quando está na tela.

import { useEffect, useRef, useState } from "react";
import { Mark } from "./logo";

const SITES = ["tiktok.com", "instagram.com", "x.com"];

export function Browser({ wait }: { wait: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const [gate, setGate] = useState(false);
  const [left, setLeft] = useState(wait);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTyped(SITES[2]);
      setGate(true);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    let running = false;
    let site = 0;
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    const run = () => {
      const url = SITES[site % SITES.length];
      site++;
      setGate(false);
      setTyped("");
      setLeft(wait);
      [...url].forEach((_, i) => later(() => setTyped(url.slice(0, i + 1)), 500 + i * 85));
      const typedAt = 500 + url.length * 85 + 350;
      later(() => setGate(true), typedAt);
      for (let s = 1; s <= 4; s++) later(() => setLeft(wait - s), typedAt + s * 1000);
      later(run, typedAt + 5200);
    };

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        running = true;
        run();
      } else if (!e.isIntersecting && running) {
        running = false;
        timers.forEach(clearTimeout);
        timers = [];
      }
    });
    io.observe(box.current!);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [wait]);

  return (
    <div ref={box} className="pt-browser" aria-hidden>
      <div className="flex items-center gap-3 border-b border-[var(--pt-line)] px-4 py-3">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[var(--pt-line)]" />
          <span className="size-3 rounded-full bg-[var(--pt-line)]" />
          <span className="size-3 rounded-full bg-[var(--pt-line)]" />
        </span>
        <span className="pt-mono flex h-9 min-w-0 flex-1 items-center rounded-full bg-[var(--pt-fog)] px-4 text-[13px]">
          <span className="text-[var(--pt-mute)]">https://</span>
          <span className="truncate">{typed}</span>
          {!gate && <span className="pt-caret" />}
        </span>
        <Mark size={22} ink="var(--pt-ink)" />
      </div>
      <div className="relative h-[clamp(260px,34vw,380px)] overflow-hidden">
        {/* a página por trás, só em blocos */}
        <div className="grid h-full grid-cols-[1fr_2fr_1fr] gap-4 p-5 opacity-60">
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-3 rounded bg-[var(--pt-fog)]" style={{ width: `${60 + ((i * 17) % 40)}%` }} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <span className="h-[55%] rounded-md bg-[var(--pt-fog)]" />
            <span className="h-3 w-3/4 rounded bg-[var(--pt-fog)]" />
            <span className="h-3 w-1/2 rounded bg-[var(--pt-fog)]" />
          </div>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-14 rounded-md bg-[var(--pt-fog)]" />
            ))}
          </div>
        </div>
        {/* a porta */}
        <div
          className="absolute inset-0 flex flex-col items-start justify-end gap-3 bg-[var(--pt-red)] p-6 sm:p-8"
          style={{
            transform: gate ? "translateY(0)" : "translateY(-101%)",
            transition: "transform 650ms var(--pt-ease)",
          }}
        >
          <span className="pt-label">Porteiro · {typed}</span>
          <span className="pt-display text-[clamp(3rem,6vw,5rem)]">
            Espera <span className="tabular-nums text-[var(--pt-paper)]">{Math.max(0, left)}</span>s
          </span>
          <span className="max-w-[36ch] text-[15px] leading-[1.5]">O passe liberado no celular vale aqui também, e o tempo soma no mesmo limite.</span>
        </div>
      </div>
    </div>
  );
}
