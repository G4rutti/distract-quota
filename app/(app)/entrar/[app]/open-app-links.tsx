"use client";

import { useEffect, useState } from "react";

type Props = { name: string; openUrl: string; schemeUrl: string };

/**
 * No Safari, o universal link (https) tocado num <a> abre o app direto, sem confirmação.
 * No app salvo na tela de início, link externo tende a abrir um navegador embutido;
 * lá o esquema do app (snssdk1233://, instagram://) vai na frente.
 */
export function OpenAppLinks({ name, openUrl, schemeUrl }: Props) {
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
        className="press flex h-14 items-center justify-center rounded-ui bg-accent text-lg font-medium text-accent-ink"
      >
        Abrir o {name}
      </a>
      {/* no computador não tem app pra abrir: o link reserva só faz sentido no iPhone */}
      {ios && (
        <a href={fallback} className="flex min-h-11 items-center justify-center text-sm text-muted underline underline-offset-4">
          Abriu o site em vez do app? Tenta por aqui
        </a>
      )}
    </div>
  );
}
