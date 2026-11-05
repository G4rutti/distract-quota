"use client";

// Rede pra qualquer erro que escapar de uma tela: mostra o que fazer em vez da página genérica.
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[70dvh] flex-col justify-center gap-3">
      <h1 className="text-2xl font-semibold">Deu ruim aqui</h1>
      <p className="text-muted">Pode ser a internet ou o banco. Tenta de novo; se continuar, recarrega a página.</p>
      <button type="button" onClick={reset} className="press h-12 self-start rounded-ui bg-accent px-5 font-medium text-accent-ink">
        Tentar de novo
      </button>
    </main>
  );
}
