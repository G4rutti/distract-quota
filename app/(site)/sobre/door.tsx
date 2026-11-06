"use client";

// A porta, jogável: o mesmo caminho do app (10s, motivo, tempo, passe), dentro de um celular desenhado em CSS.

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowUpRight, InstagramLogo, TiktokLogo, XLogo, type Icon } from "@phosphor-icons/react";
import { DotCount } from "@/components/dot-count";
import { Mark } from "./logo";

type AppKey = "tiktok" | "instagram" | "x";
// Glifos de marca do Phosphor (mesma lib da logo do GitHub), em branco sobre tile neutro.
const APPS: { key: AppKey; name: string; icon: Icon; bg: string }[] = [
  { key: "tiktok", name: "TikTok", icon: TiktokLogo, bg: "#16181D" },
  { key: "instagram", name: "Instagram", icon: InstagramLogo, bg: "#4B5160" },
  { key: "x", name: "X", icon: XLogo, bg: "#2A2E36" },
];

type Step = "home" | "wait" | "why" | "pass";
const STEPS: { key: Step; title: string; body: string }[] = [
  { key: "home", title: "Tu abre o app", body: "Os Atalhos do iPhone avisam o Porteiro. Sem passe válido, ele aparece por cima." },
  { key: "wait", title: "Dez segundos", body: "Não dá pra pular. E ele lembra quanto tu pediu da última vez, e quanto ficou." },
  { key: "why", title: "Pra quê e por quanto", body: "Um motivo e um tempo: 5, 10, 15 ou 30 minutos." },
  { key: "pass", title: "Passe na mão", body: "Vale até a hora marcada e vence sozinho. Fechou o app, a sessão é anotada." },
];

export function Door({ wait, intents, minutes }: { wait: number; intents: string[]; minutes: readonly number[] }) {
  const [step, setStep] = useState<Step>("home");
  const [app, setApp] = useState(APPS[0]);
  const [left, setLeft] = useState(wait);
  const [intent, setIntent] = useState<string | null>(null);
  const [mins, setMins] = useState<number | null>(null);
  const [until, setUntil] = useState<string>("");
  const t0 = useRef(0);

  useEffect(() => {
    if (step !== "wait") return;
    t0.current = performance.now();
    let raf = 0;
    const tick = () => {
      const l = wait - (performance.now() - t0.current) / 1000;
      setLeft(Math.max(0, l));
      if (l <= 0) {
        setStep("why");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, wait]);

  const open = (a: (typeof APPS)[number]) => {
    setApp(a);
    setIntent(null);
    setMins(null);
    setLeft(wait);
    setStep("wait");
  };

  const release = () => {
    if (!mins) return;
    const d = new Date(Date.now() + mins * 60_000);
    setUntil(d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
    setStep("pass");
  };

  const idx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="grid items-center gap-14 md:grid-cols-[minmax(0,1fr)_auto] md:gap-20">
      <ol className="order-2 flex flex-col md:order-1">
        {STEPS.map((s, k) => (
          <li
            key={s.key}
            className="grid grid-cols-[3.2rem_minmax(0,1fr)] gap-x-3 border-t border-[var(--pt-line)] py-6 transition-opacity duration-300"
            style={{ opacity: k === idx ? 1 : 0.38 }}
            aria-current={k === idx ? "step" : undefined}
          >
            <span className="pt-mono pt-1 text-[13px] text-[var(--pt-acc)]">0{k + 1}</span>
            <span className="flex flex-col gap-2">
              <span className="pt-display text-[clamp(2rem,3.6vw,2.9rem)]">{s.title}</span>
              <span className="max-w-[42ch] text-[16px] leading-[1.55] text-[var(--pt-mute)]">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="order-1 flex justify-center md:order-2">
        <div className="pt-phone">
          <div className="pt-screen" data-step={step} aria-live="polite">
            <div className="flex items-center justify-between px-7 pt-4 text-[12px] font-semibold">
              <span className="pt-mono">9:41</span>
              <span className="h-[22px] w-[86px] rounded-full bg-[var(--pt-ink)]" aria-hidden />
              <span className="pt-mono">5G</span>
            </div>

            {step === "home" && (
              <div className="flex h-[calc(100%-40px)] flex-col gap-10 px-6 pb-8 pt-10">
                <div>
                  <p className="pt-label text-[var(--pt-mute)]">Experimenta</p>
                  <p className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em]">Toca num app pra abrir.</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {APPS.map((a) => (
                    <button key={a.key} type="button" onClick={() => open(a)} className="group flex flex-col items-center gap-2">
                      <span
                        className="grid aspect-square w-full place-items-center rounded-[22%] text-[var(--pt-paper)] transition-transform duration-200 group-active:scale-95"
                        style={{ background: a.bg }}
                      >
                        <a.icon size="52%" weight="fill" aria-hidden />
                      </span>
                      <span className="text-[12px] font-medium">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "wait" && (
              <div className="flex h-[calc(100%-40px)] flex-col items-center justify-between px-6 pb-8 pt-8 text-center">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  <Mark size={18} ink="var(--pt-ink)" /> Porteiro · {app.name}
                </p>
                <DotCount seconds={left} total={wait} size={210} />
                <p className="text-[14px] leading-[1.5] text-[var(--pt-mute)]">
                  Da última vez tu pediu <span className="pt-mono text-[var(--pt-ink)]">10</span> min e ficou{" "}
                  <span className="pt-mono font-semibold text-[var(--pt-ink)]">34</span>.
                </p>
              </div>
            )}

            {step === "why" && (
              <div className="flex h-[calc(100%-40px)] flex-col gap-5 px-5 pb-6 pt-6">
                <p className="text-[20px] font-semibold leading-tight tracking-[-0.02em]">Pra quê vai abrir o {app.name}?</p>
                <div className="flex flex-wrap gap-2">
                  {intents.map((i) => (
                    <button key={i} type="button" className="pt-chip" aria-pressed={intent === i} onClick={() => setIntent(i)}>
                      {i}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[15px] font-semibold">Por quanto tempo?</p>
                <div className="grid grid-cols-4 gap-2">
                  {minutes.map((m) => (
                    <button key={m} type="button" className="pt-chip pt-mono" aria-pressed={mins === m} onClick={() => setMins(m)}>
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={release}
                  disabled={!intent || !mins}
                  className="pt-btn mt-auto w-full justify-center bg-[var(--pt-acc)] text-[var(--pt-paper)] disabled:bg-[var(--pt-fog)] disabled:text-[var(--pt-mute)]"
                >
                  Liberar {mins ? `${mins} min` : ""}
                </button>
              </div>
            )}

            {step === "pass" && (
              <div className="flex h-[calc(100%-40px)] flex-col px-6 pb-6 pt-8">
                <p className="pt-label">Passe · {app.name}</p>
                <p className="pt-display mt-4 text-[64px]">Liberado</p>
                <p className="pt-display text-[64px] opacity-80">até {until}</p>
                <p className="mt-5 text-[15px] leading-[1.5]">
                  {intent}. {mins} minutos. Depois disso a porta volta a fechar sozinha.
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  <span className="pt-btn w-full cursor-default justify-center bg-[var(--pt-paper)] text-[var(--pt-ink)]">
                    Abrir o {app.name} <ArrowUpRight size={18} weight="bold" aria-hidden />
                  </span>
                  <button type="button" onClick={() => setStep("home")} className="pt-btn w-full justify-center">
                    <ArrowCounterClockwise size={18} weight="bold" aria-hidden /> De novo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
