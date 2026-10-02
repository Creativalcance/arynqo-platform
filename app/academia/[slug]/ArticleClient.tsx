"use client";
import AcademyContent from "@/app/components/arynqo/AcademyContent";
import { LText, useI18n } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { useState } from "react";

export type AcademyPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  audience: "Candidatos" | "Empresas" | "Todos";
  reading_time: string;
  published_at: string | null;
  author_name?: string;
  editorial_sources?: {url:string;checked_at:string}[];
};

export default function AcademiaPostPage({
  initialPost,
}: {
  initialPost: AcademyPost;
  params: Promise<{ slug: string }>;
}) {
  const { locale: displayLocale } = useI18n();
  const [post] = useState<AcademyPost | null>(initialPost);
  const [isLoading] = useState(false);

  function formatDate(date: string | null) {
    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(displayLocale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar artigo..."} /></p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6">
        <section className="max-w-xl rounded-[32px] border border-[#DDE3EA] bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1683FF]">
            <LText text={"Arynqo Academy"} /></p>

          <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#07111F]">
            <LText text={"Artigo não encontrado."} /></h1>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            <LText text={"O artigo pode ter sido removido, arquivado ou ainda não estar publicado."} /></p>

          <Link
            href="/academia"
            className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            <LText text={"Voltar à Academia"} /></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#07111F]">
      <section className="relative overflow-hidden border-b border-[#DDE3EA] bg-white">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#1683FF]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center lg:px-12">
          <Link
            href="/academia"
            className="inline-flex rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
          >
            <LText text={"← Voltar à Academia"} /></Link>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-[#1683FF]/5 px-4 py-2 text-xs font-semibold text-[#1683FF]">
              <LText text={post.category} />
            </span>

            <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
              <LText text={post.reading_time} />
            </span>

            <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
              <LText text={post.audience} />
            </span>

            {post.published_at && (
              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
                <LText text={formatDate(post.published_at)} />
              </span>
            )}
          </div>

          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
            <LText text={post.title} />
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600">
            <LText text={post.excerpt} />
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
        <div className="rounded-[36px] border border-[#DDE3EA] bg-white p-7 shadow-[0_24px_80px_rgba(7,17,31,0.05)] md:p-10">
          <AcademyContent content={post.content} />
          <p className="mt-8 text-sm text-slate-500">{post.author_name || "ARYNQO Editorial"}</p>
          {!!post.editorial_sources?.length && <ul className="mt-4 list-disc space-y-2 pl-6 text-sm">{post.editorial_sources.map(source => <li key={source.url}><a className="break-all text-blue-700 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a></li>)}</ul>}
        </div>
      </article>

      <section className="mx-auto max-w-4xl px-6 pb-24 lg:px-12">
        <div className="rounded-[36px] bg-[#07111F] p-8 text-white md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4BB3FD]">
            <LText text={"Próximo passo"} /></p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            <LText text={post.audience === "Empresas" ? "Transforma conhecimento em melhores contratações." : "Aplica este conhecimento no teu percurso."} /></h2>

          <p className="mt-4 text-sm leading-6 text-white/70">
            <LText text={post.audience === "Empresas" ? "Publica uma vaga e encontra talento para a tua equipa." : "Atualiza o teu perfil, melhora a tua candidatura ou explora novas oportunidades alinhadas com os teus objetivos."} /></p>

          <div className="mt-7 flex flex-wrap gap-3">
            {post.audience !== "Empresas" && <Link
              href="/vagas"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
            >
              <LText text={"Explorar oportunidades"} /></Link>}

            {post.audience !== "Candidatos" && <Link
              href="/empresa/vagas/nova"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <LText text={"Publicar uma vaga"} /></Link>}
          </div>
        </div>
      </section>
    </main>
  );
}
