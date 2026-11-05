import { NextResponse, type NextRequest } from "next/server";
import { isValidKey, KEY_HEADER } from "@/lib/auth";
import { isAppId } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Só consulta, não registra nada: a extensão do Chrome pergunta de tempos em tempos
 * se o passe ainda vale, pra fechar a porta quando acabar.
 * Resposta: { active: boolean, expiresAt: string | null }
 */
export async function GET(req: NextRequest) {
  if (!isValidKey(req.headers.get(KEY_HEADER) ?? req.nextUrl.searchParams.get("k"))) {
    return NextResponse.json({ error: "chave invalida" }, { status: 401 });
  }
  const app = req.nextUrl.searchParams.get("app");
  if (!isAppId(app)) return NextResponse.json({ error: "app desconhecido" }, { status: 400 });

  const { data, error } = await db()
    .from("porteiro_passes")
    .select("expires_at")
    .eq("app", app)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("pass-status", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
  const expiresAt = (data as { expires_at: string } | null)?.expires_at ?? null;
  return NextResponse.json({ active: expiresAt !== null, expiresAt }, { headers: { "cache-control": "no-store" } });
}
