import { MARK, sectorPath } from "@/lib/brand";

type Props = {
  size?: number;
  /** Cor do batente. */
  ink?: string;
  /** Cor do setor de 10s. */
  accent?: string;
  /** Ângulo do setor (padrão 60 = 10 segundos). */
  deg?: number;
  className?: string;
  title?: string;
};

export function Mark({ size = 28, ink = "currentColor", accent = "var(--pt-acc)", deg = 60, className, title }: Props) {
  return (
    <svg
      viewBox={MARK.viewBox}
      width={size || undefined}
      height={size || undefined}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={MARK.frame} fill="none" stroke={ink} strokeWidth={MARK.frameWidth} />
      <path d={sectorPath(deg)} fill={accent} />
    </svg>
  );
}

export function Wordmark({ className, accent }: { className?: string; accent?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Mark size={26} accent={accent} />
      <span className="pt-display text-[26px] leading-none tracking-[0.01em]">Porteiro</span>
    </span>
  );
}
