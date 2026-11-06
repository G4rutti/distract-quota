import { LoadError } from "@/components/load-error";
import { Bars, PageHeader, SectionTitle } from "@/components/ui";
import { APPS, APP_IDS } from "@/lib/config";
import { weekIndex } from "@/lib/limits";
import { addDays, dateLabel, getModel, type Model } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  let m: Model;
  try {
    m = await getModel();
  } catch (err) {
    console.error(err);
    return <LoadError href="/insights" />;
  }

  const r = m.report;
  if (!r.enoughData) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="Insights" />
        <p className="text-muted">
          O relatório nasce depois do primeiro dia completo. Amanhã já tem o começo, e com uma semana dá pra comparar.
        </p>
      </main>
    );
  }

  const from = addDays(m.todayKey, -r.thisWeek.days);
  const to = addDays(m.todayKey, -1);
  const shareTotal = r.thisWeek.total || 1;
  const hourMax = Math.max(...m.hours, 1);

  // Evolução: média diária por semana do programa, só dias completos (hoje fica de fora), últimas 4 semanas
  const complete = m.days.filter((d) => d.tracked && !d.isToday);
  const currentWeek = m.limits.week;
  const weeks = Array.from({ length: 4 }, (_, i) => currentWeek - 3 + i)
    .filter((w) => w >= 0)
    .map((w) => {
      const slice = complete.filter((d) => weekIndex(m.firstKey, d.key) === w);
      const avg = slice.length ? slice.reduce((a, d) => a + d.minutes, 0) / slice.length : 0;
      return { key: `w${w}`, label: `sem ${w + 1}`, value: avg, has: slice.length > 0, current: w === currentWeek };
    });

  return (
    <main className="flex flex-col gap-12">
      <PageHeader title="Insights" aside={`${dateLabel(from)} a ${dateLabel(to)}`} />

      <section aria-labelledby="resumo" className="flex flex-col gap-3">
        <h2 id="resumo" className="sr-only">
          Resumo da semana
        </h2>
        <p className="flex items-baseline gap-2">
          <span className="display text-[7rem] leading-[0.8] text-accent">{Math.round(r.thisWeek.avg)}</span>
          <span className="text-xl text-muted">min por dia</span>
        </p>
        <p>
          {r.prevWasZero ? (
            <span className="text-muted">Na semana anterior você não usou nada, então não tem como comparar em %.</span>
          ) : r.deltaPct === null ? (
            <span className="text-muted">Com mais uma semana de dados dá pra comparar com a anterior.</span>
          ) : (
            <>
              <strong className="font-semibold">{Math.abs(Math.round(r.deltaPct))}%</strong>{" "}
              {r.deltaPct <= 0 ? "a menos" : "a mais"} que a semana anterior ({Math.round(r.prevWeek!.avg)} min por dia).
            </>
          )}
        </p>
        <p className="text-sm text-muted">
          {Math.round(r.thisWeek.total)} min no total em {r.thisWeek.days} {r.thisWeek.days === 1 ? "dia" : "dias"}.
        </p>
      </section>

      <section aria-labelledby="recuperado" className="flex flex-col gap-2 rounded-ui bg-surface p-5">
        <h2 id="recuperado" className="font-medium">
          Tempo recuperado
        </h2>
        {r.recoveredTotal === null ? (
          <p className="text-sm text-muted">
            Conta a partir da segunda semana, contra a tua média da primeira semana. Ainda tô medindo essa média.
          </p>
        ) : (
          <>
            <p className="flex items-baseline gap-2">
              <span className="display text-[3.2rem]">{formatHours(r.recoveredTotal)}</span>
            </p>
            <p className="text-sm text-muted">
              desde o começo, abaixo da tua média inicial de {Math.round(r.baseline!)} min por dia
              {r.recoveredWeek ? `. Nesta semana: ${formatHours(r.recoveredWeek)}.` : "."}
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="evolucao" className="flex flex-col gap-4">
        <SectionTitle id="evolucao" aside="média por dia">
          Evolução semanal
        </SectionTitle>
        <Bars
          height="h-28"
          ariaLabel={`Média diária por semana do programa: ${weeks
            .map((w) => `semana ${w.label.slice(4)}, ${w.has ? `${Math.round(w.value)} min` : "sem dado"}`)
            .join("; ")}.`}
          bars={weeks.map((w) => ({ key: w.key, label: w.label, value: w.value, highlight: w.current, muted: !w.has }))}
        />
      </section>

      <section aria-labelledby="divisao" className="flex flex-col gap-4">
        <SectionTitle id="divisao">Divisão da semana</SectionTitle>
        <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
          {APP_IDS.map((id, i) => (
            <span
              key={id}
              className="h-full bg-accent"
              style={{ width: `${(r.thisWeek.perApp[id] / shareTotal) * 100}%`, opacity: 1 - i * 0.3 }}
            />
          ))}
        </div>
        <ul className="flex flex-col gap-1.5">
          {APP_IDS.map((id, i) => (
            <li key={id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="size-3 rounded-[3px] bg-accent" style={{ opacity: 1 - i * 0.3 }} aria-hidden />
                {APPS[id].name}
              </span>
              <span>
                <span className="num">{Math.round(r.thisWeek.perApp[id])}</span> min,{" "}
                {Math.round((r.thisWeek.perApp[id] / shareTotal) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {r.insights.length > 0 && (
        <section aria-labelledby="achados" className="flex flex-col gap-4">
          <SectionTitle id="achados">O que os dados dizem</SectionTitle>
          <ul className="divide-y divide-line border-y border-line">
            {r.insights.map((x) => (
              <li key={x.title} className="flex flex-col gap-1 py-4">
                <span className="text-sm text-muted">{x.title}</span>
                <span className="text-xl font-medium tracking-tight">{x.value}</span>
                <span className="text-sm text-muted">{x.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="horarios" className="flex flex-col gap-4">
        <SectionTitle id="horarios" aside="tentativas, 7 dias">
          Quando a mão coça
        </SectionTitle>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {m.hours.map((n, h) => (
            <div
              key={h}
              title={`${h}h: ${n} ${n === 1 ? "tentativa" : "tentativas"}`}
              className={`h-10 rounded-[4px] ${n === 0 ? "bg-line" : "bg-accent"}`}
              style={n === 0 ? undefined : { opacity: 0.35 + 0.65 * (n / hourMax) }}
            />
          ))}
        </div>
        {/* rótulos na mesma grade de 24 colunas, pra cair embaixo da hora certa */}
        <div className="grid gap-[3px] text-xs text-muted" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }} aria-hidden>
          {[0, 6, 12, 18].map((h) => (
            <span key={h} className="whitespace-nowrap" style={{ gridColumnStart: h + 1 }}>
              {h}h
            </span>
          ))}
        </div>
        <p className="sr-only">Tentativas por hora: {m.hours.map((n, h) => `${h}h ${n}`).join(", ")}.</p>
      </section>
    </main>
  );
}

function formatHours(min: number) {
  const h = Math.floor(min / 60);
  const mm = Math.round(min % 60);
  return h > 0 ? `${h}h${String(mm).padStart(2, "0")}` : `${mm} min`;
}
