import Link from "next/link";

export function LoadError({ href = "/" }: { href?: string }) {
  return (
    <main className="flex min-h-[70dvh] flex-col justify-center gap-3">
      <h1 className="text-2xl font-semibold">Não deu pra carregar</h1>
      <p className="text-muted">
        O banco não respondeu. Confere SUPABASE_URL e SUPABASE_SECRET_KEY na Vercel e se as migrations rodaram.
      </p>
      <Link href={href} className="inline-flex min-h-11 items-center underline underline-offset-4">
        Tentar de novo
      </Link>
    </main>
  );
}
