import { MARK, sectorPath } from "@/lib/brand";

/** Marca do Porteiro pro painel: batente na cor do texto, setor dos 10s no acento do app (segue claro/escuro). */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox={MARK.viewBox} width={size} height={size} className={className} aria-hidden>
      <path d={MARK.frame} fill="none" stroke="currentColor" strokeWidth={MARK.frameWidth} />
      <path d={sectorPath(60)} fill="var(--accent)" />
    </svg>
  );
}
