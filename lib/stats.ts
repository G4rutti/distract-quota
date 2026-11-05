import "server-only";
import { MAX_SESSION_MIN, TIMEZONE, type AppId } from "./config";
import { totalLimit, weekIndex } from "./limits";
import { db, type EventRow, type PassRow, type Source } from "./db";

export const MIN = 60_000;
export const DAY = 24 * 60 * MIN;
const PAGE = 1000; // limite padrão de linhas por request do Supabase

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", hourCycle: "h23" });
export const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, weekday: "short" });

export const dayKey = (d: Date) => dayFmt.format(d); // YYYY-MM-DD no fuso de SP

/** Primeiro instante do dia de hoje no fuso configurado. */
export function startOfToday(nowMs: number): Date {
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
export const hourOf = (d: Date) => Number(hourFmt.format(d)) % 24;

export type Session = { app: AppId; source: Source; start: number; end: number; minutes: number; live: boolean };

export async function fetchEvents(sinceIso: string): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db()
      .from("porteiro_events")
      .select("id, app, kind, allowed, at, source")
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
 * Abertura liberada + próximo fechamento do mesmo app NA MESMA ORIGEM = uma sessão.
 * iPhone e Chrome têm sessões independentes: TikTok aberto nos dois ao mesmo tempo conta nos dois.
 * Abertura sem fechamento (atalho de fechar falhou) vira sessão estimada com teto MAX_SESSION_MIN,
 * terminando no próximo evento daquele app, no teto ou agora, o que vier primeiro.
 */
export function buildSessions(events: EventRow[], now: number): Session[] {
  const sessions: Session[] = [];
  const pending = new Map<string, number>(); // chave "app:origem"
  const cap = MAX_SESSION_MIN * MIN;
  const keyOf = (e: EventRow) => `${e.app}:${e.source ?? "iphone"}`;
  const split = (k: string) => {
    const [app, source] = k.split(":");
    return { app: app as AppId, source: source as Source };
  };

  const closeEstimated = (k: string, start: number, until: number) => {
    const end = Math.min(until, start + cap);
    if (end > start) sessions.push({ ...split(k), start, end, minutes: (end - start) / MIN, live: end === now });
  };

  for (const e of events) {
    const t = Date.parse(e.at);
    const k = keyOf(e);
    if (e.kind === "open") {
      // qualquer abertura (liberada ou barrada) encerra uma pendente que perdeu o close;
      // senão o close de uma barrada casaria com uma abertura velha e inflaria o tempo
      const prev = pending.get(k);
      if (prev !== undefined) closeEstimated(k, prev, t);
      pending.delete(k);
      if (e.allowed) pending.set(k, t);
      continue;
    }
    const start = pending.get(k);
    if (start === undefined) continue; // close de uma abertura barrada
    pending.delete(k);
    // sessão com close é real, sem teto: pediu 10 e ficou 4h tem que aparecer
    sessions.push({ ...split(k), start, end: t, minutes: (t - start) / MIN, live: false });
  }

  for (const [k, start] of pending) closeEstimated(k, start, now);
  return sessions.sort((a, b) => a.start - b.start);
}

/** Quebra uma sessão nos dias (fuso de SP) que ela atravessa. */
export function splitByDay(s: Session): [string, number][] {
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

export function minutesByDay(sessions: Session[]): Map<string, number> {
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

/** Versão leve pra tela de entrada: só o necessário pro lembrete, sem os 31 dias. */
export async function getEntryInfo(
  app: AppId,
): Promise<{ todayMinutes: number; limit: number; last: LastPass | null }> {
  const nowMs = Date.now();
  const todayStart = startOfToday(nowMs).getTime();
  const { data } = await db()
    .from("porteiro_passes")
    .select("*")
    .eq("app", app)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pass = (data as PassRow | null) ?? null;

  const { data: first } = await db().from("porteiro_events").select("at").order("at", { ascending: true }).limit(1).maybeSingle();
  const todayKey = dayKey(new Date(nowMs));
  const firstKey = first ? dayKey(new Date((first as { at: string }).at)) : todayKey;
  const limit = totalLimit(weekIndex(firstKey, todayKey));

  // pega a partir de algumas horas antes, pra uma sessão que começou antes do recorte ainda ter o open
  const from = Math.min(todayStart, pass ? Date.parse(pass.created_at) : todayStart) - MAX_SESSION_MIN * MIN;
  const sessions = buildSessions(await fetchEvents(new Date(from).toISOString()), nowMs);
  const todayMinutes = sessions.reduce((sum, s) => {
    const part = splitByDay(s).find(([k]) => k === todayKey);
    return sum + (part ? part[1] : 0);
  }, 0);

  if (!pass) return { todayMinutes, limit, last: null };
  const start = Date.parse(pass.created_at);
  const until = Date.parse(pass.expires_at);
  const used = sessions
    .filter((s) => s.app === app && s.start >= start && s.start <= until)
    .reduce((sum, s) => sum + s.minutes, 0);
  return {
    todayMinutes,
    limit,
    last: { intent: pass.intent, asked: pass.minutes, used, createdAt: pass.created_at, expiresAt: pass.expires_at, active: until > nowMs },
  };
}
