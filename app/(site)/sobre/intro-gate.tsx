"use client";

// A porta de abertura (vinda da v1): cobre a página, trava a rolagem, conta 10 segundos
// e só então as duas folhas giram e revelam o site. Quem já passou nesta aba entra direto.

import { useEffect, useRef, useState } from "react";
import { Mark } from "./logo";

const SECONDS = 10;
const SEEN_KEY = "porteiro-landing-portao";

type W = Window & { __porteiroAberto?: "now" | "late" };

export function IntroGate() {
  const [left, setLeft] = useState(SECONDS);
  const [phase, setPhase] = useState<"closed" | "ready" | "opening" | "gone">("closed");
  const btn = useRef<HTMLButtonElement>(null);

  // já passou nesta aba? some sem esperar
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen) {
      setPhase("gone");
      announce("late");
    }
  }, []);

  // trava a rolagem enquanto a porta tá fechada
  useEffect(() => {
    const html = document.documentElement;
    if (phase === "gone") {
      html.style.overflow = "";
      return;
    }
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "closed") return;
    if (left === 0) {
      setPhase("ready");
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left, phase]);

  useEffect(() => {
    if (phase === "ready") btn.current?.focus({ preventScroll: true });
  }, [phase]);

  function open() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setPhase("opening");
    announce("now");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setPhase("gone"), reduce ? 200 : 1500);
  }

  if (phase === "gone") return null;
  const progress = (SECONDS - left) / SECONDS;

  return (
    <div className="pt-gate" data-phase={phase} role="dialog" aria-modal="true" aria-labelledby="pt-gate-h">
      <div className="pt-door pt-door-l" aria-hidden />
      <div className="pt-door pt-door-r" aria-hidden />
      <div className="pt-door-seam" aria-hidden />

      <div className="pt-gate-inner">
        <p className="flex items-center gap-2 text-[var(--pt-mute-dark)]">
          <Mark size={22} ink="var(--pt-paper)" />
          <span className="pt-label">Porteiro</span>
        </p>

        <div className="pt-gate-count pt-display" aria-hidden>
          <span key={left} className="pt-digit">
            {left}
          </span>
        </div>

        <div className="flex w-full max-w-[560px] flex-col gap-6">
          <h2 id="pt-gate-h" className="text-[clamp(1.35rem,3vw,1.9rem)] font-medium leading-snug tracking-[-0.02em] [text-wrap:balance]">
            {phase === "closed"
              ? `Respira. O site continua aqui daqui a ${left} ${left === 1 ? "segundo" : "segundos"}.`
              : "Pronto. Pode entrar."}
          </h2>
          <div className="pt-gate-track" aria-hidden>
            <div className="pt-gate-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-4 text-left">
            <p className="text-[14px] text-[var(--pt-mute-dark)]">É o mesmo tempo que o TikTok espera.</p>
            <button ref={btn} type="button" onClick={open} disabled={phase === "closed"} className="pt-btn pt-gate-btn">
              {phase === "closed" ? `Liberando em ${left}s` : "Entrar"}
            </button>
          </div>
        </div>
      </div>
      <noscript>
        <style>{`.pt-gate{display:none}html{overflow:auto!important}`}</style>
      </noscript>
    </div>
  );
}

function announce(kind: "now" | "late") {
  (window as W).__porteiroAberto = kind;
  window.dispatchEvent(new CustomEvent("porteiro:aberto", { detail: kind }));
}

/** Roda fn quando a porta abrir. `late` = a porta já tava aberta (ou foi pulada nesta aba). */
export function onGateOpen(fn: (late: boolean) => void) {
  const already = (window as W).__porteiroAberto;
  if (already) {
    fn(already === "late");
    return () => {};
  }
  const h = (e: Event) => fn((e as CustomEvent).detail === "late");
  window.addEventListener("porteiro:aberto", h, { once: true });
  return () => window.removeEventListener("porteiro:aberto", h);
}
