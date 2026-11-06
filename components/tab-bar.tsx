"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLineUp, DeviceMobile, House } from "@phosphor-icons/react";

const TABS = [
  { href: "/", label: "Hoje", Icon: House },
  { href: "/apps", label: "Apps", Icon: DeviceMobile },
  { href: "/insights", label: "Insights", Icon: ChartLineUp },
];

// Some na porta e no login: ali a tela é uma coisa só.
const HIDDEN = [/^\/login/, /^\/entrar\//];

export function TabBar() {
  const pathname = usePathname();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-[460px] grid-cols-3">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`press relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] uppercase tracking-[0.06em] ${
                  active ? "font-semibold text-text" : "text-muted"
                }`}
              >
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-accent" aria-hidden />}
                <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
