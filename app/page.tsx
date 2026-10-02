
import { LText, LElement } from "@/lib/i18n/client";
import Link from "@/lib/i18n/link";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import AcademyHighlights from "@/app/components/arynqo/AcademyHighlights";
export async function generateMetadata() { return await pageMetadata("Emprego e recrutamento internacional", "Descobre oportunidades de emprego e liga o teu perfil às necessidades das empresas. Conhece o recrutamento com apoio de IA da ARYNQO.", "/"); }
export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#F7F9FC]">
      <section className="relative border-b border-neutral-200 bg-gradient-to-b from-white to-[#F7F9FC]">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-28 text-center lg:px-12">
          <div className="rounded-full border border-blue-100 bg-blue-50 px-5 py-2 text-sm font-medium text-blue-700">
            <LText text={"Plataforma inteligente de recrutamento e evolução profissional"} /></div>

          <h1 className="mt-8 max-w-5xl text-4xl sm:text-6xl font-black tracking-[-0.06em] text-[#07111F] md:text-7xl">
            <LText text={"Onde o talento se desenvolve."} /></h1>

          <p className="mt-8 max-w-3xl text-xl leading-relaxed text-neutral-600">
            <LText text={"A ARYNQO liga estudantes, profissionais e empresas através de uma plataforma onde podes pesquisar vagas, apresentar competências e consultar recomendações com apoio de IA."} /></p>

          <LElement as="form" action="/vagas" className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"><label htmlFor="home-search" className="sr-only"><LText text={"Função, área ou localização"} /></label><LElement as="input" id="home-search" name="q" placeholder="Função, área ou localização" className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-4"/><button className="rounded-2xl bg-[#07111F] px-6 py-4 font-semibold text-white"><LText text={"Pesquisar vagas"} /></button></LElement>
          <p className="mt-5"><Link href="/empresas" className="font-semibold text-blue-700 underline underline-offset-4"><LText text={"Quero recrutar: conhecer a solução para empresas"} /></Link></p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/vagas"
              className="rounded-full bg-[#07111F] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
            >
              <LText text={"Explorar vagas"} /></Link>

            <Link
              href="/registo"
              className="rounded-full border border-neutral-300 bg-white px-8 py-4 text-sm font-semibold transition hover:bg-neutral-100"
            >
              <LText text={"Criar conta"} /></Link>
          </div>

          <div className="mt-24 grid w-full max-w-6xl gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-sm font-medium text-blue-600"><LText text={"Estudantes"} /></p>

              <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-[#07111F]">
                <LText text={"Começa a construir o teu futuro"} /></h2>

              <p className="mt-4 leading-relaxed text-neutral-600">
                <LText text={"Cria um perfil profissional moderno, descobre oportunidades relevantes e dá os primeiros passos no mercado com mais clareza, confiança e direção."} /></p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-sm font-medium text-blue-600">
                <LText text={"Profissionais"} /></p>

              <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-[#07111F]">
                <LText text={"Evolui para a próxima oportunidade"} /></h2>

              <p className="mt-4 leading-relaxed text-neutral-600">
                <LText text={"Valoriza a tua experiência, identifica novas possibilidades de carreira e encontra oportunidades alinhadas com as tuas competências e ambição."} /></p>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-[#07111F] p-8 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-sm font-medium text-blue-300">
                <LText text={"Empresas & Universidades"} /></p>

              <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em]">
                <LText text={"Liga talento, conhecimento e mercado"} /></h2>

              <p className="mt-4 leading-relaxed text-blue-100">
                <LText text={"Aproxima organizações, instituições de ensino e talento qualificado através de uma plataforma preparada para recrutamento, IA, empregabilidade e evolução profissional."} /></p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-[32px] border border-neutral-200 bg-white p-10 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-sm font-medium text-blue-600">
              <LText text={"Para estudantes e profissionais"} /></p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#07111F]">
              <LText text={"Muito mais do que candidaturas"} /></h2>

            <p className="mt-5 max-w-2xl leading-relaxed text-neutral-600">
              <LText text={"A ARYNQO ajuda cada pessoa a transformar o seu percurso num perfil profissional claro, atrativo e preparado para novas oportunidades."} /></p>

            <div className="mt-8 grid gap-5">
              <FeatureItem text="Cria o teu perfil com um clique" />
              <FeatureItem text="Perfil profissional moderno e inteligente" />
              <FeatureItem text="Matching com as melhores vagas" />
              <FeatureItem text="Candidaturas rápidas e simples" />
              <FeatureItem text="Notificações em tempo real" />
            </div>
          </div>

          <div className="rounded-[32px] border border-neutral-200 bg-[#07111F] p-10 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-sm font-medium text-blue-300">
              <LText text={"Para empresas e universidades"} /></p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight">
              <LText text={"Recrutamento inteligente"} /></h2>

            <p className="mt-5 max-w-2xl leading-relaxed text-blue-100">
              <LText text={"Uma plataforma criada para aproximar talento, empresas e instituições de ensino através de processos mais rápidos, dados mais úteis e IA aplicada ao recrutamento."} /></p>

            <div className="mt-8 grid gap-5">
              <DarkFeatureItem text="Cria o perfil da organização com um clique" />
              <DarkFeatureItem text="Publicação de vagas em 90 segundos" />
              <DarkFeatureItem text="Análise inteligente de perfis" />
              <DarkFeatureItem text="Matching com candidatos qualificados" />
              <DarkFeatureItem text="Gestão integrada de candidatos" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">ARYNQO Academy</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-[#07111F] sm:text-4xl">
            <LText text="O próximo passo na tua carreira começa aqui." />
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            <LText text="Conselhos práticos sobre emprego, candidaturas e recrutamento, para candidatos e empresas." />
          </p>
          <Suspense fallback={<div className="mt-8 h-60 animate-pulse rounded-3xl bg-slate-100 motion-reduce:animate-none" aria-hidden="true" />}>
            <AcademyHighlights />
          </Suspense>
          <Link href="/academia" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#07111F] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
            <LText text="Explorar a Academy" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28 lg:px-12">
        <div className="rounded-[40px] bg-[#07111F] px-10 py-20 text-center text-white">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-300">
            <LText text={"ARYNQO"} /></p>

          <h2 className="mt-6 text-5xl font-black tracking-[-0.05em]">
            <LText text={"The next step starts here."} /></h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-blue-100">
            <LText text={"Junta-te à nova plataforma de recrutamento, talento e evolução profissional."} /></p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/registo"
              className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-neutral-100"
            >
              <LText text={"Criar conta"} /></Link>

            <Link
              href="/vagas"
              className="rounded-full border border-white/20 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <LText text={"Explorar vagas"} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
      <div className="h-3 w-3 rounded-full bg-[#1683FF]" />

      <p className="font-medium text-neutral-700"><LText text={text} /></p>
    </div>
  );
}

function DarkFeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <div className="h-3 w-3 rounded-full bg-[#4BB3FD]" />

      <p className="font-medium text-blue-50"><LText text={text} /></p>
    </div>
  );
}
