"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/lib/i18n/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  defaults,
  type Opportunity,
  type Settings,
  type Source,
} from "@/lib/social-radar/domain";

type Run = {
  id: string;
  kind: string;
  status: string;
  started_at: string;
  imported: number;
  error_code: string | null;
};
type Usage = {
  day: string;
  requests: number;
  generations: number;
  tokens: number;
};
type Data = {
  settings: Settings;
  sources: Source[];
  opportunities: Opportunity[];
  total: number;
  runs: Run[];
  usage: Usage[];
  ready: {
    meta: boolean;
    ai: boolean;
    cron: boolean;
    externalPublishing: boolean;
  };
};
const errors: Record<string, string> = {
  credentials: "Configura ou renova o acesso à Meta.",
  ai_credentials: "Configura a geração de comentários.",
  permission: "A Meta não autorizou a consulta desta fonte.",
  rate_limit:
    "A Meta limitou os pedidos. A consulta será retomada numa próxima execução.",
  provider: "A fonte está temporariamente indisponível.",
  timeout: "A fonte não respondeu a tempo.",
  invalid_response: "Não foi possível interpretar a resposta da fonte.",
  hashtag_budget:
    "Limite de hashtags distintas nos últimos sete dias atingido.",
  paused: "O Radar está pausado.",
  busy: "Já existe uma tarefa em curso.",
  request_budget: "Orçamento diário de pesquisa atingido.",
  generation_budget: "Limite diário de gerações atingido.",
  not_due: "As fontes já foram consultadas neste intervalo.",
  no_opportunities:
    "Não há oportunidades novas, recentes e acima da prioridade mínima para gerar.",
  generation_failed: "Não foi possível gerar uma sugestão válida.",
  interrupted: "A execução foi interrompida e pode ser retomada.",
};
const states: Record<string, string> = {
  new: "Por preparar",
  ready: "Pronto a rever",
  review: "Revisão manual",
  used: "Publicado manualmente",
  dismissed: "Descartado",
  running: "Em curso",
  success: "Concluído",
  partial: "Parcial",
  failed: "Falhou",
  cancelled: "Cancelado",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const buttonClass =
  "rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40";
const primaryClass =
  "rounded-full bg-[#1683FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-40";

export default function SocialRadar() {
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [tab, setTab] = useState("opportunities");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState({ kind: "account", value: "" });
  const [manual, setManual] = useState({
    permalink: "",
    caption: "",
    published_at: "",
  });
  const [showImport, setShowImport] = useState(false);
  const [edits, setEdits] = useState<
    Record<string, { selected_comment: string; feedback: string }>
  >({});
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await authenticatedFetch(
          `/api/admin/social-radar?status=${filter}&page=${page}`,
          { signal },
        );
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        if (!signal?.aborted) {
          setData(value);
          setSettings(value.settings);
        }
      } catch (error) {
        if (!signal?.aborted)
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível abrir o Radar.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filter, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  async function action(
    body: Record<string, unknown>,
    success = "Alteração guardada.",
  ) {
    setBusy(true);
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/admin/social-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        result.skipped
          ? errors[result.skipped] || "Nenhuma tarefa disponível."
          : result.cancelled
            ? "A tarefa foi cancelada após uma alteração à configuração."
            : result.errors && Object.keys(result.errors).length
              ? "A tarefa terminou com falhas. Consulta o histórico e as fontes."
              : success,
      );
      if (body.action === "opportunity")
        setEdits((old) => {
          const next = { ...old };
          delete next[String(body.id)];
          return next;
        });
      if (body.action === "source") setSource((old) => ({ ...old, value: "" }));
      if (body.action === "import") {
        setManual({ permalink: "", caption: "", published_at: "" });
        setShowImport(false);
      }
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Serviço indisponível.",
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(
    item: Opportunity,
    patch: Partial<{ selected_comment: string; feedback: string }>,
  ) {
    setEdits((old) => ({
      ...old,
      [item.id]: {
        ...(old[item.id] || {
          selected_comment: item.selected_comment,
          feedback: item.feedback,
        }),
        ...patch,
      },
    }));
  }
  function save(item: Opportunity, status: string) {
    return action({
      action: "opportunity",
      id: item.id,
      status,
      ...(edits[item.id] || {
        selected_comment: item.selected_comment,
        feedback: item.feedback,
      }),
    });
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(
        "Comentário copiado. Abre a publicação para o rever e publicar.",
      );
    } catch {
      setMessage(
        "Não foi possível copiar. Seleciona o texto no campo do comentário.",
      );
    }
  }
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const usage = data?.usage.find((item) => item.day === today);
  const configured =
    !!data?.ready.meta && !!data?.ready.ai && !!data?.ready.cron;

  return (
    <main
      lang="pt-PT"
      className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-[#07111F] sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-700 underline"
        >
          ← Administração
        </Link>
        <header className="relative mt-5 overflow-hidden rounded-[28px] bg-[#07111F] px-6 py-8 text-white sm:px-9">
          <div className="pointer-events-none absolute -right-12 -top-20 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#4BB3FD]">
                ARYNQO SOCIAL AGENT
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Radar de conversas
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Encontra publicações relevantes. Prepara comentários com a voz
                da ARYNQO e acompanha cada intervenção.
              </p>
            </div>
            {data && (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${data.settings.enabled ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-slate-200"}`}
                >
                  {data.settings.enabled ? "Pesquisa ativa" : "Radar pausado"}
                </span>
                {data.settings.enabled && (
                  <button
                    disabled={busy}
                    className="rounded-full border border-white/30 px-4 py-2 text-sm disabled:opacity-40"
                    onClick={() =>
                      void action(
                        {
                          action: "settings",
                          settings: { ...data.settings, enabled: false },
                        },
                        "Radar pausado. As tarefas em curso deixam de guardar resultados.",
                      )
                    }
                  >
                    Pausar Radar
                  </button>
                )}
              </div>
            )}
          </div>
          {data && (
            <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
              {[
                ["Fontes ativas", data.sources.filter((s) => s.enabled).length],
                [
                  "Pedidos reservados hoje",
                  `${usage?.requests || 0} / ${data.settings.daily_requests}`,
                ],
                [
                  "Gerações hoje",
                  `${usage?.generations || 0} / ${data.settings.daily_generations}`,
                ],
                ["Tokens hoje", (usage?.tokens || 0).toLocaleString("pt-PT")],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          )}
        </header>
        {message && (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"
          >
            {message}
          </p>
        )}
        {!data ? (
          <section className="mt-6 rounded-2xl border bg-white p-6">
            <p>
              {loading
                ? "A abrir o Radar…"
                : "O Radar não está disponível nesta sessão."}
            </p>
            {!loading && (
              <div className="mt-4 flex gap-4">
                <button className={buttonClass} onClick={() => void load()}>
                  Tentar novamente
                </button>
                <Link
                  href="/admin/login"
                  className="self-center text-sm text-blue-700 underline"
                >
                  Iniciar sessão
                </Link>
              </div>
            )}
          </section>
        ) : (
          <>
            {!configured && (
              <aside className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6">
                <strong>Integração por configurar.</strong> Podes organizar as
                fontes e adicionar publicações. A pesquisa e a geração
                automáticas precisam das ligações indicadas em Configuração.
              </aside>
            )}
            <nav
              aria-label="Áreas do Social Agent"
              className="my-6 flex flex-wrap gap-2"
            >
              {[
                ["opportunities", "Oportunidades"],
                ["sources", "Fontes"],
                ["settings", "Configuração"],
                ["history", "Histórico"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-current={tab === key ? "page" : undefined}
                  onClick={() => setTab(key)}
                  className={`${buttonClass} ${tab === key ? "!border-[#07111F] !bg-[#07111F] !text-white" : ""}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === "opportunities" && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <label className="text-sm font-medium">
                    Estado
                    <select
                      className={`${inputClass} mt-1`}
                      disabled={busy}
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="all">Todos</option>
                      {Object.entries(states)
                        .slice(0, 5)
                        .map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={buttonClass}
                      disabled={busy}
                      onClick={() => setShowImport(!showImport)}
                    >
                      Adicionar publicação
                    </button>
                    <button
                      className={primaryClass}
                      disabled={
                        busy || !data.settings.enabled || !data.ready.meta
                      }
                      onClick={() =>
                        void action(
                          { action: "scan" },
                          "Pesquisa concluída. As novas publicações estão no Radar.",
                        )
                      }
                    >
                      {busy ? "A processar…" : "Pesquisar agora"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  A pesquisa usa contas profissionais e hashtags acessíveis pela
                  Meta. Os comentários externos são publicados manualmente.
                  Copiar ou abrir um link não marca o comentário como publicado.
                </p>
                {showImport && (
                  <form
                    className="mt-5 space-y-4 rounded-2xl border bg-white p-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(
                        {
                          action: "import",
                          ...manual,
                          published_at: new Date(
                            manual.published_at,
                          ).toISOString(),
                        },
                        "Publicação adicionada.",
                      );
                    }}
                  >
                    <h2 className="font-semibold">
                      Adicionar contexto à pesquisa
                    </h2>
                    <label className="block text-sm">
                      Link do Instagram
                      <input
                        required
                        type="url"
                        className={`${inputClass} mt-1`}
                        value={manual.permalink}
                        onChange={(e) =>
                          setManual({ ...manual, permalink: e.target.value })
                        }
                        placeholder="https://www.instagram.com/p/…"
                      />
                    </label>
                    <label className="block text-sm">
                      Legenda da publicação
                      <textarea
                        required
                        minLength={15}
                        maxLength={4000}
                        rows={4}
                        className={`${inputClass} mt-1`}
                        value={manual.caption}
                        onChange={(e) =>
                          setManual({ ...manual, caption: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Data e hora da publicação (hora do teu dispositivo)
                      <input
                        required
                        type="datetime-local"
                        className={`${inputClass} mt-1 max-w-sm`}
                        value={manual.published_at}
                        onChange={(e) =>
                          setManual({ ...manual, published_at: e.target.value })
                        }
                      />
                    </label>
                    <button disabled={busy} className={primaryClass}>
                      Adicionar ao Radar
                    </button>
                  </form>
                )}
                {loading ? (
                  <p className="py-8 text-sm text-slate-500">
                    A atualizar oportunidades…
                  </p>
                ) : data.opportunities.length === 0 ? (
                  <section className="mt-6 rounded-2xl border border-dashed bg-white p-9 text-center">
                    <h2 className="text-xl font-semibold">
                      Ainda não há publicações nesta seleção.
                    </h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                      Adiciona fontes e configura a integração para começar a
                      pesquisa, ou introduz uma publicação que queiras avaliar.
                    </p>
                  </section>
                ) : (
                  <div className="mt-5 grid gap-5">
                    {data.opportunities.map((item) => {
                      const current = edits[item.id] || item;
                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                                {states[item.status]}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                                Prioridade editorial: {item.score}/100
                              </span>
                            </div>
                            <time className="text-xs text-slate-500">
                              {item.published_at
                                ? date(item.published_at)
                                : `Encontrada em ${date(item.created_at)} · hora de publicação não fornecida`}
                            </time>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">
                            {item.caption}
                          </p>
                          <p className="mt-3 text-xs leading-5 text-slate-500">
                            {item.reason}
                          </p>
                          {item.suggestions.length > 0 && (
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              {item.suggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  disabled={busy}
                                  onClick={() =>
                                    edit(item, { selected_comment: suggestion })
                                  }
                                  className={`rounded-xl border p-3 text-left text-sm leading-5 disabled:opacity-50 ${current.selected_comment === suggestion ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}
                                >
                                  <span className="mb-1 block text-xs font-semibold text-blue-700">
                                    Alternativa {index + 1}
                                  </span>
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                          <label className="mt-4 block text-sm font-medium">
                            Comentário
                            <textarea
                              rows={2}
                              maxLength={240}
                              className={`${inputClass} mt-1`}
                              value={current.selected_comment}
                              onChange={(e) =>
                                edit(item, { selected_comment: e.target.value })
                              }
                            />
                            <span className="mt-1 block text-right text-xs font-normal text-slate-400">
                              {current.selected_comment.length}/240
                            </span>
                          </label>
                          <label className="mt-2 block text-xs text-slate-600">
                            Avaliação editorial (opcional)
                            <input
                              maxLength={300}
                              className={`${inputClass} mt-1`}
                              value={current.feedback}
                              placeholder="Ex.: demasiado comercial, falta contexto…"
                              onChange={(e) =>
                                edit(item, { feedback: e.target.value })
                              }
                            />
                          </label>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.status === "new" && (
                              <button
                                disabled={
                                  busy ||
                                  !data.settings.enabled ||
                                  !data.ready.ai
                                }
                                className={primaryClass}
                                onClick={() =>
                                  void action(
                                    { action: "draft", id: item.id },
                                    "Sugestões preparadas.",
                                  )
                                }
                              >
                                Preparar sugestões
                              </button>
                            )}
                            <button
                              className={buttonClass}
                              disabled={!current.selected_comment.trim()}
                              onClick={() =>
                                void copy(current.selected_comment)
                              }
                            >
                              Copiar comentário
                            </button>
                            <a
                              className={buttonClass}
                              href={item.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Abrir publicação ↗
                            </a>
                            <button
                              className={buttonClass}
                              disabled={
                                busy ||
                                current.selected_comment.trim().length < 8
                              }
                              onClick={() => void save(item, "ready")}
                            >
                              Guardar rascunho
                            </button>
                            {item.status !== "used" && (
                              <button
                                className={buttonClass}
                                disabled={
                                  busy ||
                                  current.selected_comment.trim().length < 8
                                }
                                onClick={() => void save(item, "used")}
                              >
                                Já publiquei manualmente
                              </button>
                            )}
                            <button
                              className={buttonClass}
                              disabled={busy}
                              onClick={() => void save(item, "dismissed")}
                            >
                              Descartar
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between text-sm">
                  <p>
                    {data.total} publicações · Página {page + 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 0 || loading || busy}
                      className={buttonClass}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      disabled={
                        (page + 1) * 20 >= data.total || loading || busy
                      }
                      className={buttonClass}
                      onClick={() => setPage(page + 1)}
                    >
                      Seguinte
                    </button>
                  </div>
                </div>
              </>
            )}
            {tab === "sources" && (
              <section className="rounded-2xl border bg-white p-5 sm:p-7">
                <h2 className="text-xl font-semibold">
                  Contas e hashtags a acompanhar
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Até 200 fontes. Cada consulta lê até 50 publicações recentes.
                  A cobertura depende do acesso concedido pela Meta. A mesma
                  hashtag conta uma vez na janela de sete dias. As hashtags
                  devolvem publicações das últimas 24 horas; a hora exata pode
                  não estar disponível.
                </p>
                <form
                  className="mt-5 flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      { action: "source", ...source },
                      "Fonte adicionada.",
                    );
                  }}
                >
                  <label className="text-sm">
                    Tipo
                    <select
                      className={`${inputClass} mt-1`}
                      value={source.kind}
                      onChange={(e) =>
                        setSource({ ...source, kind: e.target.value })
                      }
                    >
                      <option value="account">Conta profissional</option>
                      <option value="hashtag">Hashtag</option>
                    </select>
                  </label>
                  <label className="min-w-48 flex-1 text-sm">
                    Nome
                    <input
                      required
                      maxLength={80}
                      className={`${inputClass} mt-1`}
                      value={source.value}
                      onChange={(e) =>
                        setSource({ ...source, value: e.target.value })
                      }
                      placeholder={
                        source.kind === "account"
                          ? "jornaldenoticias"
                          : "emprego"
                      }
                    />
                  </label>
                  <button disabled={busy} className={primaryClass}>
                    Adicionar fonte
                  </button>
                </form>
                <div className="mt-6 divide-y">
                  {data.sources.length === 0 && (
                    <p className="py-6 text-sm text-slate-500">
                      Começa por uma conta conhecida, como a publicação do
                      exemplo, e valida a primeira consulta.
                    </p>
                  )}
                  {data.sources.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-4"
                    >
                      <div>
                        <p className="font-medium">
                          {item.kind === "account" ? "@" : "#"}
                          {item.value}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.last_checked_at
                            ? `Última tentativa: ${date(item.last_checked_at)}`
                            : "Ainda não consultada"}
                        </p>
                        {item.last_error && (
                          <p className="mt-1 max-w-xl text-xs text-red-700">
                            {errors[item.last_error] || "Falha na consulta."}
                          </p>
                        )}
                      </div>
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() =>
                          void action({
                            action: "toggle_source",
                            id: item.id,
                            enabled: !item.enabled,
                          })
                        }
                      >
                        {item.enabled ? "Pausar fonte" : "Reativar fonte"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {tab === "settings" && (
              <section className="rounded-2xl border bg-white p-5 sm:p-7">
                <h2 className="text-xl font-semibold">
                  Pesquisa e voz da ARYNQO
                </h2>
                <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  {[
                    ["Pesquisa Instagram", data.ready.meta],
                    ["Geração de comentários", data.ready.ai],
                    ["Execução agendada", data.ready.cron],
                  ].map(([label, ok]) => (
                    <li key={String(label)} className="rounded-xl border p-4">
                      <span className="block font-medium">{label}</span>
                      <span
                        className={`mt-1 block text-xs ${ok ? "text-emerald-700" : "text-amber-700"}`}
                      >
                        {ok
                          ? "Credenciais configuradas"
                          : "Por configurar no servidor"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Credenciais presentes não confirmam permissões. A primeira
                  pesquisa valida o acesso real. Os tokens não são apresentados
                  no browser.
                </p>
                <form
                  className="mt-6 space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      { action: "settings", settings },
                      "Configuração guardada.",
                    );
                  }}
                >
                  <fieldset
                    disabled={busy}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    {(
                      [
                        [
                          "daily_requests",
                          "Pedidos de pesquisa por dia",
                          6,
                          1000,
                        ],
                        [
                          "daily_generations",
                          "Gerações de comentários por dia",
                          1,
                          200,
                        ],
                        [
                          "interval_minutes",
                          "Intervalo mínimo por fonte (minutos)",
                          15,
                          1440,
                        ],
                        [
                          "max_age_hours",
                          "Idade máxima da publicação (horas)",
                          1,
                          168,
                        ],
                        [
                          "min_score",
                          "Prioridade mínima para gerar (0–100)",
                          0,
                          100,
                        ],
                      ] as const
                    ).map(([key, label, min, max]) => (
                      <label key={key} className="text-sm">
                        {label}
                        <input
                          className={`${inputClass} mt-1`}
                          type="number"
                          required
                          min={min}
                          max={max}
                          step={1}
                          value={
                            Number.isFinite(settings[key]) ? settings[key] : ""
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [key]:
                                e.target.value === ""
                                  ? NaN
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    ))}
                  </fieldset>
                  <label className="block text-sm">
                    Orientação editorial
                    <textarea
                      required
                      maxLength={700}
                      rows={3}
                      className={`${inputClass} mt-1`}
                      value={settings.tone}
                      onChange={(e) =>
                        setSettings({ ...settings, tone: e.target.value })
                      }
                    />
                  </label>
                  <p className="text-xs leading-5 text-slate-500">
                    Os limites são tetos de utilização, não metas de
                    comentários. A pesquisa e a geração alternam em execuções de
                    cinco minutos. O orçamento de pedidos é reservado de forma
                    conservadora; pode exceder os pedidos efetivamente
                    realizados. Contagem diária à hora de Lisboa.
                  </p>
                  <label className="flex items-center gap-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      disabled={busy || (!configured && !settings.enabled)}
                      checked={settings.enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, enabled: e.target.checked })
                      }
                    />
                    Ativar pesquisa e preparação automáticas
                  </label>
                  <button className={primaryClass} disabled={busy}>
                    Guardar configuração
                  </button>
                </form>
              </section>
            )}
            {tab === "history" && (
              <section className="rounded-2xl border bg-white p-5 sm:p-7">
                <h2 className="text-xl font-semibold">Últimas execuções</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Histórico da pesquisa e preparação. A publicação externa é
                  registada pela equipa.
                </p>
                <div className="mt-5 space-y-3">
                  {data.runs.length === 0 && (
                    <p className="py-4 text-sm">Ainda não há execuções.</p>
                  )}
                  {data.runs.map((run) => (
                    <div
                      key={run.id}
                      className="flex flex-wrap justify-between gap-3 rounded-xl border p-4 text-sm"
                    >
                      <div>
                        <p className="font-semibold">
                          {run.kind === "scan"
                            ? "Pesquisa de publicações"
                            : "Preparação de comentário"}{" "}
                          · {states[run.status]}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {date(run.started_at)}
                        </p>
                        {run.error_code && (
                          <p className="mt-2 text-xs text-red-700">
                            {errors[run.error_code] || "Falha na execução."}
                          </p>
                        )}
                      </div>
                      <p>
                        {run.imported}{" "}
                        {run.kind === "scan"
                          ? "novas publicações"
                          : "oportunidades avaliadas"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
