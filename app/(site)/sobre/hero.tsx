"use client";

// Hero: um campo de relógios (técnica de "Time", A. L. Crego, garimpada no Godly/Recent Design).
// Os ponteiros olham pro cursor. Segurando o botão por 10s, todos dão uma volta juntos e param nas 12h:
// é a mesma espera da porta do app, só que aqui tu sente ela antes de instalar.

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowDown, GithubLogo } from "@phosphor-icons/react";
import { Wordmark } from "./logo";

const HOLD_MS = 10_000;
const TAU = Math.PI * 2;

type Phase = "idle" | "holding" | "dropped" | "open";

export function Hero({ repo }: { repo: string }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0); // 0..1, lido pelo canvas
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0); // progresso pro texto/anel (atualiza ~20x/s)

  // ── campo de relógios
  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    type Dial = { x: number; y: number; a: number };
    let w = 0,
      h = 0,
      dpr = 1,
      cell = 40,
      dials: Dial[] = [];
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let visible = true;

    const build = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cell = w < 640 ? 30 : 40;
      const cols = Math.ceil(w / cell) + 1;
      const rows = Math.ceil(h / cell) + 1;
      const ox = (w - (cols - 1) * cell) / 2;
      const prev = dials;
      dials = [];
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const x = ox + i * cell;
          const y = j * cell + cell / 2;
          dials.push({ x, y, a: prev[dials.length]?.a ?? Math.random() * TAU });
        }
    };

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => (pointer = null);

    const draw = (t: number) => {
      const R = cell * 0.44;
      const p = progress.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ink = "#141110";
      const hand = "#FCFCFD";
      const cxB = w / 2;
      for (const d of dials) {
        let target: number;
        if (p > 0) {
          // ponteiros dão uma volta inteira em 10s, com um atraso que some conforme o tempo passa
          const dist = Math.hypot(d.x - cxB, d.y - h);
          target = p * TAU - (dist / Math.max(w, h)) * (1 - p) * 2.4;
        } else if (pointer) {
          target = Math.atan2(pointer.y - d.y, pointer.x - d.x) + Math.PI / 2;
        } else {
          target = Math.sin(t * 0.00045 + d.x * 0.012 + d.y * 0.009) * 1.6;
        }
        let diff = ((target - d.a + Math.PI) % TAU + TAU) % TAU - Math.PI;
        if (p > 0) diff = target - d.a; // durante o giro não corta caminho
        d.a += reduce ? diff : diff * (p > 0 ? 0.25 : 0.11);
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(d.x, d.y, R, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = hand;
        ctx.lineWidth = Math.max(1.4, cell * 0.045);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + Math.sin(d.a) * R * 0.78, d.y - Math.cos(d.a) * R * 0.78);
        ctx.stroke();
      }
    };

    const loop = (t: number) => {
      if (visible) draw(t);
      raf = requestAnimationFrame(loop);
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(cv);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // ── entrada do texto
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-h-line] > span", { yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.09, delay: 0.1 });
      gsap.from("[data-h-fade]", { opacity: 0, y: 14, duration: 0.9, ease: "expo.out", stagger: 0.08, delay: 0.55 });
    }, root);
    return () => ctx.revert();
  }, []);

  // ── segurar por 10s
  const holdRaf = useRef(0);
  const holdStart = useRef(0);
  const holding = useRef(false);

  const tick = () => {
    const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
    progress.current = p;
    setShown(p);
    if (p >= 1) {
      holding.current = false;
      setPhase("open");
      // ponteiros param nas 12h; depois de um tempo o campo volta a seguir o cursor
      gsap.to(progress, { current: 0, duration: 0.01, delay: 2.4 });
      return;
    }
    holdRaf.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (holding.current || phase === "open") return;
    holding.current = true;
    holdStart.current = performance.now(); // sempre do zero, como no app
    gsap.killTweensOf(progress);
    progress.current = 0;
    setPhase("holding");
    holdRaf.current = requestAnimationFrame(tick);
  };

  const release = () => {
    if (!holding.current) return;
    holding.current = false;
    cancelAnimationFrame(holdRaf.current);
    setPhase("dropped");
    gsap.to(progress, {
      current: 0,
      duration: 0.5,
      ease: "power3.out",
      onUpdate: () => setShown(progress.current),
    });
  };

  const secs = Math.max(0, (HOLD_MS * (1 - shown)) / 1000);
  const label =
    phase === "open"
      ? "Liberado. Pode descer."
      : phase === "holding"
        ? `Segura… ${secs.toFixed(1).replace(".", ",")}s`
        : phase === "dropped"
          ? "Soltou, zerou. Segura de novo"
          : "Segura 10s pra entrar";

  return (
    <section ref={root} className="pt-hero flex min-h-[100svh] flex-col" aria-labelledby="pt-h1">

      <header className="pt-wrap flex h-[68px] items-center justify-between gap-4 pt-[env(safe-area-inset-top)]">
        <a href="#" aria-label="Porteiro, início" className="rounded-md">
          <Wordmark accent="var(--pt-paper)" />
        </a>
        <nav aria-label="Principal" className="flex items-center gap-1 text-[15px] font-medium sm:gap-2">
          <a href="#porta" className="hidden min-h-11 items-center rounded-full px-3 hover:bg-[oklch(0_0_0/0.08)] sm:flex">
            A porta
          </a>
          <a href={repo} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 hover:bg-[oklch(0_0_0/0.08)]">
            <GithubLogo size={18} weight="bold" aria-hidden />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a href="/login" className="flex min-h-11 items-center rounded-full border-2 border-[var(--pt-ink)] px-4 font-semibold">
            Entrar
          </a>
        </nav>
      </header>

      <div className="pt-wrap flex flex-col pb-10 pt-[5vh] md:pb-12">
        <h1 id="pt-h1" className="pt-display text-[clamp(4.4rem,9.4vw,9.6rem)]">
          <span data-h-line className="pt-line">
            <span>Dez segundos</span>
          </span>
          <span data-h-line className="pt-line">
            <span>
              entre você <span className="text-[var(--pt-paper)]">e o feed.</span>
            </span>
          </span>
        </h1>

        <div className="mt-8 flex flex-col gap-7 md:mt-10 md:flex-row md:items-end md:justify-between">
          <p data-h-fade className="max-w-[44ch] text-[18px] leading-[1.5] font-medium">
            Sem passe, o Porteiro abre por cima do TikTok, do Instagram e do X. Você espera, diz pra quê vai entrar e por quanto tempo. Aí abre.
          </p>

          <div data-h-fade className="flex flex-wrap items-center gap-3">
            {phase === "open" ? (
              <a href="#feed" className="pt-btn pt-hold" style={{ paddingLeft: 22 }}>
                {label} <ArrowDown size={18} weight="bold" aria-hidden />
              </a>
            ) : (
              <button
                type="button"
                className="pt-btn pt-hold"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  start();
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    start();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === " " || e.key === "Enter") release();
                }}
                onContextMenu={(e) => e.preventDefault()}
                aria-describedby="pt-hold-hint"
              >
                <svg className="pt-hold-ring" viewBox="0 0 40 40" aria-hidden>
                  <circle cx="20" cy="20" r="15" stroke="var(--pt-line-dark)" />
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    stroke="var(--pt-red)"
                    strokeLinecap="round"
                    strokeDasharray={`${(shown * 94.25).toFixed(2)} 94.25`}
                    transform="rotate(-90 20 20)"
                  />
                </svg>
                <span className="pt-mono min-w-[13.5ch] text-left text-[14px]" aria-live="polite">
                  {label}
                </span>
              </button>
            )}
            <a href={repo} className="pt-btn border-2 border-[var(--pt-ink)] hover:bg-[var(--pt-ink)] hover:text-[var(--pt-red)]">
              <GithubLogo size={18} weight="bold" aria-hidden /> Ver o código
            </a>
          </div>
        </div>
        <p id="pt-hold-hint" className="sr-only">
          Mantenha pressionado por dez segundos. Se soltar antes, a contagem volta pro zero, igual no app.
        </p>
      </div>

      {/* o campo de relógios ocupa o resto da primeira tela */}
      <div className="pt-hero-field" aria-hidden>
        <canvas ref={canvas} />
      </div>
    </section>
  );
}
