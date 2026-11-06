import Link from "next/link";
import { LoadError } from "@/components/load-error";
import { Bars, PageHeader, SectionTitle } from "@/components/ui";
import { APPS, APP_IDS, type AppId } from "@/lib/config";
import { fmtTime } from "@/lib/format";
import { dateLabel, getModel, weekdayLabel, type Model, type PassView } from "@/lib/model";
import { dayKey } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  let m: Model;
  try {
    m = await getModel();
  } catch (err) {
    console.error(err);
    return <LoadError href="/apps" />;
  }

  return (
    <main className="flex flex-col gap-12">
      <PageHeader title="Apps" aside={`${m.limits.perApp} min por app hoje`} />
      {APP_IDS.map((id) => (
        <AppSection key={id} id={id} m={m} />
      ))}
      <footer className="text-sm text-muted">
        <Link href="/setup" className="inline-flex min-h-11 items-center underline underline-offset-4">
          Configurar atalhos
        </Link>
      </footer>
    </main>
  );
}

function AppSection({ id, m }: { id: AppId; m: Model }) {
  const name = APPS[id].name;
  const today = Math.round(m.today.perApp[id]);
  const week = m.week;
  const weekTotal = week.reduce((a, d) => a + d.perApp[id], 0);
  // média só dos dias completos e acompanhados (sem hoje, que ainda tá rolando)
  const completeDays = week.filter((d) => d.tracked && !d.isToday);
  const avg = completeDays.length ? completeDays.reduce((a, d) => a + d.perApp[id], 0) / completeDays.length : null;
  const passes = m.passes.filter((p) => p.app === id).slice(0, 4);

  return (
    <section aria-labelledby={`app-${id}`} className="flex flex-col gap-5 border-t border-line pt-6 first-of-type:border-t-0 first-of-type:pt-0">
      <SectionTitle id={`app-${id}`} aside={<Link href={`/entrar/${id}`} className="inline-flex min-h-11 items-center underline underline-offset-4">Entrar</Link>}>
        {name}
      </SectionTitle>

      <div className="grid grid-cols-3 gap-4">
        <Num label="Hoje" value={today} sub={`de ${m.limits.perApp}`} />
        <Num label="7 dias" value={Math.round(weekTotal)} sub="min, com hoje" />
        <Num label="Média" value={avg === null ? "-" : Math.round(avg)} sub={avg === null ? "a partir de amanhã" : "min/dia"} />
      </div>

      <Bars
        height="h-24"
        ariaLabel={`${name} por dia: ${week.map((d) => `${weekdayLabel(d.key)} ${Math.round(d.perApp[id])} min`).join(", ")}.`}
        bars={week.map((d) => ({
          key: d.key,
          label: weekdayLabel(d.key),
          value: d.perApp[id],
          limit: d.tracked ? d.perAppLimit : undefined,
          highlight: d.isToday,
          muted: !d.tracked,
        }))}
      />

      {passes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="label text-muted">Últimas entradas</h3>
          <ul className="divide-y divide-line">
            {passes.map((p) => (
              <PassRow key={p.id} p={p} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PassRow({ p }: { p: PassView }) {
  const used = Math.round(p.used);
  const overran = !p.active && used > p.asked + 1;
  const created = new Date(p.createdAt);
  const isToday = dayKey(created) === dayKey(new Date());
  return (
    <li className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{p.intent || "Sem motivo"}</span>
        <span className="text-xs text-muted">
          {isToday ? "hoje" : dateLabel(dayKey(created))}, {fmtTime(created)}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        {p.active ? (
          <span className="text-muted">liberado até {fmtTime(p.expiresAt)}</span>
        ) : (
          <>
            pediu <span className="num">{p.asked}</span>, ficou{" "}
            <span className={`num ${overran ? "font-semibold" : ""}`}>{used}</span>
          </>
        )}
      </span>
    </li>
  );
}

function Num({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="display text-[2.6rem]">{value}</span>
      <span className="text-xs text-muted">{sub}</span>
    </div>
  );
}
