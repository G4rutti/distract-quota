import Link from "next/link";
import { notFound } from "next/navigation";
import { APPS, isAppId, safeReturnUrl } from "@/lib/config";
import { db, type PassRow } from "@/lib/db";
import { fmtTime } from "@/lib/format";
import { getEntryInfo } from "@/lib/stats";
import { EntryFlow } from "./entry-flow";
import { OpenAppLinks } from "./open-app-links";
import { BrandMark } from "@/components/brand-mark";

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
      <main className="fixed inset-0 z-20 flex flex-col bg-accent text-accent-ink">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
          <p className="label flex items-center gap-2 opacity-80">
            <BrandMark size={16} className="[--accent:currentColor]" /> Passe · {config.name}
          </p>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <h1 className="display flex flex-col text-[clamp(4.5rem,24vw,7rem)]">
              <span>Liberado</span>
              <span className="opacity-70">até {fmtTime(pass.expires_at)}</span>
            </h1>
            {pass.intent && <p className="max-w-[34ch] text-base leading-relaxed">Você entrou pra: {pass.intent}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <OpenAppLinks name={config.name} openUrl={openUrl} schemeUrl={config.schemeUrl} tone="onAccent" />
            <Link href="/" className="flex min-h-11 items-center justify-center text-sm underline underline-offset-4 opacity-80">
              Voltar pro início
            </Link>
          </div>
        </div>
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
