"use client";

// A pilha de notificações (técnica de "X Toasts", Benji Taylor, garimpada no Godly/Recent Design).
// Cada nova entra por cima com desfoque de movimento; as de trás encolhem, escurecem e borram.
// No fim chega a do Porteiro e congela o resto. Roda em loop só enquanto está na tela.

import { useEffect, useRef, useState } from "react";
import { Mark } from "./logo";

type Toast = { id: number; app: string; title: string; body: string; porteiro?: boolean };

const CALLS: Omit<Toast, "id">[] = [
  { app: "T", title: "@cortes.do.dia postou 3 vídeos", body: "Tu viu o primeiro ontem até o fim." },
  { app: "I", title: "4 pessoas curtiram teu story", body: "Toca pra ver quem foi." },
  { app: "X", title: "Assunto bombando agora", body: "Todo mundo tá falando disso." },
  { app: "I", title: "@mari.lima te mencionou", body: "num comentário: \"olha isso kkkk\"" },
  { app: "T", title: "Uma live começou", body: "@setup.gamer tá ao vivo." },
];
const GATE: Omit<Toast, "id"> = {
  app: "P",
  title: "Porteiro · sem passe agora",
  body: "Espera 10 segundos e diz pra quê vai entrar.",
  porteiro: true,
};

const STEP_MS = 1500;
const HOLD_MS = 3200;

export function Toasts() {
  const box = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState<Toast[]>([]);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStack([{ ...GATE, id: 99 }, ...CALLS.slice(0, 2).map((c, i) => ({ ...c, id: i }))]);
      setFrozen(true);
      return;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    let running = false;
    let id = 0;
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    const run = () => {
      setFrozen(false);
      setStack([]);
      CALLS.forEach((c, k) => later(() => setStack((s) => [{ ...c, id: id++ }, ...s].slice(0, 4)), 400 + k * STEP_MS));
      const gateAt = 400 + CALLS.length * STEP_MS;
      later(() => {
        setStack((s) => [{ ...GATE, id: id++ }, ...s].slice(0, 4));
        setFrozen(true);
      }, gateAt);
      later(run, gateAt + HOLD_MS);
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
  }, []);

  return (
    <div ref={box} className="relative h-[300px] w-full max-w-[460px] sm:h-[320px]" aria-hidden>
      {stack.map((t, depth) => {
        const behind = depth > 0;
        const dim = frozen && behind;
        return (
          <div
            key={t.id}
            className="pt-toast absolute inset-x-0 top-[96px]"
            data-porteiro={t.porteiro ? "" : undefined}
            style={{
              transform: `translateY(${depth * 26}px) scale(${1 - depth * 0.055})`,
              opacity: depth > 2 ? 0 : dim ? 0.4 : [1, 0.7, 0.42][depth],
              filter: `blur(${dim ? 2.5 : depth * 0.7}px) grayscale(${dim ? 1 : 0})`,
              zIndex: 10 - depth,
            }}
          >
            <span className="pt-toast-icon" data-app={t.app}>
              {t.porteiro ? <Mark size={22} ink="var(--pt-ink)" accent="var(--pt-red)" /> : t.app}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{t.title}</span>
              <span className="truncate text-[14px] opacity-70">{t.body}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
