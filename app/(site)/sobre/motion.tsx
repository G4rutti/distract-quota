"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** true quando o elemento entra na tela (uma vez). Sem IntersectionObserver, já nasce visto. */
export function useSeen<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** Sobe de leve ao entrar na tela. Começa visível no HTML do servidor (sem JS, nada some). */
export function Rise({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.15);
  const [armed, setArmed] = useState(false);
  useEffect(() => setArmed(true), []);
  return (
    <Tag ref={ref} className={`lp-rise ${className}`} data-seen={armed ? String(seen) : "true"}>
      {children}
    </Tag>
  );
}

/** Barras do limite que cai toda semana. */
export function LimitBars({ weeks }: { weeks: { label: string; minutes: number }[] }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.35);
  const max = weeks[0].minutes;
  return (
    <div ref={ref} data-seen={String(seen)}>
      <div className="flex items-end gap-1.5 sm:gap-3" style={{ height: 240 }}>
        {weeks.map((w, k) => (
          <div key={w.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="num text-[12px] sm:text-sm">{w.minutes}</span>
            <div
              className="lp-bar w-full rounded-t-[6px]"
              style={{
                height: `${(w.minutes / max) * 180}px`,
                transitionDelay: `${k * 70}ms`,
                background: w.minutes === 15 ? "var(--accent)" : "color-mix(in oklch, var(--text) 82%, var(--bg))",
              }}
            />
            <span className="num text-[11px] text-muted">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Navegador fingido: digita o endereço e cai na porta, como a extensão faz. */
export function ExtensionDemo() {
  const target = "tiktok.com/foryou";
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "redirect">("typing");
  const [ref, seen] = useSeen<HTMLDivElement>(0.4);

  useEffect(() => {
    if (!seen) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancel = false;
    async function loop() {
      while (!cancel) {
        setPhase("typing");
        for (let k = 0; k <= target.length && !cancel; k++) {
          setTyped(target.slice(0, k));
          await wait(reduce ? 0 : 70 + Math.random() * 60);
        }
        await wait(700);
        if (cancel) return;
        setPhase("redirect");
        await wait(4200);
      }
    }
    loop();
    return () => {
      cancel = true;
    };
  }, [seen]);

  const url = phase === "typing" ? typed : "seu-porteiro.vercel.app/entrar/tiktok?volta=…";

  return (
    <div ref={ref} className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface" aria-hidden>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
        </div>
        <div className="num min-w-0 flex-1 truncate rounded-full bg-bg px-4 py-1.5 text-[13px] tracking-normal">
          <span className={phase === "redirect" ? "text-accent" : ""}>{url}</span>
          {phase === "typing" && <span className="lp-caret" />}
        </div>
      </div>
      <div className="grid min-h-[220px] place-items-center px-6 py-10 text-center">
        {phase === "typing" ? (
          <p className="text-muted">Abrindo o TikTok no computador…</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <span className="num text-6xl font-medium leading-none">10</span>
            <p className="max-w-[30ch] text-sm text-muted">A extensão barrou e mandou pra porta. Depois de liberar, ela te devolve pra página exata em que você tava.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
