"use client";

import Link from "next/link";
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
};

export default function AcademiaPostPage({
  initialPost,
}: {
  initialPost: AcademyPost;
  params: Promise<{ slug: string }>;
}) {
  const [post] = useState<AcademyPost | null>(initialPost);
  const [isLoading] = useState(false);

  function formatDate(date: string | null) {
    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar artigo...</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6">
        <section className="max-w-xl rounded-[32px] border border-[#DDE3EA] bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1683FF]">
            Arynqo Academy
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#07111F]">
            Artigo não encontrado.
          </h1>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            O artigo pode ter sido removido, arquivado ou ainda não estar
            publicado.
          </p>

          <Link
            href="/academia"
            className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            Voltar à Academia
          </Link>
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
            ← Voltar à Academia
          </Link>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-[#1683FF]/5 px-4 py-2 text-xs font-semibold text-[#1683FF]">
              {post.category}
            </span>

            <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
              {post.reading_time}
            </span>

            <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
              {post.audience}
            </span>

            {post.published_at && (
              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
                {formatDate(post.published_at)}
              </span>
            )}
          </div>

          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">
            {post.title}
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600">
            {post.excerpt}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
        <div className="rounded-[36px] border border-[#DDE3EA] bg-white p-7 shadow-[0_24px_80px_rgba(7,17,31,0.05)] md:p-10">
          <ArticleContent content={post.content} />
        </div>
      </article>

      <section className="mx-auto max-w-4xl px-6 pb-24 lg:px-12">
        <div className="rounded-[36px] bg-[#07111F] p-8 text-white md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4BB3FD]">
            Próximo passo
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em]">
            Aplica este conhecimento no teu percurso.
          </h2>

          <p className="mt-4 text-sm leading-6 text-white/70">
            Atualiza o teu perfil, melhora a tua candidatura ou explora novas
            oportunidades alinhadas com os teus objetivos.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
            >
              Ir para dashboard
            </Link>

            <Link
              href="/vagas"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explorar vagas
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ArticleContent({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-5">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return null;
        }

        if (trimmedLine.startsWith("## ")) {
          return (
            <h2
              key={`${trimmedLine}-${index}`}
              className="pt-6 text-3xl font-black tracking-[-0.05em] text-[#07111F]"
            >
              {trimmedLine.replace("## ", "")}
            </h2>
          );
        }

        if (trimmedLine.startsWith("### ")) {
          return (
            <h3
              key={`${trimmedLine}-${index}`}
              className="pt-4 text-2xl font-bold tracking-[-0.04em] text-[#07111F]"
            >
              {trimmedLine.replace("### ", "")}
            </h3>
          );
        }

        if (trimmedLine.startsWith("- ")) {
          return (
            <div
              key={`${trimmedLine}-${index}`}
              className="rounded-2xl bg-[#F7F9FC] px-5 py-3 text-sm leading-6 text-slate-700"
            >
              {trimmedLine.replace("- ", "• ")}
            </div>
          );
        }

        return (
          <p
            key={`${trimmedLine}-${index}`}
            className="text-base leading-8 text-slate-700"
          >
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );
}