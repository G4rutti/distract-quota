import "server-only";
import { APP_IDS, TIMEZONE, type AppId } from "./config";
import { db, type PassRow } from "./db";
import { daysBetween, daysUntilNextWeek, perAppLimit, totalLimit, weekIndex } from "./limits";
import { buildSessions, DAY, dayKey, fetchEvents, hourOf, MIN, minutesByDay, splitByDay, weekdayFmt } from "./stats";

// Um modelo só, calculado a cada request, que alimenta as 5 telas. Pra um usuário e semanas de dado, é rápido.

const WINDOW_DAYS = 42;
const GIVE_UP_WINDOW = 15 * MIN; // barrada sem entrada liberada em 15 min = desistiu

const shortDate = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, day: "numeric", month: "short" });

/** Meio-dia em SP da chave, pra formatar sem cair no dia vizinho. */
const noonOf = (key: string) => new Date(`${key}T15:00:00Z`);
export const addDays = (key: string, n: number) => dayKey(new Date(noonOf(key).getTime() + n * DAY));
export const dateLabel = (key: string) => shortDate.format(noonOf(key)).replace(/\./g, "");
export const weekdayLabel = (key: string) => weekdayFmt.format(noonOf(key)).replace(".", "");

export type DayStat = {
  key: string;
  isToday: boolean;
  tracked: boolean; // dia depois do começo do Porteiro
  minutes: number;
  perApp: Record<AppId, number>;
  limit: number;
  perAppLimit: number;
  attempts: number;
  blocked: number;
  giveUps: number;
  passes: number;
};

export type PassView = {
  id: number;
  app: AppId;
  intent: string;
  asked: number;
  used: number;
  createdAt: string;
  expiresAt: string;
  active: boolean;
};

export type Insight = { title: string; value: string; detail: string };

export type Model = {
  todayKey: string;
  firstKey: string;
  hasData: boolean;
  days: DayStat[]; // WINDOW_DAYS dias, mais antigo primeiro, termina em hoje
  today: DayStat;
  yesterday: DayStat;
  week: DayStat[]; // últimos 7, termina em hoje
  limits: { week: number; perApp: number; total: number; nextPerApp: number; nextTotal: number; daysLeft: number };
  streak: number;
  hours: number[];
  passes: PassView[]; // mais recente primeiro
  activePass: Partial<Record<AppId, PassView>>;
  report: WeekReport;
};

export type WeekReport = {
  enoughData: boolean;
  thisWeek: { total: number; avg: number; days: number; perApp: Record<AppId, number> };
  prevWeek: { total: number; avg: number; days: number } | null;
  deltaPct: number | null;
  prevWasZero: boolean;
  baseline: number | null; // média diária da primeira semana
  recoveredTotal: number | null;
  recoveredWeek: number | null;
  insights: Insight[];
};

const zeroApps = () => Object.fromEntries(APP_IDS.map((id) => [id, 0])) as Record<AppId, number>;

