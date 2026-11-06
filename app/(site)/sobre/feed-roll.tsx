"use client";

// O feed sendo enrolado conforme a página rola.
// Técnica do "Infinite Scroll" de Phi Hoang (garimpado no Godly/Recent Design): uma fita de posts que vira rolo.
// Aqui ela anda ao contrário: quanto mais tu desce, mais o feed some pra dentro do rolo.

import { useEffect, useRef, useState } from "react";

const HANDLES = [
  "@cortes.do.dia", "@receita_em_1min", "@memes.br", "@treino.rapido", "@viagem.barata", "@unboxing.br",
  "@curiosidades", "@podcast.cortes", "@setup.gamer", "@dancinha", "@fofoca.ofc", "@dicas.de.excel",
  "@gato.do.dia", "@futebol.lances", "@moda.masc", "@react.em.60s", "@reforma.casa", "@quiz.br",
  "@carros.raros", "@asmr.br", "@lifehack", "@cinema.cortes", "@pegadinhas", "@noticia.rapida",
  "@desafio.novo", "@skate.br", "@cozinha.facil", "@nostalgia.2000", "@astronomia", "@tutorial.make",
];
const PITCH = 72; // altura do post + espaço
const R = 86; // raio do rolo

// Cinzas frios e um ou outro azul: thumbnails abstratos, sem foto de ninguém.
const THUMB = ["#2A2E36", "#4B5160", "#8E94A0", "#C9CDD4", "#2F7BEF", "#3A3F4A", "#6B7180", "#B1B6BF"];

export function FeedRoll() {
  const section = useRef<HTMLElement>(null);
  const posts = useRef<(HTMLDivElement | null)[]>([]);
  const [wound, setWound] = useState(0);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const place = (p: number) => {
      const total = HANDLES.length * PITCH;
      const w = p * total * 0.9;
      let n = 0;
      posts.current.forEach((el, i) => {
        if (!el) return;
        const u = i * PITCH - w;
        let tf: string;
        if (u >= 0) {
          // fita reta descendo, com um S suave
          const x = Math.sin(u / 240) * 26;
          tf = `translate3d(${x.toFixed(1)}px, ${(R + u).toFixed(1)}px, ${R}px)`;
          el.style.opacity = "1";
          el.style.filter = "none";
        } else {
          n++;
          const arc = -u;
          const layer = Math.floor(arc / (Math.PI * 2 * R));
          const rl = R - layer * 5;
          const phi = arc / R;
          const y = R - Math.sin(phi) * rl;
          const z = Math.cos(phi) * rl;
          tf = `translate3d(0px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${((phi * 180) / Math.PI).toFixed(1)}deg)`;
          el.style.opacity = layer > 3 ? "0" : "1";
          // sombra do cilindro: escurece conforme o post vai pra trás do rolo
          el.style.filter = `brightness(${(0.5 + 0.5 * Math.max(0, Math.cos(phi))).toFixed(2)})`;
        }
        el.style.transform = tf;
      });
      setWound(n);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = section.current!;
        const r = el.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const p = Math.min(1, Math.max(0, -r.top / span));
        place(p);
      });
    };

    if (reduce) {
      place(0.45);
      return;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="feed" ref={section} className="relative h-[260vh] bg-[var(--pt-ink)] text-[var(--pt-paper)]" aria-labelledby="pt-feed-h">
      <div className="sticky top-0 h-[100svh] overflow-clip">
      <div className="pt-wrap flex h-full flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative z-10 flex flex-col justify-center gap-5 pt-16 md:gap-6 md:pt-0">
          <p className="pt-label text-[var(--pt-mute-dark)]">01 · O problema</p>
          <h2 id="pt-feed-h" className="pt-display text-[clamp(3rem,8vw,7.4rem)]">
            O feed não tem <span className="text-[var(--pt-acc-soft)]">última página.</span>
          </h2>
          <p className="max-w-[40ch] text-[16px] leading-[1.55] text-[var(--pt-mute-dark)] md:text-[18px]">
            Quem para é você. O Porteiro transforma cada abertura numa sessão com começo, motivo e hora pra acabar, e o resto do feed fica enrolado.
          </p>
          <p className="pt-mono text-[13px] text-[var(--pt-mute-dark)]" aria-hidden>
            <span className="text-[var(--pt-paper)]">{String(wound).padStart(2, "0")}</span> / {HANDLES.length} posts enrolados
          </p>
        </div>

        <div className="pt-roll-stage relative min-h-0 flex-1 max-md:[&>*]:scale-[0.78]" aria-hidden>
          <div className="pt-roll" style={{ transform: "translateY(20svh) rotateX(-12deg) rotateY(-52deg) rotateZ(4deg)" }}>
            {HANDLES.map((h, i) => (
              <div key={h} className="pt-post" ref={(el) => void (posts.current[i] = el)} style={{ transformOrigin: "50% 0" }}>
                <div className="face front">
                  <span className="pt-thumb" style={{ background: THUMB[(i * 5) % THUMB.length] }} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-[13px] font-semibold">{h}</span>
                    <span className="pt-mono text-[11px] text-[var(--pt-mute)]">0:{String(7 + ((i * 13) % 52)).padStart(2, "0")}</span>
                  </span>
                </div>
                <div className="face back" />
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
