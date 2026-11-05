import { TIMEZONE } from "./config";

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short" });

export const fmtTime = (d: Date | string | number) => timeFmt.format(new Date(d));
export const fmtDate = (d: Date) => dateFmt.format(d).replace(/\./g, "");
export const mins = (n: number) => Math.round(n);
