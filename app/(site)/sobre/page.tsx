import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { LIMITS } from "@/lib/config";
import { perAppLimit } from "@/lib/limits";
import { DoorDemo } from "./door-demo";
import { ExtensionDemo, LimitBars, Rise } from "./motion";
import { HeroPass, ScrollFX, Spotlight, SwapPill, Ticker } from "./fx";
import { IntroGate } from "./intro-gate";

const REPO = "https://github.com/G4rutti/distract-quota";

export const metadata: Metadata = {
  title: "Porteiro: TikTok, Instagram e X só entram passando por aqui",
  description:
    "Sem passe, o Porteiro aparece por cima do app: 10 segundos de espera, você diz pra quê vai entrar e por quanto tempo. Código aberto, roda na tua Vercel.",
  robots: { index: true, follow: true },
};

// A mesma curva que o app usa: começa em 60 min por app e cai 15% por semana até o piso.
const WEEKS = Array.from({ length: 10 }, (_, w) => ({ label: String(w + 1), minutes: perAppLimit(w) }));
const FLOOR_WEEK = WEEKS.findIndex((w) => w.minutes === LIMITS.floorPerApp) + 1;

const FLOW = `abre o TikTok ─▶ automação "Ao abrir" ─▶ GET /api/gate?app=tiktok
                                         │
                 "liberado" ◀─ tem passe ┤
                                         │
                                         └─ sem passe ─▶ /entrar/tiktok
                                                         10s ─▶ motivo + tempo ─▶ passe

fecha o TikTok ─▶ automação "Ao fechar" ─▶ GET /api/event?app=tiktok`;

const INTENTS = ["Responder DM", "5 min", "Postar algo", "10 min", "Ver algo que me mandaram", "15 min", "Só passar o tempo", "30 min"];

const STEPS = [
  { title: "Supabase", body: "Um projeto no plano free, região São Paulo. Roda a migration e copia a URL e a secret key." },
  { title: "Vercel", body: "Importa o repo, põe as 3 variáveis. As funções já vêm fixadas em gru1, perto do banco." },
  { title: "Atalhos", body: "Quatro automações: abrir e fechar, pra TikTok e Instagram. A página /setup monta as URLs pra copiar." },
  { title: "Extensão", body: "Carrega a pasta extension no Chrome. Mesmo passe e mesmo limite do celular." },
];

