import { notFound } from "next/navigation";
import { APPS, isAppId } from "@/lib/config";
import { getEntryInfo } from "@/lib/stats";
import { EndFlow } from "./end-flow";

export const dynamic = "force-dynamic";

/** Aberta pela notificação de "acabou o passe". */
export default async function FimPage({ params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  if (!isAppId(app)) notFound();
  const config = APPS[app];

  const info = await getEntryInfo(app).catch((err) => {
    console.error("fim: resumo indisponível", err);
    return null;
  });
  const last = info?.last ?? null;

  return (
    <EndFlow
      app={{ id: config.id, name: config.name, openUrl: config.openUrl, schemeUrl: config.schemeUrl }}
      todayMinutes={info ? Math.round(info.todayMinutes) : null}
      goal={info?.limit ?? null}
      last={last ? { intent: last.intent, asked: last.asked, used: Math.round(last.used), active: last.active, expiresAt: last.expiresAt } : null}
    />
  );
}
