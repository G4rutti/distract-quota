import { BrandMark } from "@/components/brand-mark";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next = "/", erro } = await searchParams;

  return (
    <main className="flex min-h-[80dvh] flex-col justify-center gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="display flex items-center gap-3 text-[3.6rem]">
          <BrandMark size={42} /> Porteiro
        </h1>
        <p className="max-w-[34ch] text-muted">
          Entra uma vez neste navegador. Se usar o app pela tela de início também, entra lá separado.
        </p>
      </div>

      <form action={login} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-2">
          <label htmlFor="segredo" className="text-sm font-medium">
            Segredo
          </label>
          <input
            id="segredo"
            name="segredo"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={erro ? "segredo-erro" : undefined}
            aria-invalid={erro ? true : undefined}
            className="h-12 rounded-ui border border-line bg-surface px-4 text-base focus:border-accent"
          />
          {erro && (
            <p id="segredo-erro" className="text-sm">
              Segredo errado. É o mesmo valor do APP_SECRET.
            </p>
          )}
        </div>
        <button type="submit" className="press h-12 rounded-ui bg-accent font-medium text-accent-ink">
          Entrar
        </button>
      </form>
    </main>
  );
}
