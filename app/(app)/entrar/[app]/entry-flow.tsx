"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { BrandMark } from "@/components/brand-mark";
import { DotCount } from "@/components/dot-count";
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
  const { remaining, precise } = useBreath(BREATH_SECONDS);
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
      <main className="flex min-h-[85dvh] flex-col justify-between gap-8 py-4">
        <GateTop name={app.name} />

        <div className="flex flex-col items-center gap-7 text-center">
          <DotCount seconds={precise} total={BREATH_SECONDS} size={256} />
          <h1 ref={headingRef} tabIndex={-1} className="max-w-[22ch] text-2xl font-medium leading-snug tracking-tight outline-none [text-wrap:balance]">
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
      <main className="flex min-h-[85dvh] flex-col gap-9 py-4">
        <GateTop name={app.name} />
        <h1 ref={headingRef} tabIndex={-1} className="display text-[3.4rem] outline-none">
          Pra quê vai abrir o {app.name}?
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
                className={`press min-h-11 rounded-full border-[1.5px] px-4 text-sm font-medium ${
                  intent === q ? "border-text bg-text text-bg" : "border-line"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium">Por quanto tempo?</legend>
          <div className="grid grid-cols-4 gap-2">
            {MINUTE_OPTIONS.map((m) => (
              <label
                key={m}
                className={`press flex h-16 cursor-pointer flex-col items-center justify-center rounded-ui border-[1.5px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                  minutes === m ? "border-text bg-text text-bg" : "border-line"
                }`}
              >
                <input type="radio" name="minutes" value={m} checked={minutes === m} onChange={() => setMinutes(m)} className="sr-only" />
                <span className="display text-[1.9rem]">{m}</span>
                <span className="label -mt-0.5 opacity-70">min</span>
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

  // o passe: tela inteira no acento, como na demo da landing
  return (
    <main className="fixed inset-0 z-20 flex flex-col bg-accent text-accent-ink">
      <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="label flex items-center gap-2 opacity-80">
          <BrandMark size={16} className="[--accent:currentColor]" /> Passe · {app.name}
        </p>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <h1 ref={headingRef} tabIndex={-1} className="display flex flex-col text-[clamp(4.5rem,24vw,7rem)] outline-none">
            <span>Liberado</span>
            <span className="opacity-70">até {expiresAt ? timeFmt.format(new Date(expiresAt)) : ""}</span>
          </h1>
          <p className="max-w-[34ch] text-base leading-relaxed">
            {intent ? `${intent}. ` : ""}
            {minutes} minutos. No celular, sair na hora fica contigo. No computador, a extensão fecha quando acabar.
          </p>
        </div>
        <OpenAppLinks name={app.name} openUrl={app.openUrl} schemeUrl={app.schemeUrl} tone="onAccent" />
      </div>
    </main>
  );
}

function GateTop({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <BrandMark size={18} /> Porteiro · {name}
    </p>
  );
}

function Reminder({ last, todayMinutes, goal }: Pick<Props, "last" | "todayMinutes" | "goal">) {
  if (last) {
    const overran = last.used > last.asked + 1;
    return (
      <p className="max-w-[34ch] text-base text-muted">
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
  const [precise, setPrecise] = useState(seconds); // pro anel andar suave; a regra continua a mesma
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
      setPrecise(Math.max(0, left / 1000));
      if (left <= 0) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [seconds]);
  return { remaining, precise };
}
