import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LoadError } from "@/components/load-error";
import { Bars, Delta, PageHeader, Ruler, SectionTitle } from "@/components/ui";
import { APPS, APP_IDS, LIMITS } from "@/lib/config";
import { perAppLimit } from "@/lib/limits";
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
        <p className="flex items-end gap-3">
          <span className={`display text-[8.5rem] leading-[0.78] ${left < 0 ? "" : "text-accent"}`}>{total}</span>
          <span className="flex flex-col pb-1.5 text-base font-medium leading-tight">
            <span>min hoje</span>
            <span className="label text-muted">de {m.limits.total}</span>
          </span>
        </p>
        <Ruler value={total} limit={m.limits.total} label={`${total} de ${m.limits.total} minutos usados hoje`} />
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
            <>
              <Delta now={m.today.minutes} before={m.yesterday.minutes} against="ontem inteiro" />
              {", "}
            </>
          ) : (
            "Primeiro dia, amanhã já dá pra comparar. "
          )}
          {m.today.blocked} {m.today.blocked === 1 ? "barrada" : "barradas"} na porta hoje.
        </p>
      </section>

      <section aria-labelledby="por-app" className="flex flex-col gap-3">
        <SectionTitle id="por-app" aside={`limite ${m.limits.perApp} min cada`}>
          Por app
        </SectionTitle>
        <ul className="divide-y divide-line border-y border-line">
          {APP_IDS.map((id) => {
            const used = Math.round(m.today.perApp[id]);
            const pass = m.activePass[id];
            return (
              <li key={id}>
                <Link href={`/entrar/${id}`} className="press flex flex-col gap-2.5 py-4 active:bg-surface">
                  <span className="flex items-center justify-between gap-4">
                    <span className="display text-[1.9rem]">{APPS[id].name}</span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      Entrar
                      <ArrowRight size={18} weight="bold" aria-hidden />
                    </span>
                  </span>
                  <Ruler compact value={used} limit={m.limits.perApp} label={`${APPS[id].name}: ${used} de ${m.limits.perApp} minutos`} />
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
          aside={
            !m.yesterday.tracked
              ? "sequência começa amanhã"
              : m.streak > 0
                ? `${m.streak} ${m.streak === 1 ? "dia" : "dias"} no limite`
                : "sequência zerada"
          }
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
  const { perApp, daysLeft, week } = m.limits;
  // o arredondamento pra múltiplo de 5 pode repetir o valor numa semana: procura a próxima queda de verdade
  let k = week + 1;
  while (perAppLimit(k) >= perApp && perApp > LIMITS.floorPerApp) k++;
  const nextPerApp = perAppLimit(k);
  const daysToDrop = daysLeft + (k - week - 1) * 7;
  return (
    <section aria-labelledby="limite" className="flex flex-col gap-2 rounded-ui bg-surface p-5">
      <p className="label text-muted">O limite</p>
      <h2 id="limite" className="display text-[1.9rem]">
        Semana {week + 1} do programa
      </h2>
      <p className="text-sm text-muted">
        {perApp > LIMITS.floorPerApp ? (
          <>
            Em {daysToDrop} {daysToDrop === 1 ? "dia" : "dias"} o limite cai de {perApp} pra{" "}
            <strong className="font-semibold text-text">{nextPerApp} min</strong> por app.
          </>
        ) : (
          <>Você chegou no limite mínimo de {perApp} min por app. Daqui não desce mais.</>
        )}
      </p>
    </section>
  );
}
