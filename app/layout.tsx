import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { TabBar } from "@/components/tab-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Porteiro",
  description: "Redes sociais só entram passando por aqui. Tempo de tela, hábitos, diário e insights.",
  appleWebApp: { capable: true, title: "Porteiro", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-[100dvh]">
        {/* pb grande pra nada ficar escondido atrás da barra de abas */}
        <div className="mx-auto w-full max-w-[460px] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  );
}
