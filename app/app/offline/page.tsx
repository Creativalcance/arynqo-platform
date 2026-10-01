
import { LText } from "@/lib/i18n/client";
import Link from "@/lib/i18n/link";

export default function AppOfflinePage() {
  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
          <LText text={"ARYNQO"} /></p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          <LText text={"Estás offline"} /></h1>

        <p className="mt-4 text-sm leading-6 text-white/60">
          <LText text={"Não foi possível ligar à plataforma neste momento. Verifica a tua ligação à internet e tenta novamente."} /></p>

        <Link
          href="/app"
          className="mt-8 rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
        >
          <LText text={"Voltar à APP"} /></Link>
      </section>
    </main>
  );
}