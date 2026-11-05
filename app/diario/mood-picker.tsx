"use client";

import { useOptimistic, useState, useTransition } from "react";
import { saveDiary, type DiaryField } from "./actions";

type Props = { dia: string; field: DiaryField; label: string; options: readonly string[]; value: number | null };

/** Uma fileira de 5 botões: um toque grava. Mostra a escolha na hora e desfaz se o servidor recusar. */
export function MoodPicker({ dia, field, label, options, value }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function pick(v: number) {
    setError(null);
    startTransition(async () => {
      setOptimistic(v);
      try {
        const res = await saveDiary(dia, field, v);
        if (!res.ok) setError(res.error ?? "Erro ao salvar.");
      } catch {
        // rede caiu ou sessão expirou: o otimista volta sozinho e a tela não quebra
        setError("Não consegui salvar. Confere a internet e tenta de novo.");
      }
    });
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((opt, i) => {
          const v = i + 1;
          const selected = optimistic === v;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => pick(v)}
              aria-pressed={selected}
              className={`press flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-ui border px-1 text-xs ${
                selected ? "border-accent bg-accent-soft font-semibold" : "border-line"
              }`}
            >
              <span className="num text-base">{v}</span>
              <span className="leading-tight">{opt}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}
