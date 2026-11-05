"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { BREATH_SECONDS, MINUTE_OPTIONS, TIMEZONE } from "@/lib/config";
import { createPass } from "./actions";
import { OpenAppLinks } from "./open-app-links";

type Props = {
  app: { id: string; name: string; openUrl: string; schemeUrl: string };
  todayMinutes: number | null;
  goal: number | null;
  last: { intent: string; asked: number; used: number } | null;
};

const QUICK_INTENTS = ["Responder DM", "Postar algo", "Ver algo que me mandaram", "Só passar o tempo"];

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });

export function EntryFlow({ app, todayMinutes, goal, last }: Props) {
  const remaining = useBreath(BREATH_SECONDS);
  const [step, setStep] = useState<"breath" | "choose" | "open">("breath");
  const [intent, setIntent] = useState("");
  const [minutes, setMinutes] = useState<number>(MINUTE_OPTIONS[1]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "breath" && remaining === 0) setStep("choose");
  }, [remaining, step]);

  // leva o foco pro título a cada etapa, pra leitor de tela anunciar a mudança
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function release() {
    setError(null);
    startTransition(async () => {
      const res = await createPass(app.id, minutes, intent);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setExpiresAt(res.expiresAt);
      setStep("open");
    });
  }

  if (step === "breath") {
    return (
      <main className="flex min-h-[85dvh] flex-col justify-between gap-10 py-4">
        <p className="text-sm text-muted">{app.name}</p>

        <div className="flex flex-col gap-6">
          <span className="num text-[11rem] font-medium leading-[0.8]" aria-hidden>
            {remaining}
          </span>
          <h1 ref={headingRef} tabIndex={-1} className="max-w-[22ch] text-2xl font-medium leading-snug tracking-tight outline-none">
            Respira. O {app.name} continua lá daqui a {remaining} {remaining === 1 ? "segundo" : "segundos"}.
          </h1>
          <Reminder last={last} todayMinutes={todayMinutes} goal={goal} />
        </div>

        <Link href="/" className="press flex h-14 items-center justify-center rounded-ui border border-line text-base font-medium">
          Deixa pra lá
        </Link>
      </main>
    );
  }

  if (step === "choose") {
    const canRelease = intent.trim().length > 0 && !pending;
    return (
      <main className="flex min-h-[85dvh] flex-col gap-10 py-4">
        <p className="text-sm text-muted">{app.name}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
          Pra quê você vai entrar?
        </h1>

        <div className="flex flex-col gap-3">
          <label htmlFor="intent" className="text-sm font-medium">
            Motivo
          </label>
          <input
            id="intent"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            maxLength={140}
            autoComplete="off"
            enterKeyHint="done"
            className="h-12 rounded-ui border border-line bg-surface px-4 text-base focus:border-accent"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Motivos rápidos">
            {QUICK_INTENTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setIntent(q)}
                aria-pressed={intent === q}
                className={`press min-h-11 rounded-full border px-4 text-sm ${
                  intent === q ? "border-accent bg-accent-soft font-medium" : "border-line"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium">Por quanto tempo</legend>
          <div className="grid grid-cols-4 gap-2">
            {MINUTE_OPTIONS.map((m) => (
              <label
                key={m}
                className={`press flex h-14 cursor-pointer items-center justify-center rounded-ui border text-base has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                  minutes === m ? "border-accent bg-accent-soft font-semibold" : "border-line"
                }`}
              >
                <input type="radio" name="minutes" value={m} checked={minutes === m} onChange={() => setMinutes(m)} className="sr-only" />
                <span className="num">{m}</span>&nbsp;min
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-auto flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={release}
            disabled={!canRelease}
            className="press h-14 rounded-ui bg-accent text-lg font-medium text-accent-ink disabled:opacity-40"
          >
            {pending ? "Liberando..." : `Liberar ${minutes} min`}
          </button>
          <Link href="/" className="flex min-h-11 items-center justify-center text-sm text-muted underline underline-offset-4">
            Desisti, não vou entrar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[85dvh] flex-col justify-center gap-8 py-4">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{app.name}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
          Liberado até {expiresAt ? timeFmt.format(new Date(expiresAt)) : ""}
        </h1>
        <p className="text-muted">Quando acabar, ninguém te tira de lá. Sair na hora fica contigo.</p>
      </div>
      <OpenAppLinks name={app.name} openUrl={app.openUrl} schemeUrl={app.schemeUrl} />
    </main>
  );
}

function Reminder({ last, todayMinutes, goal }: Pick<Props, "last" | "todayMinutes" | "goal">) {
  if (last) {
    const overran = last.used > last.asked + 1;
    return (
      <p className="max-w-[36ch] text-base text-muted">
        Da última vez você pediu <span className="num text-text">{last.asked}</span> min
        {last.intent ? ` pra "${last.intent}"` : ""}
        {overran ? (
          <>
            {" "}
            e ficou <span className="num font-semibold text-text">{last.used}</span>.
          </>
        ) : (
          <> e cumpriu.</>
        )}
      </p>
    );
  }
  if (todayMinutes !== null && goal !== null) {
    return (
      <p className="max-w-[36ch] text-base text-muted">
        Hoje já foram <span className="num text-text">{todayMinutes}</span> de {goal} min.
      </p>
    );
  }
  return null;
}

/** Conta regressiva que só anda com a aba visível: trocar de app não pula a espera. */
function useBreath(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    let left = seconds * 1000;
    let lastTick = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // no máximo 300 ms por tick: se o iOS descongelar a aba e o tick vier antes do visibilitychange,
      // o tempo fora não é descontado
      if (document.visibilityState === "visible") left -= Math.min(now - lastTick, 300);
      lastTick = now;
      const next = Math.max(0, Math.ceil(left / 1000));
      setRemaining(next);
      if (left <= 0) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [seconds]);
  return remaining;
}
