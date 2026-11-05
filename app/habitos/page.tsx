import { LoadError } from "@/components/load-error";
import { DayDots, PageHeader } from "@/components/ui";
import { dateLabel, getModel, type Habit, type Model } from "@/lib/model";

export const dynamic = "force-dynamic";

export default async function HabitosPage() {
  let m: Model;
  try {
    m = await getModel();
  } catch (err) {
    console.error(err);
    return <LoadError href="/habitos" />;
  }

  const { lastHealthKey, githubOk, healthOk } = m.habitNotes;
  const healthStale = lastHealthKey !== null && lastHealthKey < m.days[m.days.length - 3].key;

  return (
    <main className="flex flex-col gap-10">
      <PageHeader title="Hábitos" aside="últimos 28 dias" />
      <p className="-mt-6 text-sm text-muted">
        Tudo entra sozinho: sono, passos e treino vêm do teu relógio, programação vem do GitHub.
      </p>

      {healthOk && healthStale && (
        <p role="note" className="rounded-ui bg-surface p-4 text-sm">
          O relógio não manda dado desde <strong className="font-semibold">{dateLabel(lastHealthKey)}</strong>. Sono,
          passos e treino voltam a aparecer quando a sincronização voltar.
        </p>
      )}
      {!healthOk && (
        <p role="note" className="rounded-ui bg-surface p-4 text-sm">
          Não consegui ler o app de saúde agora. Sono, passos e treino aparecem de novo no próximo carregamento.
        </p>
      )}
      {healthOk && lastHealthKey === null && (
        <p role="note" className="rounded-ui bg-surface p-4 text-sm">
          Ainda não chegou nenhum dado do relógio.
        </p>
      )}

      <ul className="flex flex-col gap-8">
        {m.habits.map((h) => (
          <HabitRow key={h.id} h={h} />
        ))}
      </ul>

      <div className="flex items-center gap-5 text-xs text-muted" aria-hidden>
        <Legend className="bg-accent" label="Feito" />
        <Legend className="border-2 border-muted" label="Não feito" />
        <Legend className="bg-line" label="Sem dado" />
      </div>

      {!githubOk && (
        <p className="text-xs text-muted">
          O GitHub não respondeu agora. Programação aparece de novo no próximo carregamento.
        </p>
      )}
    </main>
  );
}

function HabitRow({ h }: { h: Habit }) {
  return (
    <li className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-medium">{h.name}</h2>
          <span className="text-sm text-muted">{h.goal}</span>
        </div>
        <span className="text-right text-sm">
          {h.hasData ? (
            <>
              <span className="num text-2xl font-medium">{h.doneLast7}</span>
              <span className="text-muted">/7 dias</span>
            </>
          ) : (
            <span className="text-muted">sem dado</span>
          )}
        </span>
      </div>
      <DayDots
        days={h.days.map((d) => ({ ...d, title: dateLabel(d.key) }))}
        label={`${h.name} nos últimos 28 dias: ${h.days.filter((d) => d.done === true).length} feitos, ${
          h.days.filter((d) => d.done === false).length
        } não feitos, ${h.days.filter((d) => d.done === null).length} sem dado.`}
      />
      <p className="text-sm text-muted">
        Hoje: <span className="text-text">{h.today}</span>.{h.streak > 1 && <> {h.streak} dias seguidos.</>}
      </p>
    </li>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-3 rounded-[3px] ${className}`} />
      {label}
    </span>
  );
}
