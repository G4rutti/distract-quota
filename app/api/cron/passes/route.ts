import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/auth";
import { APPS, isAppId } from "@/lib/config";
import { db, type EventRow, type PassRow } from "@/lib/db";
import { pushAll } from "@/lib/push";

export const dynamic = "force-dynamic";

const LOOKBACK_MS = 15 * 60_000; // passe que venceu há mais que isso não avisa mais (cron parado, deploy)

/**
 * O pg_cron do Supabase chama aqui a cada minuto.
 * Pra cada passe que acabou e ainda não avisou: se o app continua aberto no iPhone
 * (última coisa registrada lá é um "abriu" liberado), manda a notificação.
 * No computador quem cuida é a extensão (expulsar), então não avisa.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!secret || !got || !safeEqual(got, secret)) return NextResponse.json({ error: "nao" }, { status: 401 });

  const now = Date.now();
  const { data, error } = await db()
    .from("porteiro_passes")
    .select("*")
    .is("notified_at", null)
    .lte("expires_at", new Date(now).toISOString())
    .gte("expires_at", new Date(now - LOOKBACK_MS).toISOString())
    .order("expires_at", { ascending: true });
  if (error) {
    console.error("cron passes", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }

  const results: string[] = [];
  for (const pass of (data ?? []) as PassRow[]) {
    // marca antes de mandar: duas chamadas do cron ao mesmo tempo não avisam duas vezes
    const { data: claimed } = await db()
      .from("porteiro_passes")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", pass.id)
      .is("notified_at", null)
      .select("id");
    if (!claimed?.length || !isAppId(pass.app)) continue;

    const reason = await shouldNotify(pass);
    if (reason !== "aberto") {
      results.push(`${pass.id}: ${reason}`);
      continue;
    }
    const name = APPS[pass.app].name;
    const sent = await pushAll({
      title: `Acabou o passe do ${name}`,
      body: `${pass.minutes} min pra "${pass.intent}". Vai sair ou quer mais um pouco?`,
      url: `/fim/${pass.app}`,
      tag: `fim-${pass.app}`,
    }).catch((err) => {
      console.error("cron push", err);
      return 0;
    });
    results.push(`${pass.id}: avisou ${sent}`);
  }
  return NextResponse.json({ ok: true, results });
}

async function shouldNotify(pass: PassRow): Promise<"aberto" | "fechado" | "renovado" | "nao-abriu"> {
  // já pediu mais tempo (aqui ou no PC): não tem o que avisar
  const { data: newer } = await db()
    .from("porteiro_passes")
    .select("id")
    .eq("app", pass.app)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (newer?.length) return "renovado";

  // última coisa do iPhone nesse app desde que o passe nasceu
  const since = new Date(Date.parse(pass.created_at) - 60_000).toISOString();
  const { data: last } = await db()
    .from("porteiro_events")
    .select("kind, allowed, source")
    .eq("app", pass.app)
    .eq("source", "iphone")
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ev = last as Pick<EventRow, "kind" | "allowed"> | null;
  if (!ev) return "nao-abriu";
  return ev.kind === "open" && ev.allowed ? "aberto" : "fechado";
}
