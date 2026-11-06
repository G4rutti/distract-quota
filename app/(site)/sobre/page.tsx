import type { Metadata } from "next";
import { ArrowUpRight, GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { BREATH_SECONDS, LIMITS, MINUTE_OPTIONS } from "@/lib/config";
import { perAppLimit } from "@/lib/limits";
import { Hero } from "./hero";
import { FeedRoll } from "./feed-roll";
import { Manifesto } from "./manifesto";
import { Door } from "./door";
import { LimitRuler } from "./limit-ruler";
import { Browser } from "./browser";
import { Spotlight } from "./pass";
import { IntroGate } from "./intro-gate";
import { SmoothScroll } from "./smooth";

const REPO = "https://github.com/G4rutti/distract-quota";

export const metadata: Metadata = {
  title: "Porteiro: dez segundos entre você e o feed",
  description:
    "Sem passe, o Porteiro abre por cima do TikTok, do Instagram e do X: 10 segundos de espera, um motivo e um tempo. Código aberto, roda na tua Vercel.",
  robots: { index: true, follow: true },
};

// Mesmas fontes de verdade do app.
const WEEKS = Array.from({ length: 10 }, (_, w) => perAppLimit(w));
const INTENTS = ["Responder DM", "Postar algo", "Ver algo que me mandaram", "Só passar o tempo"];

const SETUP = [
  { n: "Supabase", body: "Projeto no plano free, região São Paulo. Roda a migration e copia a URL e a secret key." },
  { n: "Vercel", body: "Importa o repo e põe 3 variáveis. As funções já vêm fixadas em gru1, do lado do banco." },
  { n: "Atalhos", body: "Automações de abrir e fechar pra cada app. A página /setup monta as URLs prontas pra copiar." },
  { n: "Extensão", body: "Carrega a pasta extension no Chrome. Mesmo passe e mesmo limite do celular." },
];

const REFS = [
  { who: "Phi Hoang", what: "rolo do feed", url: "https://recent.design/i/bky6wkw-infinite-scroll-3d-concept" },
  { who: "Profound", what: "texto que acende", url: "https://recent.design/i/q4fzfg0-profound-website-redesign" },
  { who: "davidope", what: "números de pontos", url: "https://recent.design/i/cqt5k5j-dotted-countdown" },
  { who: "Contemporary Type", what: "régua de numerais", url: "https://recent.design/i/4m1bbar-kinetic-type-reel" },
];

export default function Sobre() {
  return (
    <>
      <IntroGate />
      <SmoothScroll />
      <Hero repo={REPO} />

      <FeedRoll />

      <Manifesto
        label="Em uma frase"
        text={`Abriu o app sem passe? O Porteiro entra na frente. Tu espera *${BREATH_SECONDS} segundos,* escolhe o motivo e o tempo, e o passe *vence sozinho.* Fechou o app, ele anota quanto tu ficou de verdade.`}
      />

      <section id="porta" className="scroll-mt-4 bg-[var(--pt-fog)] py-24 md:py-32" aria-labelledby="pt-door-h">
        <div className="pt-wrap flex flex-col gap-14">
          <div className="flex flex-col gap-5">
            <p className="pt-label text-[var(--pt-mute)]">02 · A porta</p>
            <h2 id="pt-door-h" className="pt-display max-w-[22ch] text-[clamp(3.2rem,7vw,6.4rem)]">
              Testa aí. <span className="text-[var(--pt-acc)]">É a porta de verdade.</span>
            </h2>
          </div>
          <Door wait={BREATH_SECONDS} intents={INTENTS} minutes={MINUTE_OPTIONS} />
        </div>
      </section>

      <LimitRuler weeks={WEEKS} start={LIMITS.startPerApp} floor={LIMITS.floorPerApp} cut={LIMITS.weeklyCut} />

      <section className="bg-[var(--pt-fog)] py-24 md:py-32" aria-labelledby="pt-pc-h">
        <div className="pt-wrap grid items-center gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-5">
            <p className="pt-label text-[var(--pt-mute)]">04 · No computador</p>
            <h2 id="pt-pc-h" className="pt-display text-[clamp(3rem,6.4vw,5.6rem)]">
              A extensão fecha a porta dos fundos.
            </h2>
            <p className="max-w-[42ch] text-[17px] leading-[1.55] text-[var(--pt-mute)]">
              tiktok.com, instagram.com e x.com no Chrome caem na mesma porta, com o mesmo passe e o mesmo limite do iPhone.
            </p>
          </div>
          <Browser wait={BREATH_SECONDS} />
        </div>
      </section>

      <section className="bg-[var(--pt-paper)] py-24 md:py-32" aria-labelledby="pt-setup-h">
        <div className="pt-wrap flex flex-col gap-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-5">
              <p className="pt-label text-[var(--pt-mute)]">05 · Por baixo</p>
              <h2 id="pt-setup-h" className="pt-display max-w-[12ch] text-[clamp(3rem,6.4vw,5.6rem)]">
                Um app só teu, na tua conta.
              </h2>
            </div>
            <p className="max-w-[38ch] text-[17px] leading-[1.55] text-[var(--pt-mute)]">
              Next.js 16, Supabase e Vercel. Abertura liberada mais o próximo fechamento vira uma sessão: daí saem o dia, a semana e os horários de pico.
            </p>
          </div>
          <ol className="grid border-t-2 border-[var(--pt-ink)] sm:grid-cols-2 lg:grid-cols-4">
            {SETUP.map((s, k) => (
              <li key={s.n} className="flex flex-col gap-3 border-b border-[var(--pt-line)] py-7 sm:pr-8 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0">
                <span className="pt-mono text-[13px] text-[var(--pt-acc)]">0{k + 1}</span>
                <h3 className="pt-display text-[2.6rem]">{s.n}</h3>
                <p className="text-[16px] leading-[1.55] text-[var(--pt-mute)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* fim da v1: o holofote segue o cursor e a seção ocupa a largura toda */}
      <Spotlight className="bg-[var(--pt-fog)] py-24 md:py-36" labelledBy="pt-end-h">
        <div className="pt-wrap flex flex-col items-start gap-8">
          <h2 id="pt-end-h" className="pt-hero-h1 max-w-[16ch] text-[clamp(2.4rem,6vw,4.6rem)] [text-wrap:balance]">
            O código tá aberto. Sobe o teu.
          </h2>
          <div className="flex flex-wrap gap-3">
            <a href={REPO} className="pt-btn pt-btn-sq bg-[var(--pt-acc)] text-[var(--pt-paper)] hover:bg-[var(--pt-acc-deep)]">
              <GithubLogo size={18} aria-hidden /> G4rutti/distract-quota
            </a>
            <a href={`${REPO}#1-supabase`} className="pt-btn pt-btn-sq border border-[var(--pt-line)] hover:border-[var(--pt-ink)]">
              Guia de instalação <ArrowUpRight size={18} aria-hidden />
            </a>
          </div>
        </div>
      </Spotlight>

      <footer className="bg-[var(--pt-paper)] text-[var(--pt-mute)]">
        <div className="pt-wrap"><div className="border-t border-[var(--pt-line)]" /></div>
        <div className="pt-wrap flex flex-col gap-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10 text-[14px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-[var(--pt-ink)]">Porteiro, feito por Davi Garutti.</span>
            <a href="/login" className="flex min-h-11 items-center underline underline-offset-4 hover:text-[var(--pt-ink)]">
              Já é teu? Entrar
            </a>
          </div>
          <p className="max-w-[80ch] leading-[1.6]">
            Técnicas de movimento estudadas no{" "}
            <a href="https://recent.design" className="underline underline-offset-4 hover:text-[var(--pt-ink)]">
              Recent Design
            </a>
            :{" "}
            {REFS.map((r, i) => (
              <span key={r.url}>
                <a href={r.url} className="underline underline-offset-4 hover:text-[var(--pt-ink)]">
                  {r.what}
                </a>{" "}
                ({r.who}){i < REFS.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </div>
      </footer>
    </>
  );
}
