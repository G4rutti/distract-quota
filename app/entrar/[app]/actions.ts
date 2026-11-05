"use server";

import { cookies } from "next/headers";
import { COOKIE_NAME, isValidCookie } from "@/lib/auth";
import { isAppId, MINUTE_OPTIONS } from "@/lib/config";
import { db } from "@/lib/db";

export type PassResult = { ok: true; expiresAt: string } | { ok: false; error: string };

export async function createPass(app: string, minutes: number, intent: string): Promise<PassResult> {
  // o proxy já protege a página, mas server action é um endpoint POST: checa de novo
  if (!(await isValidCookie((await cookies()).get(COOKIE_NAME)?.value))) {
    return { ok: false, error: "Sessão expirada. Entra de novo pelo /login." };
  }
  if (!isAppId(app)) return { ok: false, error: "App desconhecido." };
  if (!(MINUTE_OPTIONS as readonly number[]).includes(minutes)) return { ok: false, error: "Tempo inválido." };

  const cleanIntent = intent.trim().slice(0, 140);
  if (!cleanIntent) return { ok: false, error: "Diz pra quê você vai entrar." };

  const now = Date.now();
  const expiresAt = new Date(now + minutes * 60_000).toISOString();
  const { error } = await db().from("porteiro_passes").insert({
    app,
    minutes,
    intent: cleanIntent,
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt,
  });

  if (error) {
    console.error("createPass", error);
    return { ok: false, error: "Não consegui salvar o passe. Tenta de novo." };
  }
  return { ok: true, expiresAt };
}
