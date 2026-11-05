import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente com a chave secreta. Só roda no servidor; o navegador nunca fala com o Supabase. */
export function db(): SupabaseClient {
  if (client) return client;
  if (process.env.PORTEIRO_MOCK === "1" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    client = require("./mock-db").mockClient as unknown as SupabaseClient;
    return client;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Faltam SUPABASE_URL e/ou SUPABASE_SECRET_KEY no ambiente.");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type EventRow = {
  id: number;
  app: string;
  kind: "open" | "close";
  allowed: boolean | null;
  at: string;
  source?: Source;
};

export type Source = "iphone" | "chrome";

/** Origem vinda da URL dos Atalhos/extensão (?src=chrome); qualquer outra coisa é iPhone. */
export const parseSource = (v: string | null): Source => (v === "chrome" ? "chrome" : "iphone");

export type PassRow = {
  id: number;
  app: string;
  intent: string;
  minutes: number;
  created_at: string;
  expires_at: string;
};
