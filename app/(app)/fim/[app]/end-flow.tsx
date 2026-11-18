"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { BrandMark } from "@/components/brand-mark";
import { EXTRA_MINUTE_OPTIONS, TIMEZONE } from "@/lib/config";
import { OpenAppLinks } from "../../entrar/[app]/open-app-links";
import { extend, leave } from "./actions";

type Props = {
  app: { id: string; name: string; openUrl: string; schemeUrl: string };
  todayMinutes: number | null;
  goal: number | null;
  last: { intent: string; asked: number; used: number; active: boolean; expiresAt: string } | null;
};

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });

export function EndFlow({ app, todayMinutes, goal, last }: Props) {
  const [step, setStep] = useState<"choose" | "left" | "extended">(last?.active ? "extended" : "choose");
  const [expiresAt, setExpiresAt] = useState<string | null>(last?.active ? last.expiresAt : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function onLeave() {
    setError(null);
    startTransition(async () => {
      const res = await leave(app.id);
      if (!res.ok) return setError(res.error);
      setStep("left");
    });
  }

  function onExtend(minutes: number) {
    setError(null);
    startTransition(async () => {
      const res = await extend(app.id, minutes);
      if (!res.ok) return setError(res.error);
      setExpiresAt(res.expiresAt ?? null);
      setStep("extended");
    });
  }

  if (step === "left") {
    return (
      <main className="flex min-h-[85dvh] flex-col justify-between gap-8 py-4">
        <Top name={app.name} />
        <div className="flex flex-col gap-4">
          <h1 ref={headingRef} tabIndex={-1} className="display text-[3.6rem] outline-none">
            Fechou. Boa.
          </h1>
          <Today todayMinutes={todayMinutes} goal={goal} />
        </div>
        <Link href="/" className="press flex h-14 items-center justify-center rounded-ui bg-accent text-lg font-medium text-accent-ink">
          Ver o dia
        </Link>
      </main>
    );
  }

  if (step === "extended") {
    return (
      <main className="fixed inset-0 z-20 flex flex-col bg-accent text-accent-ink">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
          <p className="label flex items-center gap-2 opacity-80">
            <BrandMark size={16} className="[--accent:currentColor]" /> Passe · {app.name}
          </p>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <h1 ref={headingRef} tabIndex={-1} className="display flex flex-col text-[clamp(4.5rem,24vw,7rem)] outline-none">
              <span>Mais um pouco</span>
              <span className="opacity-70">até {expiresAt ? timeFmt.format(new Date(expiresAt)) : ""}</span>
            </h1>
            <p className="max-w-[34ch] text-base leading-relaxed">Quando acabar, a notificação volta.</p>
          </div>
          <div className="flex flex-col gap-1">
            <OpenAppLinks name={app.name} openUrl={app.openUrl} schemeUrl={app.schemeUrl} tone="onAccent" />
            <Link href="/" className="flex min-h-11 items-center justify-center text-sm underline underline-offset-4 opacity-80">
              Voltar pro início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[85dvh] flex-col gap-8 py-4">
      <Top name={app.name} />
      <div className="flex flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="display text-[3.6rem] outline-none">
          Acabou o passe do {app.name}
        </h1>
        {last && (
          <p className="max-w-[34ch] text-base text-muted">
            Você pediu <span className="num text-text">{last.asked}</span> min
            {last.intent ? ` pra "${last.intent}"` : ""}.
          </p>
        )}
        <Today todayMinutes={todayMinutes} goal={goal} />
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className="press h-14 rounded-ui bg-accent text-lg font-medium text-accent-ink disabled:opacity-40"
        >
          Vou sair
        </button>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pedir mais tempo">
          {EXTRA_MINUTE_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onExtend(m)}
              disabled={pending}
              className="press flex h-14 items-center justify-center gap-1 rounded-ui border-[1.5px] border-line text-base font-medium disabled:opacity-40"
            >
              Mais <span className="num">{m}</span> min
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

function Top({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <BrandMark size={18} /> Porteiro · {name}
    </p>
  );
}

function Today({ todayMinutes, goal }: Pick<Props, "todayMinutes" | "goal">) {
  if (todayMinutes === null || goal === null) return null;
  const over = todayMinutes > goal;
  return (
    <p className="max-w-[36ch] text-base text-muted">
      Hoje: <span className={`num ${over ? "font-semibold text-text" : "text-text"}`}>{todayMinutes}</span> de {goal} min
      {over ? ", já passou do limite." : "."}
    </p>
  );
}
