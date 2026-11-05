// Peças visuais compartilhadas entre as telas. Tudo server component, sem estado.

export function PageHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <header className="flex items-baseline justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {aside && <span className="text-sm text-muted">{aside}</span>}
    </header>
  );
}

export function SectionTitle({ children, aside, id }: { children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-lg font-medium">
        {children}
      </h2>
      {aside && <span className="text-sm text-muted">{aside}</span>}
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

/** Linha de quadradinhos (1 por dia) pra hábito: cheio = feito, contorno = não feito, apagado = sem dado. */
export function DayDots({ days, label }: { days: { key: string; done: boolean | null }[]; label: string }) {
  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      role="img"
      aria-label={label}
    >
      {days.map((d) => (
        <div
          key={d.key}
          title={d.key}
          className={`aspect-square rounded-[4px] ${
            d.done === true ? "bg-accent" : d.done === false ? "border border-muted/60" : "bg-line/60"
          }`}
        />
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="num text-3xl font-medium leading-none">{value}</span>
      {sub && <span className="text-sm text-muted">{sub}</span>}
    </div>
  );
}