export async function getModel(): Promise<Model> {
  const nowMs = Date.now();
  const todayKey = dayKey(new Date(nowMs));
  const windowStart = addDays(todayKey, -(WINDOW_DAYS - 1));

  // o primeiro evento define a semana do programa (limite) e a média inicial; erro aqui não pode virar "semana 1"
  const first = await db().from("porteiro_events").select("at").order("at", { ascending: true }).limit(1).maybeSingle();
  if (first.error) throw first.error;
  const firstKey = first.data ? dayKey(new Date((first.data as { at: string }).at)) : todayKey;

  // eventos desde o começo do programa (ou da janela, o que vier antes), pra média inicial, tempo recuperado e
  // sequência valerem pra todo o histórico; começa na véspera pra uma sessão que cruzou a meia-noite ter o open
  const historyStart = firstKey < windowStart ? firstKey : windowStart;
  const fetchFrom = noonOf(addDays(historyStart, -1)).getTime() - 12 * 60 * MIN;
  const passesFrom = noonOf(addDays(windowStart, -1)).getTime() - 12 * 60 * MIN;

  const [events, passRows] = await Promise.all([
    fetchEvents(new Date(fetchFrom).toISOString()),
    db()
      .from("porteiro_passes")
      .select("*")
      .gte("created_at", new Date(passesFrom).toISOString())
      .order("created_at", { ascending: false }),
  ]);
  if (passRows.error) throw passRows.error;

  const sessions = buildSessions(events, nowMs);
  const allMinutes = minutesByDay(sessions); // histórico inteiro, por dia

  // ---- dias ----
  const dayMap = new Map<string, DayStat>();
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const key = addDays(windowStart, i);
    const w = weekIndex(firstKey, key);
    dayMap.set(key, {
      key,
      isToday: key === todayKey,
      tracked: key >= firstKey,
      minutes: 0,
      perApp: zeroApps(),
      limit: totalLimit(w),
      perAppLimit: perAppLimit(w),
      attempts: 0,
      blocked: 0,
      giveUps: 0,
      passes: 0,
    });
  }

  for (const s of sessions) {
    for (const [key, minutes] of splitByDay(s)) {
      const d = dayMap.get(key);
      if (!d) continue;
      d.minutes += minutes;
      d.perApp[s.app] = (d.perApp[s.app] ?? 0) + minutes;
    }
  }

  // tentativas, barradas e desistências
  const hours = Array.from({ length: 24 }, () => 0);
  const weekAgo = nowMs - 7 * DAY;
  const lastBlocked = new Map<string, number>();
  const opens = events.filter((e) => e.kind === "open");
  opens.forEach((e, i) => {
    const t = Date.parse(e.at);
    const d = dayMap.get(dayKey(new Date(t)));
    if (e.allowed === false) {
      lastBlocked.set(e.app, t);
      if (d) {
        d.blocked += 1;
        d.attempts += 1;
        const cameBack = opens.some(
          (o, j) => j > i && o.app === e.app && o.allowed && Date.parse(o.at) - t <= GIVE_UP_WINDOW,
        );
        if (!cameBack && nowMs - t > GIVE_UP_WINDOW) d.giveUps += 1;
      }
    } else {
      // liberada logo depois de uma barrada é a mesma tentativa
      if (t - (lastBlocked.get(e.app) ?? -Infinity) <= 5 * MIN) return;
      if (d) d.attempts += 1;
    }
    if (t >= weekAgo) hours[hourOf(new Date(t))] += 1;
  });

  // ---- passes ----
  const passes: PassView[] = ((passRows.data ?? []) as PassRow[]).map((p) => {
    const from = Date.parse(p.created_at);
    const until = Date.parse(p.expires_at);
    const used = sessions
      .filter((s) => s.app === p.app && s.start >= from && s.start <= until)
      .reduce((sum, s) => sum + s.minutes, 0);
    const d = dayMap.get(dayKey(new Date(from)));
    if (d) d.passes += 1;
    return {
      id: p.id,
      app: p.app as AppId,
      intent: p.intent,
      asked: p.minutes,
      used,
      createdAt: p.created_at,
      expiresAt: p.expires_at,
      active: until > nowMs,
    };
  });
  const activePass: Partial<Record<AppId, PassView>> = {};
  for (const p of passes) if (p.active && !activePass[p.app]) activePass[p.app] = p;

  const days = [...dayMap.values()];
  const today = dayMap.get(todayKey)!;
  const yesterday = dayMap.get(addDays(todayKey, -1))!;
  const week = days.slice(-7);

  // sequência: dias completos dentro do limite, de ontem pra trás, no histórico inteiro do programa
  let streak = 0;
  for (let key = addDays(todayKey, -1); key >= firstKey; key = addDays(key, -1)) {
    if ((allMinutes.get(key) ?? 0) > totalLimit(weekIndex(firstKey, key))) break;
    streak++;
  }

  const w = weekIndex(firstKey, todayKey);
  const limits = {
    week: w,
    perApp: perAppLimit(w),
    total: totalLimit(w),
    nextPerApp: perAppLimit(w + 1),
    nextTotal: totalLimit(w + 1),
    daysLeft: daysUntilNextWeek(firstKey, todayKey),
  };

  return {
    todayKey,
    firstKey,
    hasData: events.length > 0,
    days,
    today,
    yesterday,
    week,
    limits,
    streak,
    hours,
    passes,
    activePass,
    report: buildReport(days, allMinutes, passes, hours, firstKey, todayKey),
  };
}

// ---------------- insights ----------------

