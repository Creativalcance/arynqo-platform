"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    id: String(post.id || post.slug || crypto.randomUUID()),
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
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function AppAcademiaPage() {
  const [posts, setPosts] = useState<AcademyPost[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    loadAcademyPosts();
  }, []);

  async function loadAcademyPosts() {
    setIsLoading(true);
    setStatusMessage("");

    const { data, error } = await supabase
      .from("academy_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
      setPosts([]);
      setStatusMessage(
        "Não foi possível carregar os conteúdos da ARYNQO Academy na APP. Podes abrir a versão web.",
      );
      setIsLoading(false);
      return;
    }

    const normalizedPosts = ((data || []) as RawAcademyPost[])
      .map(normalizePost)
      .filter((post) => post.slug && post.is_published !== false);

    setPosts(normalizedPosts);
    setIsLoading(false);
  }

  const categories = useMemo(() => {
    const values = posts
      .map((post) => post.category)
      .filter((category): category is string => Boolean(category));

    return ["Todas", ...Array.from(new Set(values)).sort()];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === "Todas" || post.category === activeCategory;

      const searchableText = [
        post.title,
        post.excerpt || "",
        post.content || "",
        post.category || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(search.toLowerCase().trim());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, posts, search]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
        <section className="mx-auto w-full max-w-md">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-64 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-44 animate-pulse rounded-[2rem] bg-white/10" />
          <div className="mt-5 h-36 animate-pulse rounded-3xl bg-white/10" />
          <div className="mt-4 h-36 animate-pulse rounded-3xl bg-white/10" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-28">
        <header>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
                ARYNQO
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Academy
              </h1>
            </div>

            <button
              type="button"
              onClick={loadAcademyPosts}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
            >
              Atualizar
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/58">
            Conteúdos da ARYNQO Academy para desenvolvimento profissional,
            talento, empregabilidade, recrutamento e evolução de carreira.
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
          <p className="text-sm text-cyan-100">ARYNQO Academy</p>

          <h2 className="mt-2 text-xl font-semibold">
            Aprendizagem aplicada ao talento
          </h2>

          <p className="mt-3 text-sm leading-6 text-white/60">
            A Academy liga conhecimento, IA, recrutamento e mercado de trabalho
            numa experiência integrada dentro da plataforma.
          </p>

         <div className="mt-5 grid grid-cols-2 gap-3">
  <Link
    href="/academia"
    className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
  >
    Abrir versão web
  </Link>

  <Link
    href="/app"
    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
  >
    Voltar à APP
  </Link>
</div>
        </section>

        {statusMessage && (
          <section className="mt-5 rounded-3xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
            <p className="text-sm leading-6 text-amber-100/80">
              {statusMessage}
            </p>
          </section>
        )}

        <section className="sticky top-0 z-10 -mx-5 mt-6 border-b border-white/10 bg-[#050816]/92 px-5 pb-4 pt-2 backdrop-blur-xl">
          <label htmlFor="academy-search" className="sr-only">
            Pesquisar conteúdos
          </label>

          <input
            id="academy-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar conteúdos da Academy..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/50 focus:bg-white/[0.08]"
          />

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={
                    isActive
                      ? "shrink-0 rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold text-[#06111f]"
                      : "shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  }
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 space-y-4">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/app/academia/${post.slug}`}
              className="block rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
            >
              {post.cover_image_url && (
                <div className="mb-4 h-40 overflow-hidden rounded-2xl bg-white/10">
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
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

              <h2 className="mt-3 text-lg font-semibold tracking-tight">
                {post.title}
              </h2>

              {post.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/58">
                  {post.excerpt}
                </p>
              )}

              <p className="mt-4 text-sm font-medium text-cyan-300">
                Ler conteúdo →
              </p>
            </Link>
          ))}

          {filteredPosts.length === 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center">
              <h2 className="text-base font-semibold">
                Sem conteúdos encontrados
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/55">
                Experimenta limpar a pesquisa ou abrir a versão web da ARYNQO
                Academy.
              </p>

              <Link
                href="/academia"
                className="mt-5 inline-flex rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
              >
                Abrir Academy web
              </Link>
            </section>
          )}
        </section>

        <MobileBottomNav />
      </section>
    </main>
  );
}