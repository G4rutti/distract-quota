import "server-only";
import { HABITS, TIMEZONE } from "./config";
import { db } from "./db";

// Fontes dos hábitos. Tudo leitura: as tabelas saude, treinos e treinos_relogio são do app de saúde
// que já roda nesse mesmo projeto Supabase; o Porteiro nunca escreve nelas.

export type HealthDay = { sleepMin: number | null; steps: number | null };
export type Workout = { key: string; label: string; minutes: number | null };

export type HabitSources = {
  health: Map<string, HealthDay>;
  workouts: Workout[];
  pushes: Map<string, number>;
  lastHealthKey: string | null; // último dia que o app de saúde mandou dado
  githubOk: boolean;
  healthOk: boolean; // false = não consegui ler o app de saúde (diferente de "sem dado")
};

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export async function getHabitSources(sinceKey: string): Promise<HabitSources> {
  const [saude, treinos, relogio, github] = await Promise.all([
    db().from("saude").select("dia, sono_min, passos").gte("dia", sinceKey).order("dia", { ascending: true }),
    db().from("treinos").select("dia, titulo, dur_s").gte("dia", sinceKey).order("dia", { ascending: true }),
    db().from("treinos_relogio").select("dia, tipo, duracao_min").gte("dia", sinceKey).order("dia", { ascending: true }),
    fetchPushes(),
  ]);

  const health = new Map<string, HealthDay>();
  for (const r of (saude.data ?? []) as { dia: string; sono_min: number | null; passos: number | null }[]) {
    // zero = relógio fora do pulso, não um dia ruim
    health.set(r.dia, { sleepMin: r.sono_min && r.sono_min > 0 ? r.sono_min : null, steps: r.passos && r.passos > 0 ? r.passos : null });
  }
  if (saude.error) console.error("habitos: saude", saude.error);

  const workouts: Workout[] = [];
  for (const r of (treinos.data ?? []) as { dia: string; titulo: string; dur_s: number }[]) {
    workouts.push({ key: r.dia, label: r.titulo || "Academia", minutes: r.dur_s > 0 ? Math.round(r.dur_s / 60) : null });
  }
  for (const r of (relogio.data ?? []) as { dia: string; tipo: string | null; duracao_min: number | null }[]) {
    workouts.push({ key: r.dia, label: r.tipo || "Treino no relógio", minutes: r.duracao_min });
  }
  if (treinos.error) console.error("habitos: treinos", treinos.error);
  if (relogio.error) console.error("habitos: treinos_relogio", relogio.error);

  const { data: last } = await db().from("saude").select("dia").order("dia", { ascending: false }).limit(1).maybeSingle();

  return {
    health,
    workouts,
    pushes: github.pushes,
    lastHealthKey: (last as { dia: string } | null)?.dia ?? null,
    githubOk: github.ok,
    healthOk: !saude.error && !treinos.error && !relogio.error,
  };
}

/**
 * Pushes no GitHub por dia, pelos eventos públicos (últimos 90 dias, até 300 eventos).
 * Repositório privado só aparece se GITHUB_TOKEN estiver no ambiente.
 * Cache de 30 min pra não estourar o limite de 60 requisições/hora sem token.
 */
async function fetchPushes(): Promise<{ pushes: Map<string, number>; ok: boolean }> {
  const pushes = new Map<string, number>();
  if (process.env.PORTEIRO_MOCK === "1") return { pushes, ok: false };
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = { accept: "application/vnd.github+json", "user-agent": "porteiro-app" };
  if (token) headers.authorization = `Bearer ${token}`;
  const path = token ? "events" : "events/public";
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://api.github.com/users/${HABITS.githubUser}/${path}?per_page=100&page=${page}`, {
        headers,
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(2500), // GitHub travado não pode segurar as telas
      });
      if (!res.ok) return { pushes, ok: page > 1 };
      const events = (await res.json()) as { type: string; created_at: string }[];
      for (const e of events) {
        if (e.type !== "PushEvent") continue;
        const key = dayFmt.format(new Date(e.created_at));
        pushes.set(key, (pushes.get(key) ?? 0) + 1);
      }
      if (events.length < 100) break;
    }
    return { pushes, ok: true };
  } catch (err) {
    console.error("habitos: github", err);
    return { pushes, ok: false };
  }
}