function buildReport(
  days: DayStat[],
  allMinutes: Map<string, number>,
  passes: PassView[],
  hours: number[],
  firstKey: string,
  todayKey: string,
): WeekReport {
  const complete = days.filter((d) => d.tracked && !d.isToday);
  const last7 = complete.slice(-7);
  const prev7 = complete.slice(-14, -7);
  const sum = (arr: DayStat[]) => arr.reduce((a, d) => a + d.minutes, 0);

  const perApp = zeroApps();
  for (const d of last7) for (const id of APP_IDS) perApp[id] += d.perApp[id];

  const thisWeek = { total: sum(last7), avg: last7.length ? sum(last7) / last7.length : 0, days: last7.length, perApp };
  const prevWeek = prev7.length >= 3 ? { total: sum(prev7), avg: sum(prev7) / prev7.length, days: prev7.length } : null;
  const deltaPct = prevWeek && prevWeek.avg > 0 ? ((thisWeek.avg - prevWeek.avg) / prevWeek.avg) * 100 : null;
  // semana anterior com zero: não dá pra falar em %, mas também não é falta de dado
  const prevWasZero = prevWeek !== null && prevWeek.avg === 0;

  // Tempo recuperado: quanto ficou abaixo da média inicial, somado no histórico inteiro.
  // Média inicial = dias 2 a 8 do programa (o primeiro dia quase sempre é parcial e puxaria pra baixo).
  const yesterdayKey = addDays(todayKey, -1);
  const baselineKeys = Array.from({ length: 7 }, (_, i) => addDays(firstKey, i + 1)).filter((k) => k <= yesterdayKey);
  const baseline =
    baselineKeys.length >= 3 ? baselineKeys.reduce((a, k) => a + (allMinutes.get(k) ?? 0), 0) / baselineKeys.length : null;
  const recoveredFrom = addDays(firstKey, 8);
  let recoveredTotal: number | null = null;
  if (baseline !== null) {
    recoveredTotal = 0;
    for (let k = recoveredFrom; k <= yesterdayKey; k = addDays(k, 1)) {
      recoveredTotal += Math.max(0, baseline - (allMinutes.get(k) ?? 0));
    }
  }
  const recoveredWeek =
    baseline === null
      ? null
      : last7.filter((d) => d.key >= recoveredFrom).reduce((a, d) => a + Math.max(0, baseline - d.minutes), 0);

  const insights: Insight[] = [];
  const m = (n: number) => `${Math.round(n)} min`;
  const name = (id: AppId) => ({ tiktok: "TikTok", instagram: "Instagram", twitter: "X" })[id];

  if (last7.length >= 2) {
    const sorted = [...last7].sort((a, b) => a.minutes - b.minutes);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    insights.push({
      title: "Melhor dia",
      value: `${weekdayLabel(best.key)}, ${dateLabel(best.key)}`,
      detail: `${m(best.minutes)} de redes. O pior foi ${weekdayLabel(worst.key)}, com ${m(worst.minutes)}.`,
    });

    const top = APP_IDS.reduce((a, b) => (perApp[a] >= perApp[b] ? a : b));
    if (thisWeek.total > 0) {
      insights.push({
        title: "Quem mais come teu tempo",
        value: name(top),
        detail: `${Math.round((perApp[top] / thisWeek.total) * 100)}% do tempo da semana (${m(perApp[top])}).`,
      });
    }
  }

  const peakCount = Math.max(...hours);
  if (peakCount >= 3) {
    const peak = hours.indexOf(peakCount);
    insights.push({
      title: "Horário de risco",
      value: `${String(peak).padStart(2, "0")}h às ${String((peak + 1) % 24).padStart(2, "0")}h`,
      detail: `${peakCount} tentativas de abrir nessa hora nos últimos 7 dias.`,
    });
  }

  const recentDays = days.slice(-7);
  const blocked = recentDays.reduce((a, d) => a + d.blocked, 0);
  const giveUps = recentDays.reduce((a, d) => a + d.giveUps, 0);
  if (blocked > 0) {
    insights.push({
      title: "A porta funcionando",
      value: `${giveUps} de ${blocked}`,
      detail: `vezes que você foi barrado e desistiu de entrar, nos últimos 7 dias.`,
    });
  }

  const recent = passes.filter((p) => !p.active && Date.parse(p.createdAt) >= Date.parse(`${addDays(todayKey, -7)}T03:00:00Z`));
  if (recent.length >= 2) {
    const kept = recent.filter((p) => p.used <= p.asked + 1).length;
    insights.push({
      title: "Palavra cumprida",
      value: `${kept} de ${recent.length}`,
      detail: "passes em que você saiu dentro do tempo que pediu.",
    });
  }

  return {
    enoughData: complete.length >= 1,
    thisWeek,
    prevWeek,
    deltaPct,
    prevWasZero,
    baseline,
    recoveredTotal,
    recoveredWeek,
    insights,
  };
}
