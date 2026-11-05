"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME, isValidCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays } from "@/lib/model";
import { dayKey } from "@/lib/stats";

export type DiaryField = "humor" | "energia";

/** Grava um toque de humor ou disposição. Só hoje e ontem são editáveis. */
export async function saveDiary(dia: string, field: DiaryField, value: number): Promise<{ ok: boolean; error?: string }> {
  if (!(await isValidCookie((await cookies()).get(COOKIE_NAME)?.value))) {
    return { ok: false, error: "Sessão expirada. Entra de novo pelo /login." };
  }
  const today = dayKey(new Date());
  if (dia !== today && dia !== addDays(today, -1)) return { ok: false, error: "Só dá pra marcar hoje e ontem." };
  if (field !== "humor" && field !== "energia") return { ok: false, error: "Campo inválido." };
  if (!Number.isInteger(value) || value < 1 || value > 5) return { ok: false, error: "Valor inválido." };

  const { error } = await db()
    .from("porteiro_diary")
    .upsert({ dia, [field]: value, updated_at: new Date().toISOString() }, { onConflict: "dia" });
  if (error) {
    console.error("saveDiary", error);
    return { ok: false, error: "Não consegui salvar. Tenta de novo." };
  }
  revalidatePath("/diario");
  revalidatePath("/insights");
  return { ok: true };
}
