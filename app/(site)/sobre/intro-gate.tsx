"use client";

import { useEffect, useRef, useState } from "react";

const SECONDS = 10;
const SEEN_KEY = "porteiro-landing-portao";

/**
 * O portão: cobre a página inteira, conta 10 segundos e só então as duas folhas abrem.
 * Quem já passou nesta aba entra direto (sessionStorage). Sem JS, um <noscript> esconde o portão.
 * Avisa o resto da página com o evento "porteiro:aberto".
 */
export function IntroGate() {
  const [left, setLeft] = useState(SECONDS);
  const [phase, setPhase] = useState<"closed" | "ready" | "opening" | "gone">("closed");
  const btnRef = useRef<HTMLButtonElement>(null);

  // já passou nesta aba? abre sem esperar
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (seen) {
      setPhase("gone");
      announce();
    }
  }, []);

  // trava o scroll enquanto o portão tá de pé
  useEffect(() => {
    if (phase === "gone") {
      document.documentElement.style.overflow = "";
      return;
    }
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
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
    if (phase === "ready") btnRef.current?.focus({ preventScroll: true });
  }, [phase]);

  function open() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setPhase("opening");
    announce();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setPhase("gone"), reduce ? 200 : 1500);
  }

  if (phase === "gone") return null;

  const progress = (SECONDS - left) / SECONDS;

  return (
    <div
      className="lp-gate"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-labelledby="portao-titulo"
    >
      {/* as duas folhas da porta */}
      <div className="lp-door lp-door-l" aria-hidden />
      <div className="lp-door lp-door-r" aria-hidden />
      <div className="lp-door-seam" aria-hidden />

      <div className="lp-gate-inner">
        <p className="lp-eyebrow">Porteiro</p>

        <div className="lp-gate-count" aria-hidden>
          <span key={left} className="lp-digit">
            {left}
          </span>
        </div>

        <div className="flex w-full max-w-[560px] flex-col gap-6">
          <h2 id="portao-titulo" className="text-[clamp(1.4rem,3.2vw,2rem)] font-medium leading-snug tracking-tight [text-wrap:balance]">
            {phase === "closed"
              ? `Respira. O site continua aqui daqui a ${left} ${left === 1 ? "segundo" : "segundos"}.`
              : "Pronto. Pode entrar."}
          </h2>
          <div className="lp-gate-track" aria-hidden>
            <div className="lp-gate-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="flex min-h-12 items-center justify-between gap-4">
            <p className="text-sm text-muted">É o mesmo tempo que o TikTok espera.</p>
            <button
              ref={btnRef}
              type="button"
              onClick={open}
              disabled={phase === "closed"}
              className="lp-btn lp-gate-btn h-12 rounded-[var(--radius)] bg-accent px-5 font-medium text-accent-ink"
            >
              {phase === "closed" ? `Liberando em ${left}s` : "Entrar"}
            </button>
          </div>
        </div>
      </div>
      <noscript>
        <style>{`.lp-gate{display:none}html{overflow:auto!important}`}</style>
      </noscript>
    </div>
  );
}

function announce() {
  window.dispatchEvent(new Event("porteiro:aberto"));
  (window as unknown as { __porteiroAberto?: boolean }).__porteiroAberto = true;
}

/** Roda fn quando o portão abrir (ou na hora, se já abriu). */
export function onGateOpen(fn: () => void) {
  if ((window as unknown as { __porteiroAberto?: boolean }).__porteiroAberto) {
    fn();
    return () => {};
  }
  window.addEventListener("porteiro:aberto", fn, { once: true });
  return () => window.removeEventListener("porteiro:aberto", fn);
}
