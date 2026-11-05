"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onGateOpen } from "./intro-gate";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Pílula que troca de app: a largura muda de verdade (o fundo estica   */
/* por transform, FLIP) e as letras da palavra nova entram uma a uma.   */
/* ------------------------------------------------------------------ */
export function SwapPill({ words, interval = 2400 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const pillRef = useRef<HTMLSpanElement>(null);
  const bgRef = useRef<HTMLSpanElement>(null);
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
    const pill = pillRef.current;
    const bg = bgRef.current;
    if (!pill || !bg) return;
    const w = pill.getBoundingClientRect().width;
    if (lastW.current && lastW.current !== w && !reduced()) {
      gsap.fromTo(bg, { scaleX: lastW.current / w }, { scaleX: 1, duration: 0.6, ease: "expo.out" });
    }
    lastW.current = w;
  }, [i]);

  const word = words[i];
  return (
    <span ref={pillRef} className="lp-pill2">
      <span ref={bgRef} className="lp-pill2-bg" aria-hidden />
      <span key={word} className="lp-pill2-word" aria-label={word}>
        {word.split("").map((ch, k) => (
          <span key={k} aria-hidden className="lp-letter" style={{ animationDelay: `${k * 32}ms` }}>
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* O passe do visitante no hero: inclina em 3D seguindo o mouse, tem    */
/* um brilho que corre pelo papel e leva o carimbo quando a porta abre. */
/* ------------------------------------------------------------------ */
export function HeroPass() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [stamped, setStamped] = useState(false);
  const [times, setTimes] = useState<{ from: string; until: string } | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const now = new Date();
    setTimes({ from: fmt.format(now), until: fmt.format(new Date(now.getTime() + 5 * 60_000)) });
    return onGateOpen(() => setTimeout(() => setStamped(true), reduced() ? 0 : 1100));
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || reduced() || matchMedia("(hover: none)").matches) return;
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
    function move(e: PointerEvent) {
      const r = card!.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      rx(-y * 22);
      ry(x * 26);
      card!.style.setProperty("--shine-x", `${50 + x * 120}%`);
      card!.style.setProperty("--shine-y", `${50 + y * 120}%`);
    }
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
    <div className="lp-hero-pass-stage" data-hero-pass>
      <div ref={cardRef} className="lp-hero-pass" data-on={String(stamped)}>
        <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--paper-muted)]">
          <span>Porteiro · Passe</span>
          <span>Nº 0001</span>
        </div>
        <div className="lp-perf my-4" />
        <dl className="flex flex-col gap-2.5 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-[var(--paper-muted)]">{k}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="relative h-20">
          <span className="lp-stamp text-[var(--stamp)]" data-on={String(stamped)} style={{ top: 18, right: 4 }}>
            LIBERADO
          </span>
        </div>
        <div className="lp-perf mb-4" />
        <div className="flex h-10 items-stretch justify-between" aria-hidden>
          {"0001503112402150001300".split("").map((d, k) => (
            <span key={k} style={{ width: 1 + (Number(d) % 3) * 2, background: k % 2 ? "transparent" : "var(--paper-ink)" }} />
          ))}
        </div>
        <span className="lp-shine" aria-hidden />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fita de recibo com os motivos do app. Acelera com o scroll.          */
/* ------------------------------------------------------------------ */
export function Ticker({ items }: { items: string[] }) {
  const rowA = useRef<HTMLDivElement>(null);
  const rowB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced() || !rowA.current || !rowB.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const a = gsap.to(rowA.current, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
    const b = gsap.fromTo(rowB.current, { xPercent: -50 }, { xPercent: 0, duration: 44, ease: "none", repeat: -1 });
    // velocidade do scroll vira empurrão na fita, que depois volta ao ritmo normal
    const speed = { v: 1 };
    const apply = () => {
      a.timeScale(speed.v);
      b.timeScale(speed.v);
    };
    const st = ScrollTrigger.create({
      onUpdate(self) {
        const dir = self.direction || 1;
        const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 260, 7);
        gsap.killTweensOf(speed);
        speed.v = boost * dir;
        apply();
        gsap.to(speed, { v: dir, duration: 1.2, ease: "power2.out", onUpdate: apply });
      },
    });
    return () => {
      a.kill();
      b.kill();
      st.kill();
    };
  }, []);

  const line = [...items, ...items].map((t, k) => (
    <span key={k} className="flex shrink-0 items-center gap-8 pr-8">
      {t}
      <span className="lp-tick-dot" />
    </span>
  ));

  return (
    <div className="lp-ticker" aria-hidden>
      <div className="lp-ticker-row lp-ticker-paper">
        <div ref={rowA} className="flex w-max">
          {line}
          {line}
        </div>
      </div>
      <div className="lp-ticker-row lp-ticker-ink">
        <div ref={rowB} className="flex w-max">
          {line}
          {line}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Efeitos de scroll da página inteira, num lugar só.                  */
/* ------------------------------------------------------------------ */
export function ScrollFX() {
  useIso(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // hero: o título sobe linha por linha quando a porta abre
      const lines = gsap.utils.toArray<HTMLElement>("[data-hero-line] > span");
      gsap.set(lines, { yPercent: 115 });
      gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 18 });
      gsap.set("[data-hero-pass]", { autoAlpha: 0, y: 60, rotation: 8 });
      const stopGate = onGateOpen(() => {
        const tl = gsap.timeline({ delay: 0.35 });
        tl.to(lines, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 })
          .to("[data-hero-fade]", { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, "-=0.7")
          .to("[data-hero-pass]", { autoAlpha: 1, y: 0, rotation: -4, duration: 1.2, ease: "elastic.out(1, 0.75)" }, "-=0.9");
      });

      // o passe do hero sobe mais devagar que a página (parallax) e gira um pouco
      gsap.to("[data-hero-pass]", {
        yPercent: -18,
        rotation: 6,
        ease: "none",
        scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true },
      });

      // títulos das seções: máscara de baixo pra cima
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          clipPath: "inset(0 0 100% 0)",
          y: 40,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      // a porta: o celular vem deitado e endireita com o scroll; a impressora vem da direita
      gsap.fromTo(
        "[data-phone]",
        { rotationX: 38, rotationZ: -8, y: 120, scale: 0.86, transformPerspective: 1200 },
        {
          rotationX: 0,
          rotationZ: 0,
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: "#porta", start: "top 85%", end: "top 15%", scrub: 0.6 },
        },
      );
      gsap.fromTo(
        "[data-printer]",
        { x: 160, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: "#porta", start: "top 70%", end: "top 20%", scrub: 0.6 } },
      );

      // o limite: o número grande desce de 60 até 15 conforme a seção passa
      const big = document.querySelector<HTMLElement>("[data-limit-number]");
      if (big) {
        const values = (big.dataset.values || "").split(",").map(Number);
        const state = { i: 0 };
        gsap.to(state, {
          i: values.length - 1,
          ease: "none",
          scrollTrigger: { trigger: "[data-limit]", start: "top 70%", end: "bottom 40%", scrub: true },
          onUpdate() {
            const v = values[Math.round(state.i)];
            if (big.textContent !== String(v)) big.textContent = String(v);
          },
        });
      }

      // navegador da extensão: parallax leve
      gsap.fromTo("[data-browser]", { y: 80, rotation: -2 }, { y: -30, rotation: 0, ease: "none", scrollTrigger: { trigger: "[data-browser]", start: "top bottom", end: "bottom top", scrub: true } });
    });

    // sem animação: tudo visível, número no piso
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const big = document.querySelector<HTMLElement>("[data-limit-number]");
      if (big) big.textContent = (big.dataset.values || "").split(",").pop() || big.textContent;
    });

    return () => mm.revert();
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/* Holofote que segue o cursor no fim da página.                       */
/* ------------------------------------------------------------------ */
export function Spotlight({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    function move(e: PointerEvent) {
      const r = el!.getBoundingClientRect();
      el!.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
      el!.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
    }
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);
  return (
    <section ref={ref} className={`lp-spot ${className}`}>
      {children}
    </section>
  );
}
