"use server";

import { cookies } from "next/headers";
import { COOKIE_NAME, isValidCookie } from "@/lib/auth";
import { EXTRA_MINUTE_OPTIONS, isAppId } from "@/lib/config";
import { db, type EventRow, type PassRow } from "@/lib/db";

type Result = { ok: true; expiresAt?: string } | { ok: false; error: string };

async function authed() {
  return isValidCookie((await cookies()).get(COOKIE_NAME)?.value);
}

async function lastPass(app: string): Promise<PassRow | null> {
  const { data } = await db()
    .from("porteiro_passes")
    .select("*")
    .eq("app", app)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PassRow | null) ?? null;
}

/**
 * "Vou sair": se o atalho "ao fechar" não registrou, registra aqui.
 * Hora do fechamento: agora, mas no máximo 2 min depois do fim do passe
 * (tocar na notificação uma hora depois não pode virar uma hora de uso).
 */
export async function leave(app: string): Promise<Result> {
  if (!(await authed())) return { ok: false, error: "Sessão expirada. Entra de novo pelo /login." };
  if (!isAppId(app)) return { ok: false, error: "App desconhecido." };

  const { data } = await db()
    .from("porteiro_events")
    .select("kind, allowed, at")
    .eq("app", app)
    .eq("source", "iphone")
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = data as Pick<EventRow, "kind" | "allowed" | "at"> | null;
  if (!last || last.kind !== "open" || !last.allowed) return { ok: true }; // já tava fechado

  const pass = await lastPass(app);
  const now = Date.now();
  const cap = pass ? Date.parse(pass.expires_at) + 2 * 60_000 : now;
  const at = Math.max(Date.parse(last.at) + 1000, Math.min(now, cap));
  const { error } = await db()
    .from("porteiro_events")
    .insert({ app, kind: "close", allowed: null, at: new Date(at).toISOString(), source: "iphone" });
  if (error) {
    console.error("leave", error);
    return { ok: false, error: "Não consegui registrar. Tenta de novo." };
  }
  return { ok: true };
}

/** "+5 / +10 min": passe novo com o mesmo motivo, marcado como extensão. */
export async function extend(app: string, minutes: number): Promise<Result> {
  if (!(await authed())) return { ok: false, error: "Sessão expirada. Entra de novo pelo /login." };
  if (!isAppId(app)) return { ok: false, error: "App desconhecido." };
  if (!(EXTRA_MINUTE_OPTIONS as readonly number[]).includes(minutes)) return { ok: false, error: "Tempo inválido." };

  const prev = await lastPass(app);
  const now = Date.now();
  // ainda vale um passe (pediu mais no PC, tocou duas vezes): não empilha
  if (prev && Date.parse(prev.expires_at) > now) return { ok: true, expiresAt: prev.expires_at };

  const base = (prev?.intent ?? "").replace(/^\+\d+ min: /, "");
  const intent = `+${minutes} min: ${base || "mais um pouco"}`.slice(0, 140);
  const expiresAt = new Date(now + minutes * 60_000).toISOString();
  const { error } = await db().from("porteiro_passes").insert({
    app,
    minutes,
    intent,
    created_at: new Date(now).toISOString(),
    expires_at: expiresAt,
  });
  if (error) {
    console.error("extend", error);
    return { ok: false, error: "Não consegui salvar o passe. Tenta de novo." };
  }
  return { ok: true, expiresAt };
}
