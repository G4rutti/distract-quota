import { LoadError } from "@/components/load-error";
import { PageHeader } from "@/components/ui";
import { ENERGY_LABELS, MOOD_LABELS } from "@/lib/config";
import { dateLabel, diaryLines, getModel, weekdayLabel, type DayStat, type Model } from "@/lib/model";
import { MoodPicker } from "./mood-picker";

export const dynamic = "force-dynamic";

export default async function DiarioPage() {
  let m: Model;
  try {
    m = await getModel();
  } catch (err) {
    console.error(err);
    return <LoadError href="/diario" />;
  }

  const editable = [m.today, m.yesterday];
  const history = m.days
    .slice(0, -2)
    .reverse()
    .filter((d) => d.tracked || d.mood !== null || d.sleepMin !== null || d.workouts.length > 0)
    .slice(0, 14);

  return (
    <main className="flex flex-col gap-10">
      <PageHeader title="Diário" />
      <p className="-mt-6 text-sm text-muted">
        O resumo se escreve sozinho com os teus dados. Você só toca em como foi o humor e a disposição.
      </p>

      {editable.map((d) => (
        <section key={d.key} aria-labelledby={`dia-${d.key}`} className="flex flex-col gap-5">
          <DayHeading d={d} id={`dia-${d.key}`} title={d.isToday ? "Hoje" : "Ontem"} />
          <Summary d={d} />
          <MoodPicker dia={d.key} field="humor" label="Humor" options={MOOD_LABELS} value={d.mood} />
          <MoodPicker dia={d.key} field="energia" label="Disposição" options={ENERGY_LABELS} value={d.energy} />
        </section>
      ))}

      {history.length > 0 && (
        <section aria-labelledby="antes" className="flex flex-col gap-4">
          <h2 id="antes" className="text-lg font-medium">
            Dias anteriores
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {history.map((d) => (
              <li key={d.key} className="flex flex-col gap-2 py-4">
                <DayHeading d={d} />
                <Summary d={d} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function DayHeading({ d, id, title }: { d: DayStat; id?: string; title?: string }) {
  const Tag = title ? "h2" : "h3";
  return (
    <div className="flex items-baseline justify-between gap-4">
      <Tag id={id} className={title ? "text-lg font-medium" : "font-medium"}>
        {title ?? `${weekdayLabel(d.key)}, ${dateLabel(d.key)}`}
        {title && <span className="ml-2 text-sm font-normal text-muted">{dateLabel(d.key)}</span>}
      </Tag>
      {!title && (d.mood || d.energy) && (
        <span className="text-sm text-muted">
          {d.mood && <>humor {MOOD_LABELS[d.mood - 1].toLowerCase()}</>}
          {d.mood && d.energy && ", "}
          {d.energy && <>disposição {ENERGY_LABELS[d.energy - 1].toLowerCase()}</>}
        </span>
      )}
    </div>
  );
}

function Summary({ d }: { d: DayStat }) {
  const lines = diaryLines(d);
  if (!lines.length) return <p className="text-sm text-muted">Nenhum dado nesse dia.</p>;
  return <p className="max-w-[60ch] text-base leading-relaxed text-muted">{lines.join(" ")}</p>;
}
