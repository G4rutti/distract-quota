"use client";

// Rolagem suave (Lenis). Fica parada enquanto a porta de abertura está fechada,
// e não liga pra quem pediu menos movimento no sistema.

import { useEffect } from "react";
import Lenis from "lenis";
import { onGateOpen } from "./intro-gate";

export function SmoothScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: true, wheelMultiplier: 0.9 });
    lenis.stop();
    const off = onGateOpen(() => lenis.start());
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      off();
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
