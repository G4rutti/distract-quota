// Peças visuais compartilhadas entre as telas. Tudo server component, sem estado.
// Mesma linguagem da landing: títulos e números na condensada, rótulos em mono, régua de minutos.

import { BrandMark } from "./brand-mark";

export function PageHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4">
      <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <BrandMark size={20} /> Porteiro
      </span>
      <div className="flex items-end justify-between gap-4">
        <h1 className="display text-[3.6rem]">{title}</h1>
        {aside && <span className="label pb-1.5 text-right text-muted">{aside}</span>}
      </div>
    </header>
  );
}

export function SectionTitle({ children, aside, id }: { children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="display text-[1.9rem]">
        {children}
      </h2>
      {aside && <span className="label pb-1 text-right text-muted">{aside}</span>}
    </div>
  );
}

/**
 * Régua de minutos (a da landing): um traço por minuto (ou por 5, se o limite for grande).
 * Traço cheio = usado; o do limite fica no acento e mais alto. Passou do limite, a régua cresce até o usado.
 */
export function Ruler({ value, limit, compact = false, label }: { value: number; limit: number; compact?: boolean; label: string }) {
  const used = Math.max(0, Math.round(value));
  const step = Math.max(limit, used) > 90 ? 5 : 1;
  const max = Math.ceil(Math.max(limit, used) / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, k) => k * step);
  const h = compact ? 14 : 30;
  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={label}>
      <div className="relative" style={{ height: h + (compact ? 4 : 10) }} aria-hidden>
        {ticks.map((m) => {
          const atLimit = m === Math.ceil(limit / step) * step;
          const major = m % (step * 5) === 0;
          const on = m > 0 && m <= used;
          return (
            <span
              key={m}
              className={`absolute bottom-0 rounded-full ${atLimit ? "bg-accent" : on ? (m > limit ? "bg-text" : "bg-text/80") : "bg-line"}`}
              style={{
                left: `${(m / max) * 100}%`,
                width: atLimit ? 3 : 2,
                marginLeft: atLimit ? -1.5 : -1,
                height: atLimit ? h + (compact ? 4 : 10) : major ? h : h * 0.55,
              }}
            />
          );
        })}
      </div>
      {!compact && (
        <div className="relative h-4 text-[11px] text-muted" aria-hidden>
          {ticks
            .filter((m) => m % (step * (max > 120 ? 30 : max > 60 ? 15 : 10)) === 0)
            .map((m) => (
              <span key={m} className="num absolute -translate-x-1/2" style={{ left: `${(m / max) * 100}%` }}>
                {m}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

export type Bar = { key: string; label: string; value: number; limit?: number; highlight?: boolean; muted?: boolean };

/** Barras verticais com linha tracejada de limite. Barra acima do limite fica escura; a de hoje, no acento. */
export function Bars({ bars, ariaLabel, height = "h-36" }: { bars: Bar[]; ariaLabel: string; height?: string }) {
  const limits = bars.map((b) => b.limit ?? 0);
  const max = Math.max(...bars.map((b) => b.value), ...limits, 1) * 1.1;
  const sameLimit = limits.every((l) => l === limits[0]) && limits[0] > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className={`relative ${height}`} role="img" aria-label={ariaLabel}>
        {sameLimit && (
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-muted"
            style={{ bottom: `${(limits[0] / max) * 100}%` }}
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0 grid items-end gap-1.5"
          style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {bars.map((b) => {
            const over = b.limit !== undefined && b.value > b.limit;
            const color = b.highlight
              ? "bg-accent"
              : b.muted
                ? "bg-line"
                : over
                  ? "bg-text/80"
                  : "bg-text/45 dark:bg-text/30";
            return (
              <div key={b.key} className="relative flex h-full flex-col justify-end">
                {!sameLimit && b.limit !== undefined && b.limit > 0 && (
                  <div className="absolute inset-x-0 border-t-2 border-dashed border-muted" style={{ bottom: `${(b.limit / max) * 100}%` }} />
                )}
                <div
                  className={`rounded-t-[6px] ${color}`}
                  style={{ height: `${Math.max((b.value / max) * 100, b.value > 0 ? 3 : 0)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div
        className="grid gap-1.5 text-center text-xs text-muted"
        style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {bars.map((b) => (
          <span key={b.key} className={b.highlight ? "font-semibold text-text" : undefined}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** "12 min a menos que ontem" com a direção certa; sem cor, só palavra. */
export function Delta({ now, before, unit = "min", against }: { now: number; before: number; unit?: string; against: string }) {
  const diff = Math.round(now - before);
  if (diff === 0) return <>Igual a {against}</>;
  return (
    <>
      <strong className="font-semibold">
        {Math.abs(diff)} {unit}
      </strong>{" "}
      {diff < 0 ? "a menos" : "a mais"} que {against}
    </>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="display text-[2.6rem]">{value}</span>
      {sub && <span className="text-sm text-muted">{sub}</span>}
    </div>
  );
}
