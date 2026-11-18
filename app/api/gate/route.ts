import { NextResponse, type NextRequest } from "next/server";
import { isValidKey, KEY_HEADER } from "@/lib/auth";
import { isAppId } from "@/lib/config";
import { db, parseSource } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Chamado pela automação "Ao abrir o app" do Atalhos.
 * Responde texto puro pra ficar fácil comparar no "Se" do Atalhos:
 *   "liberado 437" -> tem passe válido, deixa abrir; o número é quantos segundos faltam
 *                     (o atalho usa pra iniciar um timer do Relógio, que aparece na ilha dinâmica)
 *   "barrado"  -> sem passe, o atalho abre o webapp por cima
 * Sempre registra a tentativa.
 */
export async function GET(req: NextRequest) {
  // segredo pelo header (x-porteiro-key) ou pela URL (?k=), que é mais fácil de configurar no Atalhos
  if (!isValidKey(req.headers.get(KEY_HEADER) ?? req.nextUrl.searchParams.get("k"))) {
    return new NextResponse("chave invalida", { status: 401 });
  }

  const app = req.nextUrl.searchParams.get("app");
  if (!isAppId(app)) return new NextResponse("app desconhecido", { status: 400 });

  // carimba a hora na chegada: se gravasse depois da consulta, um abre-e-fecha rápido inverteria open/close
  const now = new Date().toISOString();
  const { data: pass, error } = await db()
    .from("porteiro_passes")
    .select("expires_at")
    .eq("app", app)
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Falha no banco não pode virar porta aberta: barra e deixa o webapp mostrar o erro.
    console.error("gate: erro lendo passes", error);
    return text("barrado");
  }

  const allowed = Boolean(pass);
  const { error: insertError } = await db().from("porteiro_events").insert({ app, kind: "open", allowed, at: now, source: parseSource(req.nextUrl.searchParams.get("src")) });
  if (insertError) console.error("gate: erro gravando evento", insertError);

  if (!allowed) return text("barrado");
  const left = Math.max(1, Math.round((Date.parse((pass as { expires_at: string }).expires_at) - Date.parse(now)) / 1000));
  return text(`liberado ${left}`);
}

function text(body: string) {
  return new NextResponse(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
