import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { headers } from "next/headers";
import { APPS, APP_IDS } from "@/lib/config";
import { KEY_HEADER } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "seu-app.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;

  return (
    <main className="flex flex-col gap-10">
      <header className="flex items-baseline justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BrandMark size={18} /> Porteiro
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        <h1 className="display text-[3.2rem]">Atalhos do iPhone</h1>
        <p className="text-muted">
          Duas automações por app no Atalhos, aba Automação, tipo &quot;App&quot;. Marca &quot;Executar imediatamente&quot; e
          desliga &quot;Notificar ao executar&quot;.
        </p>
      </div>

      {APP_IDS.map((id) => (
        <section key={id} className="flex flex-col gap-5" aria-labelledby={`setup-${id}`}>
          <h2 id={`setup-${id}`} className="text-xl font-medium">
            {APPS[id].name}
          </h2>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Quando for aberto</h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted">
              <li>
                Obter conteúdo de URL: <Code>{`${base}/api/gate?app=${id}&k=SEU_SEGREDO`}</Code>, trocando
                SEU_SEGREDO pelo APP_SECRET (ou mandando ele no cabeçalho <Code>{KEY_HEADER}</Code>)
              </li>
              <li>
                Se o conteúdo <strong className="text-text">não contém</strong> <Code>liberado</Code>
              </li>
              <li>
                Abrir URL: <Code>{`${base}/entrar/${id}`}</Code>
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Quando for fechado</h3>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted">
              <li>
                Obter conteúdo de URL: <Code>{`${base}/api/event?app=${id}&k=SEU_SEGREDO`}</Code>
              </li>
            </ol>
          </div>
        </section>
      ))}

      <p className="text-sm text-muted">
        Os atalhos abrem esta página no navegador padrão do iPhone, que guarda o login separado do app da tela de início.
        Entra por lá uma vez.
      </p>
    </main>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="break-all rounded-[6px] bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-text">{children}</code>;
}
