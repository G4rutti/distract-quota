"use client";

// Hero: título que sobe linha por linha enquanto as folhas da porta de abertura giram.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowDown, GithubLogo } from "@phosphor-icons/react";
import { Wordmark } from "./logo";
import { onGateOpen } from "./intro-gate";

export function Hero({ repo }: { repo: string }) {
  const root = useRef<HTMLElement>(null);

  // entrada do texto: espera a porta de abertura começar a abrir
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: gsap.Context | undefined;
    const hide = gsap.context(() => {
      gsap.set("[data-h-line] > span", { yPercent: 105 });
      gsap.set("[data-h-fade]", { opacity: 0, y: 14 });
    }, root);
    const off = onGateOpen((late) => {
      ctx = gsap.context(() => {
        const d = late ? 0.1 : 0.55; // vindo da porta, entra enquanto as folhas abrem
        gsap.to("[data-h-line] > span", { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09, delay: d });
        gsap.to("[data-h-fade]", { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, delay: d + 0.45 });
      }, root);
    });
    return () => {
      off();
      ctx?.revert();
      hide.revert();
    };
  }, []);

  return (
    <section ref={root} className="flex min-h-[92svh] flex-col bg-[var(--pt-paper)]" aria-labelledby="pt-h1">
      <header className="pt-wrap flex h-[68px] items-center justify-between gap-4 pt-[env(safe-area-inset-top)]">
        <a href="#" aria-label="Porteiro, início" className="rounded-md">
          <Wordmark />
        </a>
        <nav aria-label="Principal" className="flex items-center gap-1 text-[15px] font-medium sm:gap-2">
          <a href="#porta" className="hidden min-h-11 items-center rounded-full px-3 hover:bg-[var(--pt-fog)] sm:flex">
            A porta
          </a>
          <a href={repo} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 hover:bg-[var(--pt-fog)]">
            <GithubLogo size={18} weight="bold" aria-hidden />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a href="/login" className="flex min-h-11 items-center rounded-full border border-[var(--pt-line)] px-5 font-semibold hover:border-[var(--pt-ink)]">
            Entrar
          </a>
        </nav>
      </header>

      <div className="pt-wrap flex flex-1 flex-col justify-center pb-20 pt-10">
        <h1 id="pt-h1" className="pt-display text-[clamp(4.4rem,10.4vw,10.6rem)]">
          <span data-h-line className="pt-line">
            <span>Dez segundos</span>
          </span>
          <span data-h-line className="pt-line">
            <span>
              entre você <span className="text-[var(--pt-acc)]">e o feed.</span>
            </span>
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-7 md:mt-14 md:flex-row md:items-end md:justify-between">
          <p data-h-fade className="max-w-[44ch] text-[18px] leading-[1.55] text-[var(--pt-mute)]">
            Sem passe, o Porteiro abre por cima do TikTok, do Instagram e do X. Você espera, diz pra quê vai entrar e por quanto tempo. Aí abre.
          </p>

          <div data-h-fade className="flex flex-wrap items-center gap-3">
            <a href="#porta" className="pt-btn bg-[var(--pt-acc)] text-[var(--pt-paper)] hover:bg-[var(--pt-acc-deep)]">
              Testar a porta <ArrowDown size={18} weight="bold" aria-hidden />
            </a>
            <a href={repo} className="pt-btn border border-[var(--pt-line)] hover:border-[var(--pt-ink)]">
              <GithubLogo size={18} weight="bold" aria-hidden /> Ver o código
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
