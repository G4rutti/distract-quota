import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, isValidCookie } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Body = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

/** O PWA manda a inscrição do web push depois que você toca em "Ativar notificações". */
export async function POST(req: NextRequest) {
  if (!(await isValidCookie(req.cookies.get(COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "sem login" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) {
    return NextResponse.json({ error: "inscrição inválida" }, { status: 400 });
  }
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: "inscrição inválida" }, { status: 400 });
  }
  const { error } = await db().from("porteiro_push_subs").upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) {
    console.error("push subscribe", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Desligar as notificações neste aparelho. */
export async function DELETE(req: NextRequest) {
  if (!(await isValidCookie(req.cookies.get(COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "sem login" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (typeof body?.endpoint === "string") await db().from("porteiro_push_subs").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
