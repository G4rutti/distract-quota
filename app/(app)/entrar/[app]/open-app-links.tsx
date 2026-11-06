"use client";

import { useEffect, useState } from "react";

type Props = { name: string; openUrl: string; schemeUrl: string; /** onAccent = em cima do fundo verde do passe */ tone?: "solid" | "onAccent" };

/**
 * No Safari, o universal link (https) tocado num <a> abre o app direto, sem confirmação.
 * No app salvo na tela de início, link externo tende a abrir um navegador embutido;
 * lá o esquema do app (snssdk1233://, instagram://) vai na frente.
 */
export function OpenAppLinks({ name, openUrl, schemeUrl, tone = "solid" }: Props) {
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false); // começa escondido: no PC o link não pisca

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches);
    // iPad novo se apresenta como Mac, mas tem toque
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  }, []);

  const primary = standalone ? schemeUrl : openUrl;
  const fallback = standalone ? openUrl : schemeUrl;

  return (
    <div className="flex flex-col gap-2">
      <a
        href={primary}
        className={`press flex h-14 items-center justify-center rounded-ui text-lg font-semibold ${
          tone === "onAccent" ? "bg-accent-ink text-accent" : "bg-accent text-accent-ink"
        }`}
      >
        Abrir o {name}
      </a>
      {/* no computador não tem app pra abrir: o link reserva só faz sentido no iPhone */}
      {ios && (
        <a href={fallback} className={`flex min-h-11 items-center justify-center text-sm underline underline-offset-4 ${tone === "onAccent" ? "opacity-80" : "text-muted"}`}>
          Abriu o site em vez do app? Tenta por aqui
        </a>
      )}
    </div>
  );
}
