"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useI18n } from "@/lib/i18n/client";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { academyCopy, type AcademyCopyKey } from "@/lib/academy/admin-copy";
import { type ArticleDraft } from "@/lib/academy/quality";
import TopicCalendar, { type CalendarTopic } from "./TopicCalendar";
type Version = ArticleDraft & { quality_passed: boolean; updated_at: string };
type Run = {
  id: string;
  post_id: string | null;
  status: string;
  attempts: number;
  lease_until: string | null;
  created_at: string;
  error_code: string | null;
  input_tokens: number;
  output_tokens: number;
  sources: { url: string; checked_at: string }[];
  academy_topics: { title: string };
  academy_posts: {
    title: string;
    slug: string;
    academy_post_translations: Version[];
  } | null;
};
type Data = {
  settings: {
    enabled: boolean;
    auto_publish: boolean;
    next_due_at: string;
    monthly_request_limit: number;
  };
  runs: Run[];
  topics: (CalendarTopic & {
    source_urls: string[];
  })[];
  usage: { reserved_requests: number } | null;
  ready: { cron: boolean; provider: boolean; email: boolean };
  emails: { pending: number | null; sent: number | null; attention: number | null };
};
export default function AutomationPanel({
  onChanged,
}: {
  onChanged: () => Promise<void>;
}) {
  const { locale } = useI18n();
  const c = useCallback(
    (key: AcademyCopyKey) => academyCopy(locale, key),
    [locale],
  );
  const [data, setData] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false), [cap, setCap] = useState(120);
  const [topic, setTopic] = useState(""),
    [category, setCategory] = useState("Carreira"),
    [audience, setAudience] = useState("Todos"),
    [sources, setSources] = useState(
      "https://europass.europa.eu/en/create-europass-cv",
    );
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({}),
    [edit, setEdit] = useState<{ post_id: string; article: Version } | null>(
      null,
    );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (edit && dialog.current && !dialog.current.open)
      dialog.current.showModal();
  }, [edit]);
  const load = useCallback(async () => {
    const response = await authenticatedFetch("/api/admin/academy-automation");
    const json = await response.json();
    if (!response.ok) throw new Error(c("error"));
    setData(json);
    setEnabled(json.settings.enabled);
    setCap(json.settings.monthly_request_limit);
  }, [c]);
  useEffect(() => {
    let active = true;
    authenticatedFetch("/api/admin/academy-automation")
      .then(async (response) => {
        if (!response.ok) throw new Error(c("error"));
        return response.json();
      })
      .then((json) => {
        if (active) {
          setData(json);
          setEnabled(json.settings.enabled);
          setCap(json.settings.monthly_request_limit);
        }
      })
      .catch(() => {
        if (active) setMessage(c("error"));
      });
    return () => {
      active = false;
    };
  }, [c]);
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await authenticatedFetch(
        "/api/admin/academy-automation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || c("error"));
      setMessage(
        result.skipped
          ? String(result.reason)
          : result.status === "review"
            ? c("held")
            : c("done"),
      );
      if (body.action === "translation") setEdit(null);
      await load();
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : c("error"));
    } finally {
      setBusy(false);
    }
  }
  const button =
    "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50";
  const input =
    "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm";
  if (!data)
    return (
      <section className="my-8 rounded-3xl border bg-white p-6">
        <h2>{c("title")}</h2>
        <p role="status">{message || "…"}</p>
        <button
          className={button}
          onClick={() => load().catch(() => setMessage(c("error")))}
        >
          {c("refresh")}
        </button>
      </section>
    );

  return (
    <section
      id="academy-automation"
      className="my-8 min-w-0 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
    >
      <h2 className="text-2xl font-bold">{c("title")}</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
        {c("intro")}
      </p>
      {!data.ready.cron && (
        <p className="mt-3 text-amber-800">{c("missing")}</p>
      )}
      {!data.ready.provider && (
        <p className="mt-3 text-red-700">{c("provider")}</p>
      )}
      {!data.ready.email && <p className="mt-3 text-amber-800">{c("emailMissing")}</p>}
      <p className="mt-3 text-sm text-slate-600">{c("approvalRequired")}</p>
      <p className="mt-3 text-sm" role="status">
        {c("emailPending")}: {data.emails?.pending ?? "—"} · {c("emailSent")}: {data.emails?.sent ?? "—"} · {c("emailAttention")}: {data.emails?.attention ?? "—"}
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {c("enabled")}
        </label>
        <label>
          {c("cap")}
          <input
            className={input}
            type="number"
            min={6}
            max={600}
            value={cap}
            onChange={(event) => setCap(Number(event.target.value))}
          />
        </label>
        <div className="text-sm">
          <p>
            {c("next")}:{" "}
            {new Date(data.settings.next_due_at).toLocaleString(locale, {
              timeZone: "UTC",
            })}{" "}
            UTC
          </p>
          <p>
            {c("usage")}: {data.usage?.reserved_requests || 0} /{" "}
            {data.settings.monthly_request_limit}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-600">{c("budget")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          disabled={busy}
          className={button}
          onClick={() =>
            action({
              action: "settings",
              enabled,
              auto_publish: false,
              monthly_request_limit: cap,
            })
          }
        >
          {c("save")}
        </button>
        <button
          disabled={busy || !data.ready.provider}
          className={button}
          onClick={() => action({ action: "preview" })}
        >
          {c("preview")}
        </button>
        <button
          disabled={busy}
          className={button}
          onClick={() => load().catch(() => setMessage(c("error")))}
        >
          {c("refresh")}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-4 break-words text-sm">
        {busy ? "…" : message}
      </p>
      <details className="mt-6">
        <summary className="cursor-pointer font-semibold">
          {c("calendar")}
        </summary>
        <TopicCalendar topics={data.topics} />
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            {c("titleField")}
            <input
              className={input}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </label>
          <label>
            {c("category")}
            <input
              className={input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label>
            {c("sources")}
            <textarea
              className={input}
              value={sources}
              onChange={(e) => setSources(e.target.value)}
            />
          </label>
          <label>
            {c("everyone")}
            <select
              className={input}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              <option value="Todos">{c("everyone")}</option>
              <option value="Candidatos">{c("candidate")}</option>
              <option value="Empresas">{c("company")}</option>
            </select>
          </label>
        </div>
        <button
          disabled={busy || topic.length < 10}
          className={button + " mt-3"}
          onClick={() =>
            action({
              action: "topic",
              title: topic,
              category,
              audience,
              source_urls: sources
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        >
          {c("add")}
        </button>
      </details>
      <h3 className="mt-8 text-lg font-semibold">{c("history")}</h3>
      {!data.runs.length && <p className="mt-3 text-sm">{c("empty")}</p>}
      <div className="mt-4 space-y-4">
        {data.runs.map((run) => (
          <details key={run.id} className="min-w-0 rounded-2xl border p-4">
            <summary className="cursor-pointer break-words font-semibold">
              {run.academy_topics.title} ·{" "}
              {c(
                run.status === "review"
                  ? "reviewState"
                  : (run.status as AcademyCopyKey),
              )}
            </summary>
            <p className="my-3 text-xs text-slate-500">
              {new Date(run.created_at).toLocaleString(locale)} ·{" "}
              {run.input_tokens + run.output_tokens} tokens · {run.attempts}/3
            </p>
            {run.error_code && (
              <p className="break-words text-sm text-red-700">
                {run.error_code}
              </p>
            )}
            <div className="my-3 flex flex-wrap gap-2">
              {locales.map((language) => {
                const version =
                  run.academy_posts?.academy_post_translations.find(
                    (v) => v.locale === language,
                  );
                return (
                  <button
                    key={language}
                    className={button}
                    disabled={!version || busy}
                    onClick={() =>
                      version &&
                      run.post_id &&
                      setEdit({ post_id: run.post_id, article: version })
                    }
                  >
                    {localeNames[language]} {version ? "✓" : "…"}
                  </button>
                );
              })}
            </div>
            <ul className="my-3 space-y-2 text-xs">
              {run.sources.map((source) => (
                <li key={source.url}>
                  <a
                    className="break-all underline"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.url}
                  </a>{" "}
                  · {new Date(source.checked_at).toLocaleDateString(locale)}
                </li>
              ))}
            </ul>
            {run.status === "failed" && run.attempts < 3 && (
              <button
                disabled={busy}
                className={button}
                onClick={() => action({ action: "retry", run_id: run.id })}
              >
                {c("retry")}
              </button>
            )}
            {run.status === "review" && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-600">{c("publicationEmails")}</p>
                <label className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!!reviewed[run.id]}
                    onChange={(e) =>
                      setReviewed({ ...reviewed, [run.id]: e.target.checked })
                    }
                  />
                  {c("review")}
                </label>
                <button
                  disabled={busy || !reviewed[run.id]}
                  className={button}
                  onClick={() =>
                    action({ action: "publish", post_id: run.post_id })
                  }
                >
                  {c("publish")}
                </button>
              </div>
            )}
          </details>
        ))}
      </div>
      {edit && (
        <dialog
          ref={dialog}
          onCancel={(event) => {
            if (busy) event.preventDefault();
            else setEdit(null);
          }}
          aria-label={c("edit")}
          className="fixed inset-0 z-50 mx-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl p-0 backdrop:bg-slate-950/70"
        >
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {c("edit")} · {localeNames[edit.article.locale as Locale]}
              </h3>
              <button
                className={button}
                onClick={() => setEdit(null)}
                disabled={busy}
              >
                {c("close")}
              </button>
            </div>
            {(
              [
                "title",
                "excerpt",
                "seo_title",
                "seo_description",
                "content",
              ] as const
            ).map((field) => (
              <label key={field} className="mt-4 block text-sm">
                {c(field === "title" ? "titleField" : field)}
                <textarea
                  className={input}
                  rows={field === "content" ? 16 : 2}
                  value={edit.article[field]}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      article: { ...edit.article, [field]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <label className="my-4 flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={edit.article.review_required}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    article: {
                      ...edit.article,
                      review_required: e.target.checked,
                    },
                  })
                }
              />
              {c("sensitive")}
            </label>
            <button
              disabled={busy}
              className={button}
              onClick={() =>
                action({
                  action: "translation",
                  post_id: edit.post_id,
                  locale: edit.article.locale,
                  article: edit.article,
                })
              }
            >
              {c("save")}
            </button>
            <p role="status" className="mt-3 text-sm">
              {busy ? "…" : message}
            </p>
          </div>
        </dialog>
      )}
    </section>
  );
}
