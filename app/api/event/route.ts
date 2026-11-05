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
  // A extensão manda há quantos ms parou de usar (?ago=), e a hora é calculada com o relógio do servidor:
  // relógio do PC adiantado ou atrasado não importa. Limitado a 12 h atrás e nunca antes do último "abriu"
  // da extensão nesse app, pra o par abriu/fechou não inverter.
  let at: string | undefined;
  const ago = Number(req.nextUrl.searchParams.get("ago"));
  if (source === "chrome" && Number.isFinite(ago) && ago > 0) {
    let t = Date.now() - Math.min(ago, 12 * 60 * 60_000);
    const { data: lastOpen } = await db()
      .from("porteiro_events")
      .select("at")
      .eq("app", app)
      .eq("source", "chrome")
      .eq("kind", "open")
      .order("at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const openAt = lastOpen ? Date.parse((lastOpen as { at: string }).at) : NaN;
    if (Number.isFinite(openAt) && t <= openAt) t = openAt + 1;
    at = new Date(t).toISOString();
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
