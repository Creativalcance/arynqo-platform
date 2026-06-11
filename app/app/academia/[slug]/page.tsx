"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MobileBottomNav from "@/app/components/arynqo/MobileBottomNav";
import { supabase } from "@/lib/supabase";

type AcademyPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  cover_image_url: string | null;
  is_published: boolean | null;
  created_at: string | null;
};

type RawAcademyPost = Partial<AcademyPost> & {
  published?: boolean | null;
  summary?: string | null;
  ai_summary?: string | null;
  image_url?: string | null;
};

function normalizePost(post: RawAcademyPost): AcademyPost {
  return {
    id: String(post.id || post.slug || ""),
    slug: String(post.slug || post.id || ""),
    title: String(post.title || "Conteúdo ARYNQO Academy"),
    excerpt: post.excerpt || post.summary || post.ai_summary || null,
    content: post.content || null,
    category: post.category || null,
    cover_image_url: post.cover_image_url || post.image_url || null,
    is_published:
      typeof post.is_published === "boolean"
        ? post.is_published
        : typeof post.published === "boolean"
          ? post.published
          : true,
    created_at: post.created_at || null,
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function AppAcademiaDetailPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<AcademyPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    loadPost();
  }, [params.slug]);

  async function loadPost() {
    setIsLoading(true);
    setStatusMessage("");

    const { data, error } = await supabase
      .from("academy_posts")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) {
      console.error(error);
      setPost(null);
      setStatusMessage(
        "Não foi possível carregar este conteúdo na APP. Podes abrir a versão web.",
      );
      setIsLoading(false);
      return;
    }

    if (!data) {
      setPost(null);
      setIsLoading(false);
      return;
    }

    const normalizedPost = normalizePost(data as RawAcademyPost);

    if (normalizedPost.is_published === false) {
      setPost(null);
      setIsLoading(false);
      return;
    }

    setPost(normalizedPost);
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
        <section className="mx-auto w-full max-w-md">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-64 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-56 animate-pulse rounded-[2rem] bg-white/10" />
          <div className="mt-5 h-60 animate-pulse rounded-3xl bg-white/10" />
        </section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-6 pb-28">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            ARYNQO
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Conteúdo não encontrado
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/60">
            {statusMessage ||
              "Este conteúdo da ARYNQO Academy não está disponível na APP."}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link
              href="/app/academia"
              className="rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
            >
              Voltar
            </Link>

            <Link
              href={`/academia/${params.slug}`}
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
            >
              Ver web
            </Link>
          </div>
        </section>

        <MobileBottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-28">
        <header>
          <Link
            href="/app/academia"
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            ← Voltar à Academy
          </Link>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            ARYNQO Academy
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {post.category && (
              <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1 text-xs text-cyan-100">
                {post.category}
              </span>
            )}

            {post.created_at && (
              <span className="text-xs text-white/35">
                {formatDate(post.created_at)}
              </span>
            )}
          </div>
        </header>

        {post.cover_image_url && (
          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="h-64 w-full object-cover"
            />
          </section>
        )}

        {post.excerpt && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-sm leading-6 text-cyan-50/85">
              {post.excerpt}
            </p>
          </section>
        )}

        <article className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="whitespace-pre-line text-sm leading-7 text-white/70">
            {post.content || "Conteúdo ainda sem corpo disponível."}
          </p>
        </article>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href={`/academia/${post.slug}`}
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
          >
            Abrir versão web
          </Link>

          <Link
            href="/app/academia"
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
          >
            Mais conteúdos
          </Link>
        </section>

        <MobileBottomNav />
      </section>
    </main>
  );
}