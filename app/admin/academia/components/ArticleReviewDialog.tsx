"use client";
import { useEffect, useId, useRef, useState } from "react";
import AcademyContent from "@/app/components/arynqo/AcademyContent";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { academyCopy, academyRunMessage, type AcademyCopyKey } from "@/lib/academy/admin-copy";
import type { ArticleDraft } from "@/lib/academy/quality";
import { useI18n } from "@/lib/i18n/client";
import { languageTags, locales, localeNames, type Locale } from "@/lib/i18n/config";

type Version = ArticleDraft & { quality_passed: boolean; updated_at: string };
type ReviewData = {
  post: { id: string; title: string; status: string };
  versions: Version[];
  sources: { url: string; checked_at: string }[];
  editing_locked: boolean;
};
const button = "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";
const fields = ["title", "excerpt", "seo_title", "seo_description", "content"] as const;

export default function ArticleReviewDialog({ postId, initialLanguage, onClose, onSaved }: {
  postId: string;
  initialLanguage?: Locale;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { locale } = useI18n();
  const c = (key: AcademyCopyKey) => academyCopy(locale, key);
  const headingId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<ReviewData | null>(null);
  const [language, setLanguage] = useState<Locale>(initialLanguage ?? "pt");
  const [edit, setEdit] = useState<Version | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    let active = true;
    authenticatedFetch(`/api/admin/academy-automation?post_id=${encodeURIComponent(postId)}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("review_unavailable");
        return response.json() as Promise<ReviewData>;
      })
      .then(result => {
        if (!active) return;
        setData(result);
        setLanguage(current => result.versions.some(version => version.locale === current)
          ? current : result.versions.find(version => version.locale === "pt")?.locale ?? result.versions[0]?.locale ?? "pt");
        setMessage("");
      })
      .catch(() => { if (active) setMessage(academyCopy(locale, "reviewLoadError")); });
    return () => { active = false; };
  }, [postId, locale, attempt]);

  const version = data?.versions.find(item => item.locale === language);
  async function save() {
    if (!edit || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/admin/academy-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "translation", post_id: postId, locale: edit.locale, article: edit }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(academyRunMessage(locale, result.error || c("error")));
      setData(current => current ? {
        ...current,
        versions: current.versions.map(item => item.locale === edit.locale ? edit : item),
      } : current);
      setEdit(null);
      setMessage(c("versionSaved"));
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : c("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby={headingId}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto rounded-2xl bg-white p-0 text-[#07111F] backdrop:bg-slate-950/70 sm:w-[calc(100%-3rem)]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4 sm:px-6">
        <h2 id={headingId} className="text-lg font-semibold">{c("readVersions")}</h2>
        <button type="button" className={button} disabled={busy} onClick={onClose}>{c("close")}</button>
      </div>
      <div className="min-w-0 space-y-6 p-4 sm:p-6">
        {!data ? (
          <div role="status">
            <p>{message || c("loadingVersions")}</p>
            {message && <button type="button" className={button + " mt-3"} onClick={() => { setMessage(""); setAttempt(value => value + 1); }}>{c("refresh")}</button>}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">{c("reviewInstructions")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={c("readVersions")}>
              {locales.map(code => {
                const available = data.versions.some(item => item.locale === code);
                return <button type="button" key={code} lang={languageTags[code]}
                  aria-pressed={language === code && available}
                  className={`${button} ${language === code && available ? "border-blue-600 bg-blue-50 text-blue-800" : ""}`}
                  disabled={!available || busy || !!edit}
                  onClick={() => { setLanguage(code); setMessage(""); }}>
                  {localeNames[code]}{!available ? ` · ${c("versionMissing")}` : ""}
                </button>;
              })}
            </div>
            {version ? edit ? (
              <form className="space-y-4" onSubmit={event => { event.preventDefault(); void save(); }}>
                <h3 className="font-semibold">{c("edit")} · {localeNames[language]}</h3>
                {fields.map(field => <label key={field} className="block text-sm font-semibold">
                  {c(field === "title" ? "titleField" : field)}
                  <textarea className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" lang={languageTags[language]}
                    rows={field === "content" ? 20 : 2} disabled={busy} value={edit[field]}
                    onChange={event => setEdit({ ...edit, [field]: event.target.value })} />
                </label>)}
                <label className="flex items-center gap-3 text-sm"><input type="checkbox" disabled={busy}
                  checked={edit.review_required} onChange={event => setEdit({ ...edit, review_required: event.target.checked })} />{c("sensitive")}</label>
                <div className="flex flex-wrap gap-3">
                  <button className={button} type="submit" disabled={busy}>{busy ? "…" : c("save")}</button>
                  <button className={button} type="button" disabled={busy} onClick={() => setEdit(null)}>{c("cancelEdit")}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className={button} disabled={busy || data.editing_locked} onClick={() => { setEdit({ ...version }); setMessage(""); }}>{c("edit")}</button>
                  {data.editing_locked && <p className="text-sm text-slate-600">{c("running")}</p>}
                </div>
                <article lang={languageTags[language]} className="min-w-0 space-y-5 break-words">
                  <h3 className="text-2xl font-bold sm:text-3xl">{version.title}</h3>
                  <p className="text-sm text-slate-500">{version.reading_time} · {localeNames[language]}</p>
                  <p className="text-lg leading-8 text-slate-600">{version.excerpt}</p>
                  <AcademyContent content={version.content} />
                </article>
                <section className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
                  <h3 className="font-semibold">{c("seo_title")}</h3><p lang={languageTags[language]}>{version.seo_title}</p>
                  <h3 className="font-semibold">{c("seo_description")}</h3><p lang={languageTags[language]}>{version.seo_description}</p>
                </section>
                <button type="button" className={button} onClick={() => { dialog.current?.scrollTo({ top: 0 }); }}>{c("backToLanguages")}</button>
              </>
            ) : <p role="status">{c("noVersions")}</p>}
            {data.sources.length > 0 && <section className="border-t border-slate-200 pt-5">
              <h3 className="font-semibold">{c("reviewSources")}</h3>
              <ul className="mt-3 space-y-3 text-sm">{data.sources.map(source => <li key={source.url}>
                <a className="break-all text-blue-700 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
                {" · "}{new Date(source.checked_at).toLocaleDateString(locale)}
              </li>)}</ul>
            </section>}
            <p role="status" aria-live="polite" className="break-words text-sm">{message}</p>
          </>
        )}
      </div>
    </dialog>
  );
}
