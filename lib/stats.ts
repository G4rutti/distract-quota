import "server-only";
import { APP_IDS, DAILY_GOAL_MIN, MAX_SESSION_MIN, TIMEZONE, type AppId } from "./config";
import { db, type EventRow, type PassRow } from "./db";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const PAGE = 1000; // limite padrão de linhas por request do Supabase

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, weekday: "short" });

export const dayKey = (d: Date) => dayFmt.format(d); // YYYY-MM-DD no fuso de SP

/** Primeiro instante do dia de hoje no fuso configurado. */
function startOfToday(nowMs: number): Date {
  const key = dayKey(new Date(nowMs));
  let lo = nowMs - DAY;
  let hi = nowMs;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (dayKey(new Date(mid)) === key) hi = mid;
    else lo = mid;
  }
  return new Date(hi);
}
const hourOf = (d: Date) => Number(hourFmt.format(d)) % 24;

export type Session = { app: AppId; start: number; end: number; minutes: number; live: boolean };

async function fetchEvents(sinceIso: string): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from("events")
      .select("id, app, kind, allowed, at")
      .gte("at", sinceIso)
      .order("at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) return rows; // para só na página vazia: funciona com qualquer max_rows do projeto
    rows.push(...(data as EventRow[]));
  }
}

/**
 * Abertura liberada + próximo fechamento do mesmo app = uma sessão.
 * Abertura sem fechamento (atalho de fechar falhou) vira sessão estimada com teto MAX_SESSION_MIN,
 * terminando no próximo evento daquele app, no teto ou agora, o que vier primeiro.
 */
export function buildSessions(events: EventRow[], now: number): Session[] {
  const sessions: Session[] = [];
  const pending = new Map<string, number>();
  const cap = MAX_SESSION_MIN * MIN;

  const closeEstimated = (app: string, start: number, until: number) => {
    const end = Math.min(until, start + cap);
    if (end > start) sessions.push({ app: app as AppId, start, end, minutes: (end - start) / MIN, live: end === now });
  };

  for (const e of events) {
    const t = Date.parse(e.at);
    if (e.kind === "open") {
      // qualquer abertura (liberada ou barrada) encerra uma pendente que perdeu o close;
      // senão o close de uma barrada casaria com uma abertura velha e inflaria o tempo
      const prev = pending.get(e.app);
      if (prev !== undefined) closeEstimated(e.app, prev, t);
      pending.delete(e.app);
      if (e.allowed) pending.set(e.app, t);
      continue;
    }
    const start = pending.get(e.app);
    if (start === undefined) continue; // close de uma abertura barrada
    pending.delete(e.app);
    // sessão com close é real, sem teto: pediu 10 e ficou 4h tem que aparecer
    sessions.push({ app: e.app as AppId, start, end: t, minutes: (t - start) / MIN, live: false });
  }

  for (const [app, start] of pending) closeEstimated(app, start, now);
  return sessions.sort((a, b) => a.start - b.start);
}

/** Quebra uma sessão nos dias (fuso de SP) que ela atravessa. */
function splitByDay(s: Session): [string, number][] {
  const parts: [string, number][] = [];
  let cursor = s.start;
  while (cursor < s.end) {
    const key = dayKey(new Date(cursor));
    let lo = cursor;
    let hi = s.end;
    if (dayKey(new Date(hi - 1)) === key) {
      parts.push([key, (hi - cursor) / MIN]);
      break;
    }
    // busca binária pelo instante da virada do dia
    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2);
      if (dayKey(new Date(mid)) === key) lo = mid;
      else hi = mid;
    }
    parts.push([key, (hi - cursor) / MIN]);
    cursor = hi;
  }
  return parts;
}

function minutesByDay(sessions: Session[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of sessions) {
    for (const [key, minutes] of splitByDay(s)) out.set(key, (out.get(key) ?? 0) + minutes);
  }
  return out;
}

export type LastPass = {
  intent: string;
  asked: number;
  used: number;
  createdAt: string;
  expiresAt: string;
  active: boolean;
};

export type Stats = {
  today: {
    minutes: number;
    perApp: Record<AppId, number>;
    allowedOpens: number; // passes liberados hoje
    blocked: number;
  };
  week: { key: string; label: string; minutes: number; isToday: boolean }[];
  hours: number[]; // tentativas de abrir por hora do dia, últimos 7 dias
  streak: number;
  goal: number;
  lastPass: Partial<Record<AppId, LastPass>>;
  hasData: boolean;
};

