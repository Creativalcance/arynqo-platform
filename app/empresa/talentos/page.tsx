"use client";
import { LText, LElement } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { useEffect, useRef, useState } from "react";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { SENIORITIES, WORK_MODELS } from "@/lib/matching-preferences";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/create-notification";
import CompanyLaunchOffer from "@/app/components/arynqo/CompanyLaunchOffer";

type Candidate = {
  id: string;
  headline: string | null;
  profession: string | null;
  location: string | null;
  desired_area: string | null;
  seniority: string | null;
  work_model: string | null;
  contact_visibility: string | null;
  profiles: { name: string | null; email: string | null } | null;
  has_application: boolean;
  contact_request_status: "pending" | "accepted" | "rejected" | null;
};
type Job = { id: string; title: string };
const emptySearch = { query: "", location: "", skill: "", seniority: "", work_model: "", availability: "" };

type Company = { id: string; company_name: string | null };

export default function CompanyTalentDirectory() {
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState({ ...emptySearch, jobId: "", page: 1 });
  const [searchInput, setSearchInput] = useState(emptySearch);
  const sending = useRef(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingId, setSendingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reload, setReload] = useState(0);
  const [initializationAttempt, setInitializationAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      setError("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.assign(browserLocalizedPath("/login")); return; }
        const { data, error: companyError } = await supabase.from("company_profiles")
          .select("id,company_name").eq("user_id", session.user.id).single();
        if (companyError || !data) throw new Error("Esta área está disponível para contas de empresa.");
        const { data: jobData, error: jobError } = await supabase.from("jobs")
          .select("id,title,renewal_deadline").eq("company_id", data.id).eq("is_active", true).order("created_at", { ascending: false });
        if (jobError) throw new Error("Não foi possível carregar as vagas.");
        const activeJobs = (jobData || []).filter(job => !job.renewal_deadline || new Date(job.renewal_deadline).getTime() > Date.now());
        if (!cancelled) {
          setJobs(activeJobs);
          setCompany(data);
        }
      } catch (cause) {
        if (!cancelled) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar esta área."); setLoading(false); }
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [initializationAttempt]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    async function loadDirectory() {
      setLoading(true);
      setError("");
      try {
      const { data, error: directoryError } = await supabase.rpc("company_candidate_search", {
        target_job_id: filters.jobId || null, search_text: filters.query, page_number: filters.page,
        filters: { location: filters.location, skill: filters.skill, seniority: filters.seniority, work_model: filters.work_model, availability: filters.availability },
      });
      if (cancelled) return;
      if (directoryError) {
        setCandidates([]); setTotal(0); setError(directoryError.message.includes("plan required") ? "O meu plano não inclui a pesquisa de candidatos." : "Não foi possível carregar os candidatos. Tenta novamente.");
      } else {
        setCandidates(data?.items || []); setTotal(data?.total || 0);
      }
      } catch {
        if (!cancelled) { setCandidates([]); setTotal(0); setError("Não foi possível carregar os candidatos. Tenta novamente."); }
      } finally { if (!cancelled) setLoading(false); }
    }
    void loadDirectory();
    return () => { cancelled = true; };
  }, [company, filters, reload]);

  async function requestContact(candidate: Candidate) {
    if (!company || !filters.jobId || sending.current) return;
    sending.current = true;
    setSendingId(candidate.id); setFeedback("");
    try {
      const { data, error: requestError } = await supabase.from("candidate_contact_requests").insert({
        company_id: company.id, student_id: candidate.id, job_id: filters.jobId, status: "pending",
        message: `A empresa ${company.company_name || "ARYNQO"} pretende contactar-te sobre a vaga "${jobs.find(job => job.id === filters.jobId)?.title || ""}".`,
      }).select("id").single();
      if (requestError || !data) throw new Error("Não foi possível enviar. Verifica se a vaga continua ativa e se já existe um pedido para este candidato.");
      // The database creates the notification atomically; this requests immediate email delivery.
      await createNotification({ userId: "", title: "", message: "", relatedType: "candidate_contact_request", relatedId: data.id })
        .catch(() => undefined);
      setFeedback("Pedido enviado. A identidade será revelada se o candidato aceitar.");
      setReload(current => current + 1);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível enviar o pedido.");
    } finally {
      sending.current = false;
      setSendingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-[#07111F] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <CompanyLaunchOffer />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl"><LText text={"Explorar candidatos"} /></h1>
          <Link href="/empresa/matches" className="font-semibold text-[#1683FF] underline"><LText text={"Ver compatibilidade por vaga"} /></Link>
        </div>
        <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-600"><LText text={"Encontro candidatos de toda a plataforma, mesmo sem match com as minhas vagas. A identidade e os contactos continuam protegidos até existir autorização ou uma candidatura à minha empresa."} /></p>
        <form onSubmit={event => { event.preventDefault(); setFilters(current => ({ ...current, ...Object.fromEntries(Object.entries(searchInput).map(([key, value]) => [key, value.trim()])), page: 1 })); }} className="mb-6 rounded-3xl border border-[#DDE3EA] bg-white p-5">
          <fieldset disabled={!!sendingId} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="mb-4 text-lg font-semibold"><LText text="A minha pesquisa" /></legend>
            {([['query', 'Profissão ou área'], ['location', 'Localização'], ['skill', 'Competência']] as const).map(([key, label]) => (
              <label key={key} className="min-w-0 text-sm font-semibold"><LText text={label} />
                <input type="search" maxLength={100} value={searchInput[key]} onChange={event => setSearchInput(current => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#DDE3EA] px-4 py-3 font-normal text-[#07111F]" />
              </label>
            ))}
            {([
              ['seniority', 'Senioridade', Object.entries(SENIORITIES)],
              ['work_model', 'Modelo de trabalho', Object.entries(WORK_MODELS)],
              ['availability', 'Disponibilidade', ['Imediata', 'Até 15 dias', 'Até 30 dias', 'Até 60 dias', 'A combinar'].map(value => [value, value])],
            ] as const).map(([key, label, options]) => (
              <label key={key} className="min-w-0 text-sm font-semibold"><LText text={label} />
                <select value={searchInput[key]} onChange={event => setSearchInput(current => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#DDE3EA] bg-white px-4 py-3 font-normal text-[#07111F]">
                  <option value=""><LText text="Todas as opções" /></option>
                  {options.map(([value, text]) => <option key={value} value={value}><LText text={text} /></option>)}
                </select>
              </label>
            ))}
            <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" className="rounded-full bg-[#07111F] px-6 py-3 font-semibold text-white"><LText text="Pesquisar" /></button>
              <button type="button" onClick={() => { setSearchInput(emptySearch); setFilters(current => ({ ...current, ...emptySearch, page: 1 })); }} className="rounded-full border border-[#DDE3EA] px-6 py-3 font-semibold"><LText text="Limpar filtros" /></button>
            </div>
          </fieldset>
        </form>
        <section className="mb-6 rounded-3xl border border-[#DDE3EA] bg-white p-5">
          <h2 className="text-lg font-semibold"><LText text="Pedir acesso a um perfil" /></h2>
          <p className="mt-2 text-sm leading-6 text-slate-600"><LText text="Posso explorar sem publicar uma vaga. Para pedir autorização, escolho uma vaga ativa e o candidato decide se quer partilhar o perfil comigo. A vaga escolhida não altera os resultados da pesquisa." /></p>
          <label className="mt-4 block max-w-xl text-sm font-semibold"><LText text="Vaga para o pedido" />
            <select disabled={!!sendingId} value={filters.jobId} onChange={event => { setFeedback(""); setFilters(current => ({ ...current, jobId: event.target.value })); }} className="mt-2 w-full rounded-xl border border-[#DDE3EA] bg-white px-4 py-3 font-normal">
              <option value=""><LText text="Escolher uma vaga para pedir autorização" /></option>
              {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
        </section>
        {!jobs.length && company && <p className="mb-6 text-sm"><LText text={"Podes consultar os candidatos. "} /><Link href="/empresa/vagas/nova" className="text-[#1683FF] underline"><LText text={"Publica uma vaga"} /></Link> <LText text={" para enviar pedidos."} /></p>}
        {feedback && <p role="status" className="mb-6 rounded-xl bg-white p-4 text-sm"><LText text={feedback} /></p>}
        {error && <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"><LText text={error} /> <button type="button" onClick={() => company ? setReload(current => current + 1) : setInitializationAttempt(current => current + 1)} className="underline"><LText text={"Tentar novamente"} /></button></div>}
        {loading ? <p role="status"><LText text={"A carregar candidatos…"} /></p> : (
          <>
            <p className="mb-4 text-sm text-slate-600">{total} <LText text={total === 1 ? "candidato disponível" : "candidatos disponíveis"} /></p>
            {!candidates.length && !error && <p className="rounded-3xl bg-white p-8"><LText text={"Não existem candidatos para esta pesquisa."} /></p>}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {candidates.map(candidate => (
                <article key={candidate.id} className="min-w-0 rounded-3xl border border-[#DDE3EA] bg-white p-6 [overflow-wrap:anywhere]">
                  <p className="mb-2 text-xs font-semibold text-[#1683FF]"><LText text={candidate.profiles ? "Identidade autorizada" : "Identidade protegida"} /></p>
                  <h2 className="text-lg font-semibold">{candidate.profiles?.name || candidate.profession || candidate.headline || <LText text="Candidato" />}</h2>
                  {candidate.profiles && <p className="mt-2 text-sm text-slate-600">{candidate.profession || candidate.headline}</p>}
                  <p className="mt-3 text-sm text-slate-600"><LText text={[candidate.desired_area, candidate.location, candidate.seniority, candidate.work_model].filter(Boolean).join(" · ")} /></p>
                  <div className="mt-5">
                    {candidate.profiles ? (
                      <Link href={`/empresa/candidatos/${candidate.id}${filters.jobId ? `?jobId=${filters.jobId}` : ""}`} className="font-semibold text-[#1683FF] underline"><LText text={"Ver perfil e contacto"} /></Link>
                    ) : candidate.contact_request_status ? (
                      <p className="text-sm"><LText text={candidate.contact_request_status === "pending" ? "Pedido enviado. A aguardar resposta." : candidate.contact_request_status === "rejected" ? "O candidato recusou este pedido." : "Contacto indisponível."} /></p>
                    ) : candidate.contact_visibility === "closed" ? (
                      <p className="text-sm"><LText text={"Este candidato não aceita pedidos de contacto."} /></p>
                    ) : (
                      <button type="button" disabled={!filters.jobId || !!sendingId || loading} onClick={() => requestContact(candidate)}
                        className="rounded-full bg-[#1683FF] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        <LText text={sendingId === candidate.id ? "A enviar…" : "Pedir autorização"} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {total > 24 && <LElement as="nav" aria-label="Páginas de candidatos" className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <button type="button" disabled={filters.page === 1 || loading || !!sendingId} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))} className="rounded-full border px-5 py-3 disabled:opacity-50"><LText text={"Anterior"} /></button>
              <span><LText text={"Página "} />{filters.page} <LText text={" de "} />{Math.ceil(total / 24)}</span>
              <button type="button" disabled={filters.page * 24 >= total || loading || !!sendingId} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))} className="rounded-full border px-5 py-3 disabled:opacity-50"><LText text={"Seguinte"} /></button>
            </LElement>}
          </>
        )}
      </div>
    </main>
  );
}
