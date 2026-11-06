"use client";

// Texto que acende palavra por palavra conforme a rolagem (técnica do site da Profound, visto no Godly/Recent Design).
// Marque trechos com *asterisco* pra eles acenderem em vermelho.

import { useEffect, useMemo, useRef, useState } from "react";

export function Manifesto({ text, label }: { text: string; label: string }) {
  const section = useRef<HTMLElement>(null);
  const words = useMemo(() => {
    const out: { w: string; hot: boolean }[] = [];
    let hot = false;
    for (const raw of text.split(/\s+/)) {
      const opens = raw.startsWith("*");
      const closes = raw.endsWith("*") && raw.length > 1;
      const w = raw.replace(/\*/g, "");
      if (opens) hot = true;
      out.push({ w, hot });
      if (closes) hot = false;
    }
    return out;
  }, [text]);
  const [lit, setLit] = useState(words.length);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = section.current!.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const p = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.25) / span));
        setLit(Math.round(p * words.length));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [words.length]);

  return (
    <section ref={section} className="relative h-[200vh] bg-[var(--pt-paper)]" aria-label={label}>
      <div className="pt-wrap sticky top-0 flex h-[100svh] flex-col justify-center gap-8">
        <p className="pt-label text-[var(--pt-mute)]">{label}</p>
        <p className="max-w-[22ch] text-[clamp(2rem,4.6vw,4.1rem)] font-semibold leading-[1.08] tracking-[-0.025em]">
          {/* texto inteiro pra leitor de tela; as palavras animadas ficam escondidas dele */}
          <span className="sr-only">{text.replace(/\*/g, "")}</span>
          <span aria-hidden>
            {words.map((x, i) => (
              <span
                key={i}
                className="pt-word"
                style={{ color: i < lit ? (x.hot ? "var(--pt-acc-deep)" : "var(--pt-ink)") : "oklch(0.86 0.004 250)" }}
              >
                {x.w}{" "}
              </span>
            ))}
          </span>
        </p>
      </div>
    </section>
  );
}
