import { TabBar } from "@/components/tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* pb grande pra nada ficar escondido atrás da barra de abas */}
      <div className="mx-auto w-full max-w-[460px] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        {children}
      </div>
      <TabBar />
    </>
  );
}
