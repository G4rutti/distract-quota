"use client";

// Peças do hero e do fim vindas da v1: a pílula que troca de app, o passe que inclina com o mouse
// e leva o carimbo quando a porta de abertura abre, e o holofote que segue o cursor.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { onGateOpen } from "./intro-gate";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Pílula que troca de app: a largura muda de verdade (o fundo estica por transform, FLIP)
   e as letras da palavra nova entram uma a uma. */
export function SwapPill({ words, interval = 2400 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const pill = useRef<HTMLSpanElement>(null);
  const bg = useRef<HTMLSpanElement>(null);
  const lastW = useRef<number | null>(null);

  useEffect(() => {
    if (reduced()) return;
    let t: ReturnType<typeof setInterval> | undefined;
    const stop = onGateOpen(() => {
      t = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    });
    return () => {
      stop();
      if (t) clearInterval(t);
    };
  }, [words.length, interval]);

  useIso(() => {
    const p = pill.current;
    const b = bg.current;
    if (!p || !b) return;
    const w = p.getBoundingClientRect().width;
    if (lastW.current && lastW.current !== w && !reduced()) {
      gsap.fromTo(b, { scaleX: lastW.current / w }, { scaleX: 1, duration: 0.6, ease: "expo.out" });
    }
    lastW.current = w;
  }, [i]);

  const word = words[i];
  return (
    <span ref={pill} className="pt-pill">
      <span ref={bg} className="pt-pill-bg" aria-hidden />
      <span key={word} className="pt-pill-word" aria-label={word}>
        {word.split("").map((ch, k) => (
          <span key={k} aria-hidden className="pt-letter" style={{ animationDelay: `${k * 32}ms` }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}

/* O passe do visitante: inclina em 3D seguindo o mouse, tem um brilho que corre pelo papel
   e leva o carimbo LIBERADO quando a porta abre. */
export function HeroPass() {
  const card = useRef<HTMLDivElement>(null);
  const [stamped, setStamped] = useState(false);
  const [times, setTimes] = useState<{ from: string; until: string } | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const now = new Date();
    setTimes({ from: fmt.format(now), until: fmt.format(new Date(now.getTime() + 5 * 60_000)) });
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = onGateOpen((late) => {
      t = setTimeout(() => setStamped(true), reduced() ? 0 : late ? 1300 : 1900);
    });
    return () => {
      off();
      if (t) clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const el = card.current;
    if (!el || reduced() || matchMedia("(hover: none)").matches) return;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      rx(-y * 22);
      ry(x * 26);
      el.style.setProperty("--shine-x", `${50 + x * 120}%`);
      el.style.setProperty("--shine-y", `${50 + y * 120}%`);
    };
    addEventListener("pointermove", move);
    return () => removeEventListener("pointermove", move);
  }, []);

  const rows: [string, string][] = [
    ["Visitante", "você"],
    ["Motivo", "Conhecer o Porteiro"],
    ["Tempo", "5 min"],
    ["Emitido", times?.from ?? "--:--"],
    ["Válido até", times?.until ?? "--:--"],
  ];

  return (
    <div className="pt-pass-stage" data-hero-pass>
      <div ref={card} className="pt-pass">
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--pt-mute)]">
          <span>Porteiro · Passe</span>
          <span>Nº 0001</span>
        </div>
        <div className="pt-perf my-4" />
        <dl className="flex flex-col gap-2.5 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-[var(--pt-mute)]">{k}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="relative h-20">
          <span className="pt-stamp" data-on={String(stamped)} style={{ top: 18, right: 4 }}>
            LIBERADO
          </span>
        </div>
        <div className="pt-perf mb-4" />
        <div className="flex h-10 items-stretch justify-between" aria-hidden>
          {"0001503112402150001300".split("").map((d, k) => (
            <span key={k} style={{ width: 1 + (Number(d) % 3) * 2, background: k % 2 ? "transparent" : "var(--pt-ink)" }} />
          ))}
        </div>
        <span className="pt-shine" aria-hidden />
      </div>
    </div>
  );
}

/* Holofote que segue o cursor. A seção ocupa a largura toda, então o degradê também. */
export function Spotlight({ children, className = "", labelledBy }: { children: React.ReactNode; className?: string; labelledBy?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
      el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);
  return (
    <section ref={ref} className={`pt-spot ${className}`} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
