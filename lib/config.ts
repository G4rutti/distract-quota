// Tudo que você vai querer ajustar fica aqui.

export type AppId = "tiktok" | "instagram" | "twitter";

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
  twitter: {
    id: "twitter",
    name: "X",
    openUrl: "https://x.com/",
    schemeUrl: "twitter://",
  },
};

export const APP_IDS = Object.keys(APPS) as AppId[];

export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && Object.hasOwn(APPS, value);
}

/**
 * Limite progressivo por app: começa alto e cai a cada semana, contando do primeiro dia com registro.
 * Semana 1: 60 min, semana 2: 50, semana 3: 45... até o piso. O limite total do dia é a soma dos apps.
 */
export const LIMITS = {
  startPerApp: 60,
  floorPerApp: 15,
  weeklyCut: 0.15,
};

/** Hábitos lidos do app de saúde (tabelas saude, treinos, treinos_relogio) e do GitHub. Nada é marcado à mão. */
export const HABITS = {
  sleepGoalMin: 420, // 7h
  stepsGoal: 8000,
  githubUser: "G4rutti",
};

/** Humor e disposição: um toque, de 1 a 5. */
export const MOOD_LABELS = ["Péssimo", "Ruim", "Ok", "Bom", "Ótimo"] as const;
export const ENERGY_LABELS = ["Zerado", "Baixa", "Normal", "Boa", "No talo"] as const;

/** Opções de tempo na tela de liberar. */
export const MINUTE_OPTIONS = [5, 10, 15, 30] as const;

/** Segundos de espera antes de poder liberar. */
export const BREATH_SECONDS = 10;

/** Abertura sem 'close' (atalho de fechar falhou) conta no máximo isso. Sessão com close não tem teto. */
export const MAX_SESSION_MIN = 180;

export const TIMEZONE = "America/Sao_Paulo";
