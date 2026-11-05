import { NextResponse, type NextRequest } from "next/server";
import { isValidKey, KEY_HEADER } from "@/lib/auth";
import { isAppId } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Chamado pela automação "Ao fechar o app" do Atalhos: /api/event?app=tiktok
 * Aceita GET (padrão do "Obter conteúdo de URL") e POST.
 */
async function handle(req: NextRequest) {
  if (!isValidKey(req.headers.get(KEY_HEADER))) {
    return new NextResponse("chave invalida", { status: 401 });
  }

  const app = req.nextUrl.searchParams.get("app");
  if (!isAppId(app)) return new NextResponse("app desconhecido", { status: 400 });

  const { error } = await db().from("events").insert({ app, kind: "close" });
  if (error) {
    console.error("event: erro gravando close", error);
    return new NextResponse("erro", { status: 500 });
  }
  return new NextResponse("ok", { headers: { "cache-control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
