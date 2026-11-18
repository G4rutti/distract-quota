import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, isValidCookie } from "@/lib/auth";
import { pushAll } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Botão "Mandar um teste" da tela de ajustes. */
export async function POST(req: NextRequest) {
  if (!(await isValidCookie(req.cookies.get(COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "sem login" }, { status: 401 });
  }
  try {
    const sent = await pushAll({
      title: "Porteiro",
      body: "Teste: quando um passe acabar, o aviso chega assim. Toca pra ver as opções.",
      url: "/fim/tiktok?teste=1",
      tag: "teste",
    });
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("push test", err);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
