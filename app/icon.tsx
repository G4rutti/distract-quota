import { ImageResponse } from "next/og";
import { BRAND, MARK, sectorPath } from "@/lib/brand";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Porta em arco com o mostrador no topo; o setor vermelho são os 10s de espera (60 graus).
// Fundo preto, batente branco: aparece bem tanto na tela inicial clara quanto na escura.
export function mark(px: number) {
  const inner = Math.round(px * 0.72);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.ink }}>
      <svg width={inner} height={inner} viewBox={MARK.viewBox}>
        <path d={MARK.frame} fill="none" stroke={BRAND.paper} strokeWidth={MARK.frameWidth} />
        <path d={sectorPath(60)} fill={BRAND.red} />
      </svg>
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(mark(512), size);
}
