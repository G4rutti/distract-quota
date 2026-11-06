import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

// Selo de referência: cada técnica de motion da página aponta pra peça original no Recent Design (antigo Godly).
export type RefItem = { what: string; who: string; url: string };

export const REFS = {
  clocks: { what: "Time", who: "A. L. Crego", url: "https://recent.design/i/3vq05qv-time" },
  roll: { what: "Infinite Scroll", who: "Phi Hoang", url: "https://recent.design/i/bky6wkw-infinite-scroll-3d-concept" },
  toasts: { what: "X Toasts", who: "Benji Taylor", url: "https://recent.design/i/snf2gf0-x-toasts" },
  words: { what: "Profound", who: "Profound", url: "https://recent.design/i/q4fzfg0-profound-website-redesign" },
  dots: { what: "Dotted Countdown", who: "davidope", url: "https://recent.design/i/cqt5k5j-dotted-countdown" },
  ruler: { what: "YES", who: "Contemporary Type", url: "https://recent.design/i/4m1bbar-kinetic-type-reel" },
} satisfies Record<string, RefItem>;

export function Ref({ item, tone = "light", className = "" }: { item: RefItem; tone?: "light" | "dark" | "red"; className?: string }) {
  const color =
    tone === "dark"
      ? "border-[var(--pt-line-dark)] text-[var(--pt-mute-dark)] hover:border-[var(--pt-paper)] hover:text-[var(--pt-paper)]"
      : tone === "red"
        ? "border-[oklch(0.16_0.01_30/0.35)] text-[var(--pt-ink)] hover:border-[var(--pt-ink)]"
        : "border-[var(--pt-line)] text-[var(--pt-mute)] hover:border-[var(--pt-ink)] hover:text-[var(--pt-ink)]";
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className={`pt-label inline-flex min-h-9 w-fit items-center gap-2 rounded-full border px-3 transition-colors duration-200 ${color} ${className}`}
      aria-label={`Referência: ${item.what}, de ${item.who}, no Recent Design`}
    >
      <span className="font-semibold">Ref</span>
      <span aria-hidden>·</span>
      <span className="normal-case tracking-normal">
        {item.what} <span className="opacity-70">por {item.who}</span>
      </span>
      <ArrowUpRight size={12} weight="bold" aria-hidden />
    </a>
  );
}