export async function getStats(): Promise<Stats> {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const events = await fetchEvents(new Date(nowMs - 31 * DAY).toISOString());
  const sessions = buildSessions(events, nowMs);
  const byDay = minutesByDay(sessions);
  const todayKey = dayKey(now);

  const perApp = Object.fromEntries(APP_IDS.map((id) => [id, 0])) as Record<AppId, number>;
  for (const s of sessions) {
    // parte de hoje de cada sessão
    const part = minutesByDay([s]).get(todayKey) ?? 0;
    perApp[s.app] += part;
  }

  const todayBlocked = events.filter(
    (e) => e.kind === "open" && e.allowed === false && dayKey(new Date(e.at)) === todayKey,
  ).length;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowMs - (6 - i) * DAY);
    const key = dayKey(d);
    return {
      key,
      label: weekdayFmt.format(d).replace(".", ""),
      minutes: byDay.get(key) ?? 0,
      isToday: key === todayKey,
    };
  });

  // Tentativas = cada vez que a mão foi no app. Uma entrada pela porta gera barrado + liberado logo depois;
  // o liberado que vem até 5 min depois de um barrado do mesmo app é a mesma tentativa e não conta de novo.
  const hours = Array.from({ length: 24 }, () => 0);
  const weekAgo = nowMs - 7 * DAY;
  const lastBlocked = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== "open") continue;
    const t = Date.parse(e.at);
    if (e.allowed === false) lastBlocked.set(e.app, t);
    else if (t - (lastBlocked.get(e.app) ?? -Infinity) <= 5 * MIN) continue;
    if (t >= weekAgo) hours[hourOf(new Date(t))] += 1;
  }

  // Sequência: dias completos (ontem pra trás) dentro da meta. Dia sem nenhum evento quebra a sequência,
  // porque pode ser automação desligada e não disciplina. Janela de 30 dias.
  const daysWithEvents = new Set(events.map((e) => dayKey(new Date(e.at))));
  let streak = 0;
  for (let i = 1; i <= 30; i++) {
    const key = dayKey(new Date(nowMs - i * DAY));
    if (!daysWithEvents.has(key)) break;
    if ((byDay.get(key) ?? 0) > DAILY_GOAL_MIN) break;
    streak++;
  }

  const { count: passesToday } = await db()
    .from("passes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfToday(nowMs).toISOString());

  return {
    today: {
      minutes: Object.values(perApp).reduce((a, b) => a + b, 0),
      perApp,
      allowedOpens: passesToday ?? 0,
      blocked: todayBlocked,
    },
    week,
    hours,
    streak,
    goal: DAILY_GOAL_MIN,
    lastPass: await getLastPasses(sessions, nowMs),
    hasData: events.length > 0,
  };
}

/** Versão leve pra tela de entrada: só o necessário pro lembrete, sem os 31 dias. */
export async function getEntryInfo(app: AppId): Promise<{ todayMinutes: number; last: LastPass | null }> {
  const nowMs = Date.now();
  const todayStart = startOfToday(nowMs).getTime();
  const { data } = await db()
    .from("passes")
    .select("*")
    .eq("app", app)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pass = (data as PassRow | null) ?? null;

  // pega a partir de algumas horas antes, pra uma sessão que começou antes do recorte ainda ter o open
  const from = Math.min(todayStart, pass ? Date.parse(pass.created_at) : todayStart) - MAX_SESSION_MIN * MIN;
  const sessions = buildSessions(await fetchEvents(new Date(from).toISOString()), nowMs);
  const todayKey = dayKey(new Date(nowMs));
  const todayMinutes = sessions.reduce((sum, s) => {
    const part = splitByDay(s).find(([k]) => k === todayKey);
    return sum + (part ? part[1] : 0);
  }, 0);

  if (!pass) return { todayMinutes, last: null };
  const start = Date.parse(pass.created_at);
  const until = Date.parse(pass.expires_at);
  const used = sessions
    .filter((s) => s.app === app && s.start >= start && s.start <= until)
    .reduce((sum, s) => sum + s.minutes, 0);
  return {
    todayMinutes,
    last: { intent: pass.intent, asked: pass.minutes, used, createdAt: pass.created_at, expiresAt: pass.expires_at, active: until > nowMs },
  };
}

/** Último passe de cada app e quanto tempo foi usado de fato dentro da janela dele. */
async function getLastPasses(sessions: Session[], nowMs: number): Promise<Partial<Record<AppId, LastPass>>> {
  const out: Partial<Record<AppId, LastPass>> = {};
  await Promise.all(
    APP_IDS.map(async (app) => {
      const { data, error } = await db()
        .from("passes")
        .select("*")
        .eq("app", app)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return;
      const p = data as PassRow;
      const from = Date.parse(p.created_at);
      const until = Date.parse(p.expires_at);
      // sessões que começaram durante o passe contam inteiras: é exatamente o "pediu 10, ficou 34"
      const used = sessions
        .filter((s) => s.app === app && s.start >= from && s.start <= until)
        .reduce((sum, s) => sum + s.minutes, 0);
      out[app] = {
        intent: p.intent,
        asked: p.minutes,
        used,
        createdAt: p.created_at,
        expiresAt: p.expires_at,
        active: until > nowMs,
      };
    }),
  );
  return out;
}
