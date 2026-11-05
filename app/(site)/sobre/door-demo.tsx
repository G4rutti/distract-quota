"use client";

import { useEffect, useRef, useState } from "react";

// Mesmos valores do app (lib/config.ts e entry-flow.tsx), copiados pra landing não importar código de servidor.
const APPS = [
  { id: "tiktok", name: "TikTok" },
  { id: "instagram", name: "Instagram" },
  { id: "twitter", name: "X" },
] as const;
const QUICK_INTENTS = ["Responder DM", "Postar algo", "Ver algo que me mandaram", "Só passar o tempo"];
const MINUTE_OPTIONS = [5, 10, 15, 30];
const BREATH = 10;

type App = (typeof APPS)[number];
type Step = "home" | "breath" | "choose" | "pass" | "expired";

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export function DoorDemo() {
  const [step, setStep] = useState<Step>("home");
  const [app, setApp] = useState<App>(APPS[0]);
  const [left, setLeft] = useState(BREATH);
  const [intent, setIntent] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [pass, setPass] = useState<{ no: string; from: string; until: string } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step !== "breath") return;
    if (left === 0) {
      setStep("choose");
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [step, left]);

  // foco no título a cada etapa, igual ao app, pra leitor de tela anunciar a troca
  useEffect(() => {
    if (step !== "home") headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function knock(a: App) {
    setApp(a);
    setLeft(BREATH);
    setIntent("");
    setMinutes(10);
    setStep("breath");
  }

  function release() {
    const now = new Date();
    setPass({
      no: String(1000 + Math.floor(Math.random() * 9000)),
      from: timeFmt.format(now),
      until: timeFmt.format(new Date(now.getTime() + minutes * 60_000)),
    });
    setStep("pass");
  }

  const used = minutes + 24;

  return (
    <div className="grid items-start gap-10 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-16">
      {/* o celular */}
      <div data-phone className="mx-auto w-full max-w-[340px] rounded-[44px] border border-line bg-surface p-3 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.5)]">
        <div className="flex min-h-[560px] flex-col rounded-[34px] bg-bg px-6 pb-6 pt-10">
          {step === "home" && (
            <div className="flex flex-1 flex-col gap-8">
              <p className="text-sm text-muted">Toca num app pra tentar abrir.</p>
              <div className="grid grid-cols-3 gap-4">
                {APPS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => knock(a)}
                    className="lp-btn flex flex-col items-center gap-2 text-xs"
                  >
                    <span className="grid aspect-square w-full place-items-center rounded-[18px] border border-line bg-surface text-sm font-semibold">
                      {a.name.slice(0, 2)}
                    </span>
                    {a.name}
                  </button>
                ))}
              </div>
              <p className="mt-auto text-xs leading-relaxed text-muted">
                No iPhone, quem faz essa batida é a automação do Atalhos: “Quando o {app.name} for aberto”, pergunta pro Porteiro se tem passe.
              </p>
            </div>
          )}

          {step === "breath" && (
            <div className="flex flex-1 flex-col justify-between gap-8">
              <p className="text-sm text-muted">{app.name}</p>
              <div className="flex flex-col gap-5">
                <span className="num text-[7.5rem] font-medium leading-[0.8]" aria-hidden>
                  {left}
                </span>
                <h3 ref={headingRef} tabIndex={-1} className="text-xl font-medium leading-snug tracking-tight outline-none">
                  Respira. O {app.name} continua lá daqui a {left} {left === 1 ? "segundo" : "segundos"}.
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setStep("home")} className="lp-btn h-12 rounded-[var(--radius)] border border-line font-medium">
                  Deixa pra lá
                </button>
                <button type="button" onClick={() => setLeft(0)} className="min-h-10 text-xs text-muted underline underline-offset-4">
                  Pular a espera (só na demo)
                </button>
              </div>
            </div>
          )}

          {step === "choose" && (
            <div className="flex flex-1 flex-col gap-6">
              <p className="text-sm text-muted">{app.name}</p>
              <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                Pra quê você vai entrar?
              </h3>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Motivos rápidos">
                {QUICK_INTENTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setIntent(q)}
                    aria-pressed={intent === q}
                    className={`lp-btn min-h-10 rounded-full border px-3.5 text-[13px] ${
                      intent === q ? "border-accent bg-accent-soft font-medium" : "border-line"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Por quanto tempo</legend>
                <div className="grid grid-cols-4 gap-2">
                  {MINUTE_OPTIONS.map((m) => (
                    <label
                      key={m}
                      className={`lp-btn flex h-12 cursor-pointer items-center justify-center rounded-[var(--radius)] border text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                        minutes === m ? "border-accent bg-accent-soft font-semibold" : "border-line"
                      }`}
                    >
                      <input type="radio" name="demo-minutes" value={m} checked={minutes === m} onChange={() => setMinutes(m)} className="sr-only" />
                      <span className="num">{m}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                onClick={release}
                disabled={!intent}
                className="lp-btn mt-auto h-12 rounded-[var(--radius)] bg-accent font-medium text-accent-ink disabled:opacity-40"
              >
                {intent ? `Liberar ${minutes} min` : "Escolhe um motivo"}
              </button>
            </div>
          )}

          {(step === "pass" || step === "expired") && pass && (
            <div className="flex flex-1 flex-col gap-6">
              <p className="text-sm text-muted">{app.name}</p>
              {step === "pass" ? (
                <>
                  <h3 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">
                    Liberado até <span className="num">{pass.until}</span>
                  </h3>
                  <p className="text-muted">Você entrou pra: {intent}</p>
                  <div className="mt-auto flex flex-col gap-2">
                    <span className="flex h-12 items-center justify-center rounded-[var(--radius)] bg-accent font-medium text-accent-ink">
                      Abrir o {app.name}
                    </span>
                    <button type="button" onClick={() => setStep("expired")} className="min-h-10 text-xs text-muted underline underline-offset-4">
                      Pular pro fim do passe
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                    O passe venceu.
                  </h3>
                  <p className="leading-relaxed">
                    Na próxima batida, antes do contador, o Porteiro lembra: <strong className="font-semibold">da última vez você pediu {minutes} e ficou {used}.</strong>
                  </p>
                  <p className="text-xs text-muted">O {used} aqui é exemplo. No app, sai do horário em que o atalho de fechar avisou.</p>
                  <button type="button" onClick={() => setStep("home")} className="lp-btn mt-auto h-12 rounded-[var(--radius)] border border-line font-medium">
                    Bater de novo
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* a impressora do passe */}
      <div data-printer className="flex min-w-0 flex-col gap-6 md:pt-10">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="lp-slot" />
          <div className="lp-ticket-clip min-h-[420px]">
            {pass && (step === "pass" || step === "expired") ? (
              <Ticket key={pass.no} pass={pass} app={app.name} intent={intent} minutes={minutes} expired={step === "expired"} />
            ) : (
              <div className="mt-3 grid h-[360px] place-items-center rounded-b-[10px] border-2 border-t-0 border-dashed border-line px-6 text-center">
                <p className="text-sm text-muted">
                  {step === "home" && "O passe sai por aqui."}
                  {step === "breath" && "Esperando os 10 segundos…"}
                  {step === "choose" && "Esperando motivo e tempo…"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Ticket({
  pass,
  app,
  intent,
  minutes,
  expired,
}: {
  pass: { no: string; from: string; until: string };
  app: string;
  intent: string;
  minutes: number;
  expired: boolean;
}) {
  const [stamped, setStamped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStamped(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const rows: [string, string][] = [
    ["App", app],
    ["Motivo", intent],
    ["Tempo", `${minutes} min`],
    ["Emitido", pass.from],
    ["Válido até", pass.until],
  ];
  // código de barras a partir do número e do horário do passe: cada dígito vira largura de barra
  const seed = (pass.no + pass.until.replace(":", "") + pass.from.replace(":", "")).repeat(4).slice(0, 44);
  const bars = seed.split("").map((d) => 1 + (Number(d) % 3));

  return (
    <div
      className="lp-thud"
      data-on={String(stamped)}
      role="img"
      aria-label={`Passe ${pass.no}: ${app}, ${minutes} minutos, válido até ${pass.until}${expired ? ", vencido" : ""}`}
    >
      <div className="lp-ticket-body" data-printing="true">
        {/* corpo do passe: reta embaixo, é ali que o canhoto destaca */}
        <div className="lp-ticket relative px-5 pb-4 pt-6" data-flat="true">
          <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.12em] text-[var(--paper-muted)]">
            <span>Porteiro · Passe</span>
            <span>Nº {pass.no}</span>
          </div>
          <div className="lp-perf my-4" />
          <dl className="flex flex-col gap-2.5 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-[var(--paper-muted)]">{k}</dt>
                <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {/* área livre pros carimbos, pra não cobrirem o horário */}
          <div className="relative h-24">
            <span className="lp-stamp text-[var(--stamp)]" data-on={String(stamped)} style={{ top: 24, right: 8 }}>
              LIBERADO
            </span>
            {expired && (
              <span className="lp-stamp text-[var(--void)]" data-on="true" style={{ top: 18, right: "auto", left: 4 }}>
                VENCIDO
              </span>
            )}
          </div>
          <div className="lp-perf -mb-4" />
        </div>
        {/* canhoto: cai quando o passe vence */}
        <div className="lp-stub lp-ticket px-5 pb-8 pt-5" data-torn={String(expired)}>
          <div className="flex h-12 items-stretch justify-between" aria-hidden>
            {bars.map((w, k) => (
              <span key={k} style={{ width: w * 2, background: k % 2 ? "transparent" : "var(--paper-ink)" }} />
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.12em] text-[var(--paper-muted)]">Destaque ao abrir o {app}</p>
        </div>
      </div>
    </div>
  );
}
