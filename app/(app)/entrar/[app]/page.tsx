import Link from "next/link";
import { notFound } from "next/navigation";
import { APPS, isAppId, safeReturnUrl } from "@/lib/config";
import { db, type PassRow } from "@/lib/db";
import { fmtTime } from "@/lib/format";
import { getEntryInfo } from "@/lib/stats";
import { EntryFlow } from "./entry-flow";
import { OpenAppLinks } from "./open-app-links";

export const dynamic = "force-dynamic";

export default async function EntrarPage({
  params,
  searchParams,
}: {
  params: Promise<{ app: string }>;
  searchParams: Promise<{ volta?: string }>;
}) {
  const { app } = await params;
  if (!isAppId(app)) notFound();
  const config = APPS[app];
  // vindo da extensão do Chrome: depois de liberar, volta pra página exata em que você tava
  const openUrl = safeReturnUrl(app, (await searchParams).volta) ?? config.openUrl;

  const { data: active } = await db()
    .from("porteiro_passes")
    .select("*")
    .eq("app", app)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    const pass = active as PassRow;
    return (
      <main className="flex min-h-[80dvh] flex-col justify-center gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{config.name}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Liberado até {fmtTime(pass.expires_at)}</h1>
          {pass.intent && <p className="text-muted">Você entrou pra: {pass.intent}</p>}
        </div>
        <OpenAppLinks name={config.name} openUrl={openUrl} schemeUrl={config.schemeUrl} />
        <Link href="/" className="flex min-h-11 items-center justify-center text-sm text-muted underline underline-offset-4">
          Voltar pro início
        </Link>
      </main>
    );
  }

  const info = await getEntryInfo(app).catch((err) => {
    console.error("entrar: lembrete indisponível", err);
    return null;
  });
  const last = info?.last;

  return (
    <EntryFlow
      app={{ id: config.id, name: config.name, openUrl, schemeUrl: config.schemeUrl }}
      todayMinutes={info ? Math.round(info.todayMinutes) : null}
      goal={info?.limit ?? null}
      last={last && !last.active ? { intent: last.intent, asked: last.asked, used: Math.round(last.used) } : null}
    />
  );
}
