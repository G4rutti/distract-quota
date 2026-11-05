// Tudo que você vai querer ajustar fica aqui.

export type AppId = "tiktok" | "instagram";

export type AppConfig = {
  id: AppId;
  name: string;
  /** Universal link: tocado num <a>, abre o app direto, sem o "Abrir no app?" do Safari. */
  openUrl: string;
  /** Plano B caso o universal link caia no site em vez do app. */
  schemeUrl: string;
};

export const APPS: Record<AppId, AppConfig> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    openUrl: "https://www.tiktok.com/",
    schemeUrl: "snssdk1233://",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    openUrl: "https://www.instagram.com/",
    schemeUrl: "instagram://",
  },
};

export const APP_IDS = Object.keys(APPS) as AppId[];

export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && Object.hasOwn(APPS, value);
}

/** Meta diária somando todos os apps. Dia dentro da meta conta pra sequência. */
export const DAILY_GOAL_MIN = 45;

/** Opções de tempo na tela de liberar. */
export const MINUTE_OPTIONS = [5, 10, 15, 30] as const;

/** Segundos de espera antes de poder liberar. */
export const BREATH_SECONDS = 10;

/** Abertura sem 'close' (atalho de fechar falhou) conta no máximo isso. Sessão com close não tem teto. */
export const MAX_SESSION_MIN = 180;

export const TIMEZONE = "America/Sao_Paulo";
