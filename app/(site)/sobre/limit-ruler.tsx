"use client";

// O limite que cai semana a semana, como uma régua de minutos.
// Os numerais com traços vêm do reel "YES" do Contemporary Type (garimpado no Godly/Recent Design).
// Os valores chegam prontos de perAppLimit(), a mesma função que o app usa.

import { useEffect, useRef, useState } from "react";

export function LimitRuler({ weeks, start, floor, cut }: { weeks: number[]; start: number; floor: number; cut: number }) {
  const section = useRef<HTMLElement>(null);
  const [k, setK] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setK(weeks.length - 1);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = section.current!.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const p = Math.min(1, Math.max(0, -r.top / span));
        setK(Math.min(weeks.length - 1, Math.floor(p * weeks.length)));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [weeks.length]);

  const limit = weeks[k];
  const max = start;
  const ticks = Array.from({ length: max + 1 }, (_, m) => m);

  return (
    <section ref={section} className="relative h-[240vh] bg-[var(--pt-paper)]" aria-labelledby="pt-limit-h">
      <div className="pt-wrap sticky top-0 flex h-[100svh] flex-col justify-center gap-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-[46rem] flex-col gap-5">
            <p className="pt-label text-[var(--pt-mute)]">03 · O limite</p>
            <h2 id="pt-limit-h" className="pt-display text-[clamp(3.2rem,7vw,6.4rem)]">
              Começa folgado. Aperta toda semana.
            </h2>
            <p className="max-w-[44ch] text-[17px] leading-[1.55] text-[var(--pt-mute)]">
              {start} minutos por app na primeira semana, {Math.round(cut * 100)}% a menos a cada semana, de 5 em 5, até parar em {floor}. O limite do dia é a soma dos apps.
            </p>
          </div>
          <p className="flex items-end gap-3" aria-live="polite">
            <span className="pt-display text-[clamp(8rem,20vw,15rem)] leading-[0.78] tabular-nums text-[var(--pt-acc-deep)]">{limit}</span>
            <span className="flex flex-col pb-2 text-[15px] font-medium leading-tight">
              <span>min por app</span>
              <span className="pt-mono text-[var(--pt-mute)]">semana {k + 1}</span>
            </span>
          </p>
        </div>

        {/* régua 0 → 60 */}
        <div className="pt-ruler" aria-hidden>
          {ticks.map((m) => {
            const major = m % 5 === 0;
            const over = m > limit;
            return (
              <span key={m}>
                <span
                  className="pt-tick"
                  style={{
                    left: `${(m / max) * 100}%`,
                    height: major ? 46 : 22,
                    color: m === limit ? "var(--pt-acc)" : over ? "var(--pt-line)" : "var(--pt-ink)",
                    transform: `scaleY(${over ? 0.45 : 1})`,
                    transition: "transform 500ms var(--pt-ease), color 300ms linear",
                    transitionDelay: `${Math.abs(m - limit) * 8}ms`,
                    width: m === limit ? 4 : 2,
                  }}
                />
                {major && (
                  <span
                    className="pt-mono absolute bottom-0 -translate-x-1/2 text-[11px] transition-colors duration-300"
                    style={{ left: `${(m / max) * 100}%`, color: over ? "var(--pt-line)" : "var(--pt-ink)" }}
                  >
                    {m}
                  </span>
                )}
              </span>
            );
          })}
          {/* marcador: anda por transform dentro de uma trilha do tamanho da régua */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[60px]">
            <span
              className="absolute left-0 top-0 h-full w-full"
              style={{ transform: `translateX(${(limit / max) * 100}%)`, transition: "transform 600ms var(--pt-ease)" }}
            >
              <span className="absolute left-0 top-0 h-full w-[2px] -translate-x-1/2 bg-[var(--pt-acc)]" />
            </span>
          </span>
        </div>

        <ol className="pt-mono flex flex-wrap gap-x-5 gap-y-2 text-[12px]" aria-label="Limite por semana">
          {weeks.map((m, i) => (
            <li key={i} className="transition-colors duration-300" style={{ color: i === k ? "var(--pt-ink)" : "var(--pt-mute)" }}>
              S{i + 1} <span className={i === k ? "text-[var(--pt-acc-deep)]" : ""}>{m}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