export default function Sobre() {
  return (
    <div className="bg-bg text-text">
      <IntroGate />
      <ScrollFX />
      <header className="lp-wrap flex h-16 items-center justify-between gap-4 pt-[env(safe-area-inset-top)]">
        <span className="text-[17px] font-semibold tracking-tight">Porteiro</span>
        <nav className="flex items-center gap-1 text-sm sm:gap-2" aria-label="Principal">
          <a href="#porta" className="hidden min-h-10 items-center rounded-full px-3 text-muted hover:text-text sm:flex">
            Como funciona
          </a>
          <a href={REPO} className="flex min-h-10 items-center gap-1.5 rounded-full px-3 text-muted hover:text-text">
            <GithubLogo size={18} aria-hidden /> GitHub
          </a>
          <Link href="/login" className="lp-btn flex min-h-10 items-center rounded-full border border-line px-4 font-medium">
            Entrar
          </Link>
        </nav>
      </header>

      {/* hero: a frase de um lado, o passe do visitante do outro */}
      <section
        data-hero
        className="lp-wrap grid min-h-[calc(100svh-4rem)] items-center gap-14 pb-20 pt-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:pb-24"
      >
        <div className="flex min-w-0 flex-col gap-8">
          <h1 className="text-[clamp(2.6rem,6vw,5.2rem)] font-semibold leading-[1.0] tracking-[-0.04em]">
            <span data-hero-line>
              <span>
                O <SwapPill words={["TikTok", "Instagram", "X"]} />
              </span>
            </span>
            <span data-hero-line>
              <span>só abre passando</span>
            </span>
            <span data-hero-line>
              <span>por aqui.</span>
            </span>
          </h1>
          <p data-hero-fade className="max-w-[46ch] text-lg leading-relaxed text-muted">
            Sem passe, o Porteiro aparece por cima do app: 10 segundos de espera, você diz pra quê vai entrar e por quanto tempo. Só aí abre. Tu acabou de passar por ele.
          </p>
          <div data-hero-fade className="flex flex-wrap gap-3">
            <a href="#porta" className="lp-btn flex h-12 items-center gap-2 rounded-[var(--radius)] bg-accent px-5 font-medium text-accent-ink">
              Testar a porta <ArrowDown size={18} aria-hidden />
            </a>
            <a href={REPO} className="lp-btn flex h-12 items-center gap-2 rounded-[var(--radius)] border border-line px-5 font-medium">
              <GithubLogo size={18} aria-hidden /> Ver o código
            </a>
          </div>
        </div>
        <HeroPass />
      </section>

      <Ticker items={INTENTS} />

      {/* a porta, jogável */}
      <section id="porta" className="scroll-mt-6 border-y border-line bg-surface py-24 md:py-32">
        <div className="lp-wrap flex flex-col gap-14">
          <Rise className="flex max-w-[60ch] flex-col gap-4">
            <p className="lp-eyebrow">A porta</p>
            <h2 data-reveal className="text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
              Tenta abrir. É assim que o celular responde.
            </h2>
            <p className="text-lg leading-relaxed text-muted">
              Os mesmos 10 segundos, os mesmos motivos e os mesmos tempos do app. O passe sai impresso, com hora de validade, e vence sozinho.
            </p>
          </Rise>
          <DoorDemo />
        </div>
      </section>

      {/* o limite que cai */}
      <section data-limit className="lp-wrap grid gap-12 py-24 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:py-32">
        <Rise className="flex min-w-0 flex-col gap-4">
          <p className="lp-eyebrow">O limite</p>
          <h2 data-reveal className="text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
            Começa folgado e aperta toda semana.
          </h2>
          <p className="max-w-[44ch] text-lg leading-relaxed text-muted">
            {LIMITS.startPerApp} minutos por app na primeira semana, {Math.round(LIMITS.weeklyCut * 100)}% a menos a cada semana, arredondado de 5 em 5, até parar em {LIMITS.floorPerApp}. O limite do dia é a soma dos apps.
          </p>
          <p className="text-sm text-muted">
            Na semana {FLOOR_WEEK} chega no piso. Os números do gráfico saem da mesma função que o app usa.
          </p>
        </Rise>
        <div className="flex min-w-0 flex-col gap-8 self-end">
          <p className="flex items-baseline gap-3" aria-hidden>
            <span data-limit-number data-values={WEEKS.map((w) => w.minutes).join(",")} className="num text-[clamp(6rem,14vw,11rem)] font-medium leading-[0.8]">
              {WEEKS[0].minutes}
            </span>
            <span className="text-xl text-muted">min por app</span>
          </p>
          <LimitBars weeks={WEEKS} />
          <p className="mt-3 text-xs text-muted">Semana do programa · minutos por app, por dia.</p>
        </div>
      </section>

      {/* no computador */}
      <section className="lp-wrap grid gap-12 pb-24 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] md:items-center md:pb-32">
        <div data-browser className="order-2 min-w-0 md:order-1">
          <ExtensionDemo />
        </div>
        <Rise className="order-1 flex min-w-0 flex-col gap-4 md:order-2">
          <p className="lp-eyebrow">No computador</p>
          <h2 data-reveal className="text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
            A extensão fecha a porta dos fundos.
          </h2>
          <p className="max-w-[44ch] text-lg leading-relaxed text-muted">
            tiktok.com, instagram.com e x.com no Chrome caem na mesma porta. O passe liberado no celular vale no PC, e o tempo soma no mesmo limite.
          </p>
        </Rise>
      </section>

      {/* por baixo */}
      <section className="border-t border-line bg-surface py-24 md:py-32">
        <div className="lp-wrap flex flex-col gap-14">
          <Rise className="flex max-w-[60ch] flex-col gap-4">
            <p className="lp-eyebrow">Por baixo</p>
            <h2 data-reveal className="text-[clamp(2rem,4.2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em] [text-wrap:balance]">
              Um app só teu, na tua conta.
            </h2>
            <p className="text-lg leading-relaxed text-muted">
              Next.js 16, Supabase e Vercel. Os Atalhos do iPhone avisam quando o app abre e fecha; abertura liberada mais o próximo fechamento vira uma sessão. Dali saem os minutos do dia, a semana e os horários de pico.
            </p>
          </Rise>

          <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-bg">
            <pre className="num min-w-[720px] p-6 text-[13px] leading-[1.7] tracking-normal text-muted">{FLOW}</pre>
          </div>

          <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, k) => (
              <li key={s.title} className="flex flex-col gap-2 border-t border-line pt-5">
                <span className="num text-sm text-muted">{k + 1}</span>
                <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* fim */}
      <Spotlight className="lp-wrap flex flex-col items-start gap-8 py-24 md:py-36">
        <h2 data-reveal className="max-w-[16ch] text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.035em] [text-wrap:balance]">
          O código tá aberto. Sobe o teu.
        </h2>
        <div className="flex flex-wrap gap-3">
          <a href={REPO} className="lp-btn flex h-12 items-center gap-2 rounded-[var(--radius)] bg-accent px-5 font-medium text-accent-ink">
            <GithubLogo size={18} aria-hidden /> G4rutti/distract-quota
          </a>
          <a href={`${REPO}#1-supabase`} className="lp-btn flex h-12 items-center gap-2 rounded-[var(--radius)] border border-line px-5 font-medium">
            Guia de instalação <ArrowUpRight size={18} aria-hidden />
          </a>
        </div>
      </Spotlight>

      <footer className="lp-wrap flex flex-wrap items-center justify-between gap-4 border-t border-line pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-sm text-muted">
        <span>Porteiro, feito por Davi Garutti.</span>
        <Link href="/login" className="min-h-10 content-center underline underline-offset-4">
          Já é teu? Entrar
        </Link>
      </footer>
    </div>
  );
}
