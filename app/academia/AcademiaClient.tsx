"use client";
import { LText } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserRole = "student" | "company" | "admin" | null;

export type AcademyPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  audience: "Candidatos" | "Empresas" | "Todos";
  reading_time: string;
  featured: boolean;
  published_at: string | null;
};

const baseCategories = ["Todos"];

export default function AcademiaPage({initialPosts}:{initialPosts:AcademyPost[]}) {
  const [posts] = useState<AcademyPost[]>(initialPosts);
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [role, setRole] = useState<UserRole>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading] = useState(false);

  useEffect(() => {
    let active=true;
    async function loadSession(){
      const {data}=await supabase.auth.getSession();
      if(!active || !data.session)return;
      setIsAuthenticated(true);
      const {data:profile}=await supabase.from("profiles").select("role").eq("id",data.session.user.id).single();
      if(active)setRole((profile?.role as UserRole)||null);
    }
    void loadSession();
    return ()=>{active=false;};
  }, []);

  const categories = useMemo(() => {
    const dynamicCategories = Array.from(
      new Set(posts.map((post) => post.category).filter(Boolean))
    );

    return [...baseCategories, ...dynamicCategories];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeCategory === "Todos") {
      return posts;
    }

    return posts.filter((post) => post.category === activeCategory);
  }, [posts, activeCategory]);

  const featured = posts.filter(post => post.featured);
  const featuredPosts = (featured.length ? featured : posts).slice(0, 2);

  const cta = useMemo(() => {
    if (!isAuthenticated) {
      return {
        title: "Começa a construir o teu percurso profissional.",
        text: "Cria conta na ARYNQO, melhora o teu perfil e encontra oportunidades alinhadas com os teus objetivos.",
        href: "/registo",
        label: "Criar conta",
      };
    }

    if (role === "company") {
      return {
        title: "Transforma conhecimento em melhores contratações.",
        text: "Usa a Arynqo Academy para melhorar vagas, processos de triagem e comunicação com candidatos.",
        href: "/empresa/vagas/nova",
        label: "Publicar vaga",
      };
    }

    return {
      title: "Aplica estas dicas diretamente no teu perfil.",
      text: "Atualiza o teu perfil profissional, melhora as tuas skills e aumenta a qualidade dos teus matches.",
      href: "/dashboard/perfil",
      label: "Melhorar perfil",
    };
  }, [isAuthenticated, role]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar Arynqo Academy..."} /></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#07111F]">
      <section className="relative overflow-hidden border-b border-[#DDE3EA] bg-white">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#1683FF]/10 blur-3xl" />
        <div className="absolute right-0 top-24 h-[360px] w-[360px] rounded-full bg-[#4BB3FD]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center lg:px-12">
          <p className="mx-auto inline-flex rounded-full border border-[#1683FF]/15 bg-[#1683FF]/5 px-5 py-2 text-sm font-semibold text-[#1683FF]">
            <LText text={"Arynqo Academy"} /></p>

          <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#07111F] md:text-7xl">
            <LText text={"Aprende a candidatar-te melhor."} /></h1>

          <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
            <LText text={"Guias, dicas e recursos para melhorares o teu CV, preparares candidaturas, evoluíres profissionalmente e acompanhares Tendências de Recrutamento."} /></p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="#artigos"
              className="rounded-full bg-[#07111F] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
            >
              <LText text={"Explorar artigos"} /></Link>

            <Link
              href={isAuthenticated ? "/dashboard" : "/registo"}
              className="rounded-full border border-[#DDE3EA] bg-white px-8 py-4 text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]"
            >
              <LText text={isAuthenticated ? "Ir para dashboard" : "Criar conta"} />
            </Link>
          </div>
        </div>
      </section>

      {featuredPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1683FF]">
              <LText text={"Em destaque"} /></p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              <LText text={"Começa por aqui"} /></h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {featuredPosts.map((post) => (
              <FeaturedArticleCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      <section
        id="artigos"
        className="mx-auto max-w-7xl px-6 pb-20 lg:px-12"
      >
        <div className="mb-8 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1683FF]">
            <LText text={"Biblioteca"} /></p>

          <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
            <LText text={"Artigos e recursos"} /></h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                  activeCategory === category
                    ? "border-[#1683FF] bg-[#1683FF] text-white"
                    : "border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF] hover:text-[#1683FF]"
                }`}
              >
                <LText text={category} />
              </button>
            ))}
          </div>
        </div>

        {filteredPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              <LText text={"Ainda não existem artigos nesta categoria."} /></h2>

            <p className="mt-3 text-sm text-slate-500">
              <LText text={"Novos conteúdos serão publicados regularmente na Arynqo Academy."} /></p>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-12">
        <div className="overflow-hidden rounded-[40px] bg-[#07111F] p-10 text-white shadow-[0_30px_100px_rgba(7,17,31,0.18)] md:p-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4BB3FD]">
                <LText text={"Próximo passo"} /></p>

              <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.05em] md:text-5xl">
                <LText text={cta.title} />
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
                <LText text={cta.text} />
              </p>
            </div>

            <Link
              href={cta.href}
              className="inline-flex justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
            >
              <LText text={cta.label} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeaturedArticleCard({ post }: { post: AcademyPost }) {
  return (
    <Link
      href={`/academia/${post.slug}`}
      className="group overflow-hidden rounded-[36px] border border-[#DDE3EA] bg-[#07111F] p-8 text-white shadow-[0_24px_80px_rgba(7,17,31,0.10)] transition hover:-translate-y-1 hover:shadow-[0_30px_100px_rgba(7,17,31,0.16)]"
    >
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-[#4BB3FD]">
          <LText text={post.category} />
        </span>

        <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/70">
          <LText text={post.reading_time} />
        </span>

        <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white/70">
          <LText text={post.audience} />
        </span>
      </div>

      <h3 className="mt-8 text-3xl font-black tracking-[-0.04em]">
        <LText text={post.title} />
      </h3>

      <p className="mt-4 text-sm leading-6 text-white/65"><LText text={post.excerpt} /></p>

      <div className="mt-8 inline-flex text-sm font-semibold text-white transition group-hover:text-[#4BB3FD]">
        <LText text={"Ler artigo →"} /></div>
    </Link>
  );
}

function ArticleCard({ post }: { post: AcademyPost }) {
  return (
    <Link
      href={`/academia/${post.slug}`}
      className="group rounded-[32px] border border-[#DDE3EA] bg-white p-7 shadow-[0_24px_80px_rgba(7,17,31,0.04)] transition hover:-translate-y-1 hover:border-[#1683FF]/30 hover:shadow-[0_28px_90px_rgba(7,17,31,0.08)]"
    >
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#1683FF]/5 px-4 py-2 text-xs font-semibold text-[#1683FF]">
          <LText text={post.category} />
        </span>

        <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-500">
          <LText text={post.reading_time} />
        </span>
      </div>

      <h3 className="mt-6 text-2xl font-black tracking-[-0.04em] text-[#07111F] transition group-hover:text-[#1683FF]">
        <LText text={post.title} />
      </h3>

      <p className="mt-4 text-sm leading-6 text-slate-600"><LText text={post.excerpt} /></p>

      <div className="mt-7 flex items-center justify-between">
        <span className="rounded-full border border-[#DDE3EA] px-4 py-2 text-xs font-semibold text-slate-500">
          <LText text={post.audience} />
        </span>

        <span className="text-sm font-semibold text-[#1683FF]"><LText text={"Ler →"} /></span>
      </div>
    </Link>
  );
}