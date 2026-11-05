import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { APPS, APP_IDS } from "@/lib/config";

const APP_NAMES = new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(APP_IDS.map((id) => APPS[id].name));
import { fmtDate, fmtTime, mins } from "@/lib/format";
import { getStats, type Stats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function Home() {
  let stats: Stats;
  try {
    stats = await getStats();
  } catch (err) {
    console.error(err);
    return <LoadError />;
  }

  const { today, goal } = stats;
  const total = mins(today.minutes);
  const left = goal - total;

  return (
    <main className="flex flex-col gap-12">
      <header className="flex items-baseline justify-between">
        <span className="text-sm font-semibold tracking-tight">Porteiro</span>
        <span className="text-sm text-muted">{fmtDate(new Date())}</span>
      </header>

      <section aria-labelledby="hoje" className="flex flex-col gap-3">
        <h1 id="hoje" className="text-sm text-muted">
          Hoje em {APP_NAMES}
        </h1>
        <p className="flex items-baseline gap-2">
          <span className="num text-[5.5rem] font-medium leading-[0.9]">{total}</span>
          <span className="text-xl text-muted">min</span>
        </p>
        <p className="text-base">
          {left >= 0 ? (
            <>
              Ainda cabem <strong className="font-semibold">{left} min</strong> no limite de {goal}.
            </>
          ) : (
            <>
              Passou <strong className="font-semibold">{-left} min</strong> do limite de {goal}.
            </>
          )}
        </p>
        <p className="text-sm text-muted">
          {today.allowedOpens} {today.allowedOpens === 1 ? "passe liberado" : "passes liberados"}, {today.blocked}{" "}
          {today.blocked === 1 ? "barrada" : "barradas"} na porta.
        </p>
      </section>

      <section aria-labelledby="apps">
        <h2 id="apps" className="sr-only">
          Apps
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {APP_IDS.map((id) => {
            const pass = stats.lastPass[id];
            return (
              <li key={id}>
                <Link
                  href={`/entrar/${id}`}
                  className="press flex items-center justify-between gap-4 py-5 active:bg-surface"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-lg font-medium">{APPS[id].name}</span>
                    <span className="text-sm text-muted">
                      <span className="num">{mins(today.perApp[id])}</span> min hoje
                      {pass?.active && (
                        <>
                          {", "}
                          <span className="text-text">liberado até {fmtTime(pass.expiresAt)}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    Entrar
                    <ArrowRight size={18} weight="bold" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {stats.hasData ? <History stats={stats} /> : <EmptyState />}

      <footer className="flex justify-between text-sm text-muted">
        <Link href="/setup" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Configurar atalhos
        </Link>
      </footer>
    </main>
  );
}

function History({ stats }: { stats: Stats }) {
  const scaleMax = Math.max(stats.goal * 1.25, ...stats.week.map((d) => d.minutes), 1);
  const goalPct = (stats.goal / scaleMax) * 100;
  const hourMax = Math.max(...stats.hours, 1);
  const peak = stats.hours.indexOf(Math.max(...stats.hours));

  return (
    <>
      <section aria-labelledby="semana" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="semana" className="text-lg font-medium">
            Últimos 7 dias
          </h2>
          <span className="text-sm text-muted">
            {stats.streak > 0
              ? `${stats.streak} ${stats.streak === 1 ? "dia" : "dias"} seguidos no limite`
              : "Sequência zerada"}
          </span>
        </div>

        <div className="relative h-40" role="img" aria-label={weekLabel(stats)}>
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-muted"
            style={{ bottom: `${goalPct}%` }}
            aria-hidden
          />
          <div className="absolute inset-0 grid grid-cols-7 items-end gap-2" aria-hidden>
            {stats.week.map((d) => (
              <div key={d.key} className="flex h-full flex-col justify-end">
                <div
                  className={`rounded-t-[6px] ${d.isToday ? "bg-accent" : d.minutes > stats.goal ? "bg-text/80" : "bg-text/45 dark:bg-text/30"}`}
                  style={{ height: `${Math.max((d.minutes / scaleMax) * 100, d.minutes > 0 ? 3 : 0)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted" aria-hidden>
          {stats.week.map((d) => (
            <span key={d.key} className={d.isToday ? "font-semibold text-text" : undefined}>
              {d.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted">A linha tracejada é o limite de {stats.goal} min. Barra escura passou dele.</p>
      </section>

      <section aria-labelledby="horarios" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="horarios" className="text-lg font-medium">
            Quando a mão coça
          </h2>
          {Math.max(...stats.hours) > 0 && (
            <span className="text-sm text-muted">pico às {String(peak).padStart(2, "0")}h</span>
          )}
        </div>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {stats.hours.map((n, h) => (
            <div
              key={h}
              title={`${h}h: ${n} ${n === 1 ? "tentativa" : "tentativas"}`}
              className={`h-10 rounded-[4px] ${n === 0 ? "bg-line" : "bg-accent"}`}
              style={n === 0 ? undefined : { opacity: 0.35 + 0.65 * (n / hourMax) }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted" aria-hidden>
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>
        <p className="sr-only">
          Tentativas de abrir por hora nos últimos 7 dias:{" "}
          {stats.hours.map((n, h) => `${h}h ${n}`).join(", ")}.
        </p>
      </section>
    </>
  );
}

function weekLabel(stats: Stats) {
  return `Minutos por dia nos últimos 7 dias: ${stats.week.map((d) => `${d.label} ${mins(d.minutes)}`).join(", ")}. Limite de ${stats.goal} minutos.`;
}

function EmptyState() {
  return (
    <section className="flex flex-col gap-3 rounded-ui bg-surface p-5">
      <h2 className="text-lg font-medium">Nada registrado ainda</h2>
      <p className="text-muted">
        Os números aparecem quando os atalhos do iPhone começarem a avisar cada vez que o TikTok ou o Instagram abrir e
        fechar.
      </p>
      <Link href="/setup" className="press self-start rounded-ui bg-accent px-4 py-2.5 font-medium text-accent-ink">
        Ver como configurar
      </Link>
    </section>
  );
}

function LoadError() {
  return (
    <main className="flex min-h-[70dvh] flex-col justify-center gap-3">
      <h1 className="text-2xl font-semibold">Não deu pra carregar</h1>
      <p className="text-muted">
        O banco não respondeu. Confere SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel e se a migration rodou.
      </p>
      <Link href="/" className="underline underline-offset-4">
        Tentar de novo
      </Link>
    </main>
  );
}
