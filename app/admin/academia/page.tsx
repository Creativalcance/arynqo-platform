"use client";
import { localizedAlert, localizedConfirm } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { academyCopy } from "@/lib/academy/admin-copy";
import { LText, LElement, useI18n } from "@/lib/i18n/client";


import AutomationPanel from "./components/AutomationPanel";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

import Link from "@/lib/i18n/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AcademyPostStatus = "draft" | "published" | "archived";

type AcademyPost = {
  multilingual: boolean;
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  audience: "Candidatos" | "Empresas" | "Todos";
  reading_time: string;
  featured: boolean;
  status: AcademyPostStatus;
  source_type: "manual" | "ai" | "trend_ai";
  trend_topic: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
};

const categories = [
  "CV e Perfil",
  "Candidaturas",
  "Entrevistas",
  "Primeiro Emprego",
  "Carreira",
  "Skills",
  "IA e Matching",
  "Empresas e Recrutamento",
];

const audiences: Array<"Candidatos" | "Empresas" | "Todos"> = [
  "Candidatos",
  "Empresas",
  "Todos",
];

export default function AdminAcademiaPage() {
  const {locale}=useI18n();
  const [posts, setPosts] = useState<AcademyPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Carreira");
  const [audience, setAudience] =
    useState<"Candidatos" | "Empresas" | "Todos">("Candidatos");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAudience, setEditAudience] =
    useState<"Candidatos" | "Empresas" | "Todos">("Candidatos");
  const [readingTime, setReadingTime] = useState("");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<AcademyPostStatus>("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");


  const selectedPost = useMemo(() => {
    return posts.find((post) => post.id === selectedPostId) || null;
  }, [posts, selectedPostId]);

  const selectPost = useCallback((post: AcademyPost) => {
    setSelectedPostId(post.id);
    setTitle(post.title || "");
    setSlug(post.slug || "");
    setExcerpt(post.excerpt || "");
    setContent(post.content || "");
    setEditCategory(post.category || "Carreira");
    setEditAudience(post.audience || "Candidatos");
    setReadingTime(post.reading_time || "5 min");
    setFeatured(Boolean(post.featured));
    setStatus(post.status || "draft");
    setSeoTitle(post.seo_title || "");
    setSeoDescription(post.seo_description || "");
  }, []);

  const loadPosts = useCallback(async (selectInitial = false) => {
    const { data, error } = await supabase
      .from("academy_posts")
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        content,
        category,
        audience,
        reading_time,
        featured,
        status,
        source_type,
        multilingual,
        trend_topic,
        seo_title,
        seo_description,
        published_at,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      localizedAlert(error.message);
      setPosts([]);
      return;
    }

    const currentPosts = (data || []) as AcademyPost[];
    setPosts(currentPosts);

    if (selectInitial && currentPosts.length > 0) {
      const requestedId = new URLSearchParams(window.location.search).get("post");
      selectPost(currentPosts.find((post) => post.id === requestedId) || currentPosts[0]);
    }
  }, [selectPost]);


  useEffect(() => {
    let active = true;
    async function loadAdminPage() {
const { data: sessionData } = await supabase.auth.getSession();
    if (!active) return;

    if (!sessionData.session) {
      const returnPath = window.location.pathname + window.location.search;
      window.location.href = browserLocalizedPath("/login") + "?next=" + encodeURIComponent(returnPath);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionData.session.user.id)
      .single();
    if (!active) return;

    if (profileData?.role !== "admin") {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);
    await loadPosts(true);
    setIsLoading(false);
  }

    void loadAdminPage();
    return () => { active = false; };
  }, [loadPosts]);


  async function generatePost(generateFromTrend: boolean) {
    setIsGenerating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        window.location.href = browserLocalizedPath("/login");
        return;
      }

      const response = await authenticatedFetch("/api/ai/academy-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          topic,
          category,
          audience,
          generateFromTrend,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        post?: AcademyPost;
      };

      if (!response.ok || !data.success || !data.post) {
        localizedAlert(data.error || "Não foi possível gerar o artigo.");
        setIsGenerating(false);
        return;
      }

      await loadPosts();
      selectPost(data.post);
      setTopic("");

      localizedAlert("Artigo gerado como rascunho. Revê antes de publicar.");
    } catch (error) {
      console.error(error);
      localizedAlert("Erro ao gerar artigo com IA.");
    }

    setIsGenerating(false);
  }

  async function savePost() {
    if (!selectedPostId) {
      return;
    }
    if (status === "published" && selectedPost?.status !== "published" && !localizedConfirm(academyCopy(locale, "publicationConfirm"))) return;

    setIsSaving(true);

    const nextStatus = status;
    const publishedAt =
      nextStatus === "published"
        ? selectedPost?.published_at || new Date().toISOString()
        : selectedPost?.published_at || null;

    const { error } = await supabase
      .from("academy_posts")
      .update({
        title,
        slug,
        excerpt,
        content,
        category: editCategory,
        audience: editAudience,
        reading_time: readingTime,
        featured,
        status: nextStatus,
        seo_title: seoTitle,
        seo_description: seoDescription,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPostId);

    setIsSaving(false);

    if (error) {
      localizedAlert(error.message);
      return;
    }

    await loadPosts();
    await requestEmailDelivery();
    localizedAlert("Artigo guardado com sucesso.");
  }

  async function quickUpdateStatus(nextStatus: AcademyPostStatus) {
    if (!selectedPostId) {
      return;
    }
    if (nextStatus === "published" && selectedPost?.status !== "published" && !localizedConfirm(academyCopy(locale, "publicationConfirm"))) return;

    setStatus(nextStatus);

    const publishedAt =
      nextStatus === "published"
        ? selectedPost?.published_at || new Date().toISOString()
        : selectedPost?.published_at || null;

    const { error } = await supabase
      .from("academy_posts")
      .update({
        status: nextStatus,
        published_at: publishedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPostId);

    if (error) {
      localizedAlert(error.message);
      return;
    }

    await loadPosts();
    await requestEmailDelivery();
  }

  async function requestEmailDelivery() {
    // The database has already saved the durable event. The cron resumes if this wake-up fails.
    try {
      await authenticatedFetch("/api/admin/academy-automation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deliver_emails" }),
      });
    } catch { /* Publication is saved; delivery remains queued. */ }
  }

  function getStatusLabel(value: AcademyPostStatus) {
    if (value === "draft") {
      return "Rascunho";
    }

    if (value === "published") {
      return "Publicado";
    }

    return "Arquivado";
  }

  function getSourceLabel(value: AcademyPost["source_type"]) {
    if (value === "trend_ai") {
      return "Trend + IA";
    }

    if (value === "ai") {
      return "IA";
    }

    return "Manual";
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const textareaClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar Academia Admin..."} /></p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6">
        <section className="max-w-xl rounded-[32px] border border-[#DDE3EA] bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-black tracking-[-0.05em] text-[#07111F]">
            <LText text={"Acesso reservado."} /></h1>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            <LText text={"Apenas administradores podem gerir artigos da Arynqo Academy."} /></p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            <LText text={"Voltar ao dashboard"} /></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-7xl">
        <AutomationPanel onChanged={loadPosts} />
        <section className="mb-8 overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  <LText text={"Admin Academia"} /></p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  <LText text={"Gerir artigos."} /></h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  <LText text={"Gere conteúdos, cria rascunhos com IA, revê artigos e publica recursos na Arynqo Academy."} /></p>
              </div>

              <Link
                href="/academia"
                className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
              >
                <LText text={"Ver Academia"} /></Link>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
            <LText text={"Geração IA"} /></p>

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            <LText text={"Criar novo artigo"} /></h2>

          <div className="mt-6 grid gap-5 md:grid-cols-[1fr_220px_180px]">
            <div>
              <label className="text-sm font-semibold">
                <LText text={"Tema específico opcional"} /></label>

              <LElement as="input"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Ex: Como criar um CV para sistemas ATS"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-semibold"><LText text={"Categoria"} /></label>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    <LText text={item} />
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold"><LText text={"Público"} /></label>

              <select
                value={audience}
                onChange={(event) =>
                  setAudience(
                    event.target.value as "Candidatos" | "Empresas" | "Todos"
                  )
                }
                className={inputClass}
              >
                {audiences.map((item) => (
                  <option key={item} value={item}>
                    <LText text={item} />
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => generatePost(false)}
              disabled={isGenerating}
              className="rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LText text={isGenerating ? "A gerar..." : "Gerar artigo com IA"} />
            </button>

            <button
              type="button"
              onClick={() => generatePost(true)}
              disabled={isGenerating}
              className="rounded-full border border-[#DDE3EA] bg-white px-6 py-3 text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LText text={"Gerar com trend sugerida"} /></button>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <aside className="rounded-[32px] border border-[#DDE3EA] bg-white p-4 shadow-[0_24px_80px_rgba(7,17,31,0.06)] lg:sticky lg:top-32 lg:self-start">
            <div className="mb-4 px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Artigos"} /></p>

              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                {posts.length} <LText text={" artigos"} /></h2>
            </div>

            <div className="space-y-3">
              {posts.map((post) => {
                const isActive = selectedPostId === post.id;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => selectPost(post)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? "border-[#1683FF] bg-[#1683FF]/5"
                        : "border-transparent bg-[#F7F9FC] hover:border-[#DDE3EA] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-[#07111F]">
                          <LText text={post.title} />
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          <LText text={post.category} /> · <LText text={post.reading_time} />
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                        <LText text={getStatusLabel(post.status)} />
                      </span>
                    </div>

                    <p className="mt-3 text-[11px] font-medium text-[#1683FF]">
                      <LText text={getSourceLabel(post.source_type)} />
                    </p>
                  </button>
                );
              })}

              {posts.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-[#DDE3EA] p-6 text-center">
                  <p className="text-sm text-slate-500">
                    <LText text={"Ainda não existem artigos."} /></p>
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
            {selectedPost?.multilingual ? (
              <section className="rounded-3xl border bg-white p-6"><p className="text-sm leading-6">{academyCopy(locale,"originalNotice")}</p><a href="#academy-automation" className="mt-4 inline-block text-blue-700 underline">{academyCopy(locale,"edit")}</a><div className="mt-4 flex gap-3"><button className="rounded-full border px-5 py-3" disabled={isSaving} onClick={()=>quickUpdateStatus("archived")}><LText text="Arquivar" /></button>{selectedPost.status==="archived"&&<button className="rounded-full border px-5 py-3" disabled={isSaving} onClick={()=>quickUpdateStatus("published")}>{academyCopy(locale,"publish")}</button>}</div></section>
            ) : selectedPost ? (
              <>
                <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                      <LText text={"Editor"} /></p>

                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                      <LText text={"Editar artigo"} /></h2>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {status !== "published" && (
                      <button
                        type="button"
                        onClick={() => quickUpdateStatus("published")}
                        className="rounded-full bg-[#1683FF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07111F]"
                      >
                        <LText text={"Publicar"} /></button>
                    )}

                    {status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => quickUpdateStatus("archived")}
                        className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-red-400 hover:text-red-600"
                      >
                        <LText text={"Arquivar"} /></button>
                    )}

                    <button
                      type="button"
                      onClick={savePost}
                      disabled={isSaving}
                      className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LText text={isSaving ? "A guardar..." : "Guardar"} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="text-sm font-semibold"><LText text={"Título"} /></label>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold"><LText text={"Slug"} /></label>
                    <input
                      value={slug}
                      onChange={(event) => setSlug(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold"><LText text={"Resumo"} /></label>
                    <textarea
                      value={excerpt}
                      onChange={(event) => setExcerpt(event.target.value)}
                      rows={3}
                      className={textareaClass}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-4">
                    <div>
                      <label className="text-sm font-semibold"><LText text={"Categoria"} /></label>
                      <select
                        value={editCategory}
                        onChange={(event) => setEditCategory(event.target.value)}
                        className={inputClass}
                      >
                        {categories.map((item) => (
                          <option key={item} value={item}>
                            <LText text={item} />
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"Público"} /></label>
                      <select
                        value={editAudience}
                        onChange={(event) =>
                          setEditAudience(
                            event.target.value as
                              | "Candidatos"
                              | "Empresas"
                              | "Todos"
                          )
                        }
                        className={inputClass}
                      >
                        {audiences.map((item) => (
                          <option key={item} value={item}>
                            <LText text={item} />
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"Leitura"} /></label>
                      <input
                        value={readingTime}
                        onChange={(event) => setReadingTime(event.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"Estado"} /></label>
                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(event.target.value as AcademyPostStatus)
                        }
                        className={inputClass}
                      >
                        <option value="draft"><LText text={"Rascunho"} /></option>
                        <option value="published"><LText text={"Publicado"} /></option>
                        <option value="archived"><LText text={"Arquivado"} /></option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center justify-between rounded-2xl border border-[#DDE3EA] p-4 text-sm font-semibold">
                    <LText text={"Artigo em destaque"} /><input
                      type="checkbox"
                      checked={featured}
                      onChange={(event) => setFeatured(event.target.checked)}
                    />
                  </label>

                  <div>
                    <label className="text-sm font-semibold"><LText text={"Conteúdo"} /></label>
                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      rows={22}
                      className={`${textareaClass} font-mono`}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold"><LText text={"SEO title"} /></label>
                    <input
                      value={seoTitle}
                      onChange={(event) => setSeoTitle(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      <LText text={"SEO description"} /></label>
                    <textarea
                      value={seoDescription}
                      onChange={(event) =>
                        setSeoDescription(event.target.value)
                      }
                      rows={3}
                      className={textareaClass}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] p-12 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  <LText text={"Seleciona ou gera um artigo."} /></h2>

                <p className="mt-3 text-sm text-slate-500">
                  <LText text={"Os artigos gerados pela IA aparecem como rascunho para revisão antes da publicação."} /></p>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
