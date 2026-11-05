import { APP_IDS, LIMITS } from "./config";

/** Dias entre duas chaves YYYY-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Semana do programa (0 = primeira) de um dia, contando do primeiro dia com registro. */
export function weekIndex(firstKey: string, key: string): number {
  return Math.max(0, Math.floor(daysBetween(firstKey, key) / 7));
}

/** Limite por app numa semana: cai weeklyCut por semana, arredonda pra múltiplo de 5, não passa do piso. */
export function perAppLimit(week: number): number {
  const raw = LIMITS.startPerApp * (1 - LIMITS.weeklyCut) ** week;
  return Math.max(LIMITS.floorPerApp, Math.round(raw / 5) * 5);
}

export function totalLimit(week: number): number {
  return perAppLimit(week) * APP_IDS.length;
}

/** Quantos dias faltam pra semana atual acabar (e o limite cair). */
export function daysUntilNextWeek(firstKey: string, key: string): number {
  return 7 - (daysBetween(firstKey, key) % 7);
}
