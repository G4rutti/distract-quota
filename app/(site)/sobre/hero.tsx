"use client";

// Hero da v1 trazido pra v2: a frase com a pílula que troca de app, e o passe do visitante,
// que cai inclinado quando a porta de abertura abre e leva o carimbo LIBERADO.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, GithubLogo } from "@phosphor-icons/react";
import { Wordmark } from "./logo";
import { onGateOpen } from "./intro-gate";
import { HeroPass, SwapPill } from "./pass";

export function Hero({ repo }: { repo: string }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    let ctx: gsap.Context | undefined;
    const hide = gsap.context(() => {
      gsap.set("[data-h-line] > span", { yPercent: 110 });
      gsap.set("[data-h-fade]", { autoAlpha: 0, y: 18 });
      gsap.set("[data-hero-pass]", { autoAlpha: 0, y: 60, rotation: 8 });
    }, root);
    const off = onGateOpen((late) => {
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ delay: late ? 0.1 : 0.55 });
        tl.to("[data-h-line] > span", { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.09 })
          .to("[data-h-fade]", { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, "-=0.7")
          .to("[data-hero-pass]", { autoAlpha: 1, y: 0, rotation: -4, duration: 1.2, ease: "elastic.out(1, 0.75)" }, "-=0.9");
        // o passe sobe mais devagar que a página e gira um pouco
        gsap.to("[data-hero-pass]", {
          yPercent: -18,
          rotation: 6,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      }, root);
    });
    return () => {
      off();
      ctx?.revert();
      hide.revert();
    };
  }, []);

  return (
    <section ref={root} className="bg-[var(--pt-paper)]" aria-labelledby="pt-h1">
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

      <div className="pt-wrap grid min-h-[calc(100svh-68px)] items-center gap-14 pb-20 pt-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:pb-24">
        <div className="flex min-w-0 flex-col gap-8">
          <h1 id="pt-h1" className="pt-hero-h1 text-[clamp(2.8rem,6.4vw,5.6rem)]">
            <span data-h-line className="pt-line">
              <span>
                O <SwapPill words={["TikTok", "Instagram", "X"]} />
              </span>
            </span>
            <span data-h-line className="pt-line">
              <span>só abre passando</span>
            </span>
            <span data-h-line className="pt-line">
              <span>por aqui.</span>
            </span>
          </h1>
          <p data-h-fade className="max-w-[46ch] text-[18px] leading-[1.6] text-[var(--pt-mute)]">
            Sem passe, o Porteiro aparece por cima do app: 10 segundos de espera, você diz pra quê vai entrar e por quanto tempo. Só aí abre. Tu acabou de passar por ele.
          </p>
          <div data-h-fade className="flex flex-wrap gap-3">
            <a href="#porta" className="pt-btn pt-btn-sq bg-[var(--pt-acc)] text-[var(--pt-paper)] hover:bg-[var(--pt-acc-deep)]">
              Testar a porta <ArrowDown size={18} aria-hidden />
            </a>
            <a href={repo} className="pt-btn pt-btn-sq border border-[var(--pt-line)] hover:border-[var(--pt-ink)]">
              <GithubLogo size={18} aria-hidden /> Ver o código
            </a>
          </div>
        </div>
        <HeroPass />
      </div>
    </section>
  );
}
