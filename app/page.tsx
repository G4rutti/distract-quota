import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LoadError } from "@/components/load-error";
import { Bars, Delta, PageHeader, SectionTitle } from "@/components/ui";
import { APPS, APP_IDS } from "@/lib/config";
import { fmtDate, fmtTime } from "@/lib/format";
import { getModel, weekdayLabel, type Model } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function Hoje() {
  let m: Model;
  try {
    m = await getModel();
  } catch (err) {
    console.error(err);
    return <LoadError />;
  }

  const total = Math.round(m.today.minutes);
  const left = m.limits.total - total;

  return (
    <main className="flex flex-col gap-12">
      <PageHeader title="Hoje" aside={fmtDate(new Date())} />

      <section aria-labelledby="tempo" className="flex flex-col gap-3">
        <h2 id="tempo" className="sr-only">
          Tempo de tela hoje
        </h2>
        <p className="flex items-baseline gap-2">
          <span className="num text-[5.5rem] font-medium leading-[0.9]">{total}</span>
          <span className="text-xl text-muted">min</span>
        </p>
        <p className="text-base">
          {left >= 0 ? (
            <>
              Ainda cabem <strong className="font-semibold">{left} min</strong> no limite de {m.limits.total}.
            </>
          ) : (
            <>
              Passou <strong className="font-semibold">{-left} min</strong> do limite de {m.limits.total}.
            </>
          )}
        </p>
        <p className="text-sm text-muted">
          {m.yesterday.tracked ? (
            <Delta now={m.today.minutes} before={m.yesterday.minutes} against="ontem inteiro" />
          ) : (
            "Primeiro dia: amanhã já dá pra comparar com hoje."
          )}
          {", "}
          {m.today.blocked} {m.today.blocked === 1 ? "barrada" : "barradas"} na porta.
        </p>
      </section>

      <section aria-labelledby="por-app" className="flex flex-col gap-3">
        <SectionTitle id="por-app" aside={`limite ${m.limits.perApp} min cada`}>
          Por app
        </SectionTitle>
        <ul className="divide-y divide-line border-y border-line">
          {APP_IDS.map((id) => {
            const used = Math.round(m.today.perApp[id]);
            const pct = Math.min(100, (used / m.limits.perApp) * 100);
            const pass = m.activePass[id];
            return (
              <li key={id}>
                <Link href={`/entrar/${id}`} className="press flex flex-col gap-2.5 py-4 active:bg-surface">
                  <span className="flex items-center justify-between gap-4">
                    <span className="text-lg font-medium">{APPS[id].name}</span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      Entrar
                      <ArrowRight size={18} weight="bold" aria-hidden />
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span
                      className={`block h-full rounded-full ${used > m.limits.perApp ? "bg-text" : "bg-accent"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="text-sm text-muted">
                    <span className="num text-text">{used}</span> de {m.limits.perApp} min
                    {pass && <>, liberado até {fmtTime(pass.expiresAt)}</>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="semana" className="flex flex-col gap-4">
        <SectionTitle
          id="semana"
          aside={m.streak > 0 ? `${m.streak} ${m.streak === 1 ? "dia" : "dias"} no limite` : "Sequência zerada"}
        >
          Últimos 7 dias
        </SectionTitle>
        <Bars
          ariaLabel={`Minutos por dia: ${m.week.map((d) => `${weekdayLabel(d.key)} ${Math.round(d.minutes)} de ${d.limit}`).join(", ")}.`}
          bars={m.week.map((d) => ({
            key: d.key,
            label: weekdayLabel(d.key),
            value: d.minutes,
            limit: d.tracked ? d.limit : undefined,
            highlight: d.isToday,
            muted: !d.tracked,
          }))}
        />
        <p className="text-xs text-muted">Tracejado é o limite do dia. Barra escura passou dele.</p>
      </section>

      <LimitSchedule m={m} />

      <footer className="text-sm text-muted">
        <Link href="/setup" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Configurar atalhos
        </Link>
      </footer>
    </main>
  );
}

function LimitSchedule({ m }: { m: Model }) {
  const { perApp, nextPerApp, daysLeft, week } = m.limits;
  return (
    <section aria-labelledby="limite" className="flex flex-col gap-2 rounded-ui bg-surface p-5">
      <h2 id="limite" className="font-medium">
        Semana {week + 1} do programa
      </h2>
      <p className="text-sm text-muted">
        {nextPerApp < perApp ? (
          <>
            Em {daysLeft} {daysLeft === 1 ? "dia" : "dias"} o limite cai de {perApp} pra{" "}
            <strong className="font-semibold text-text">{nextPerApp} min</strong> por app.
          </>
        ) : (
          <>Você chegou no limite mínimo de {perApp} min por app. Daqui não desce mais.</>
        )}
      </p>
    </section>
  );
}
