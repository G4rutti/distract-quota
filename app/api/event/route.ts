import { NextResponse, type NextRequest } from "next/server";
import { isValidKey, KEY_HEADER } from "@/lib/auth";
import { isAppId } from "@/lib/config";
import { db, parseSource } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Chamado pela automação "Ao fechar o app" do Atalhos: /api/event?app=tiktok
 * Aceita GET (padrão do "Obter conteúdo de URL") e POST.
 */
async function handle(req: NextRequest) {
  // segredo pelo header (x-porteiro-key) ou pela URL (?k=), que é mais fácil de configurar no Atalhos
  if (!isValidKey(req.headers.get(KEY_HEADER) ?? req.nextUrl.searchParams.get("k"))) {
    return new NextResponse("chave invalida", { status: 401 });
  }

  const app = req.nextUrl.searchParams.get("app");
  if (!isAppId(app)) return new NextResponse("app desconhecido", { status: 400 });

  const source = parseSource(req.nextUrl.searchParams.get("src"));
  // A extensão pode mandar a hora real do fechamento (?at=), quando o Chrome foi fechado com o app aberto
  // e ela só consegue avisar na próxima vez que abrir. Só vale pra extensão, nas últimas 12h e nunca no futuro.
  let at: string | undefined;
  const rawAt = req.nextUrl.searchParams.get("at");
  if (source === "chrome" && rawAt) {
    const t = Date.parse(rawAt);
    const now = Date.now();
    if (Number.isFinite(t) && t <= now && now - t <= 12 * 60 * 60_000) at = new Date(t).toISOString();
  }

  const { error } = await db().from("porteiro_events").insert({ app, kind: "close", source, ...(at ? { at } : {}) });
  if (error) {
    console.error("event: erro gravando close", error);
    return new NextResponse("erro", { status: 500 });
  }
  return new NextResponse("ok", { headers: { "cache-control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
