"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/create-notification";
import CompanyLaunchOffer from "@/app/components/arynqo/CompanyLaunchOffer";

type Candidate = {
  id: string;
  headline: string | null;
  location: string | null;
  desired_area: string | null;
  seniority: string | null;
  contact_visibility: string | null;
  profiles: { name: string | null; email: string | null } | null;
  has_application: boolean;
  contact_request_status: "pending" | "accepted" | "rejected" | null;
};
type Job = { id: string; title: string };
type Company = { id: string; company_name: string | null };

export default function CompanyTalentDirectory() {
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState({ jobId: "", query: "", page: 1 });
  const [searchInput, setSearchInput] = useState("");
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
        if (!session) { window.location.assign("/login"); return; }
        const { data, error: companyError } = await supabase.from("company_profiles")
          .select("id,company_name").eq("user_id", session.user.id).single();
        if (companyError || !data) throw new Error("Esta área está disponível para contas de empresa.");
        const { data: jobData, error: jobError } = await supabase.from("jobs")
          .select("id,title,renewal_deadline").eq("company_id", data.id).eq("is_active", true).order("created_at", { ascending: false });
        if (jobError) throw new Error("Não foi possível carregar as vagas.");
        const activeJobs = (jobData || []).filter(job => !job.renewal_deadline || new Date(job.renewal_deadline).getTime() > Date.now());
        if (!cancelled) {
          setJobs(activeJobs);
          setFilters(current => ({ ...current, jobId: activeJobs[0]?.id || "" }));
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
      const { data, error: directoryError } = await supabase.rpc("company_candidate_directory", {
        target_job_id: filters.jobId || null, search_text: filters.query, page_number: filters.page,
      });
      if (cancelled) return;
      if (directoryError) {
        setCandidates([]); setTotal(0); setError("Não foi possível carregar os candidatos. Tenta novamente.");
      } else {
        setCandidates(data?.items || []); setTotal(data?.total || 0);
      }
      setLoading(false);
    }
    void loadDirectory();
    return () => { cancelled = true; };
  }, [company, filters, reload]);

  async function requestContact(candidate: Candidate) {
    if (!company || !filters.jobId || sendingId) return;
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
      setSendingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-[#07111F] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <CompanyLaunchOffer />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Explorar candidatos</h1>
          <Link href="/empresa/matches" className="font-semibold text-[#1683FF] underline">Ver compatibilidade por vaga</Link>
        </div>
        <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-600">Consulta todos os perfis disponíveis, incluindo candidatos que ainda não têm um match calculado. Pesquisa por função, área ou localização. Escolhe uma vaga ativa para enviar um pedido de contacto.</p>
        <form onSubmit={event => { event.preventDefault(); setFilters(current => ({ ...current, query: searchInput.trim(), page: 1 })); }}
          className="mb-6 grid gap-4 rounded-3xl border border-[#DDE3EA] bg-white p-5 md:grid-cols-[1fr_1fr_auto]">
          <label className="min-w-0 text-sm font-semibold">Pesquisar candidatos
            <input maxLength={100} value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Função, área ou localização"
              className="mt-2 w-full rounded-xl border border-[#DDE3EA] px-4 py-3 font-normal" />
          </label>
          <label className="min-w-0 text-sm font-semibold">Vaga para o pedido
            <select disabled={!!sendingId} value={filters.jobId} onChange={event => { setFeedback(""); setFilters(current => ({ ...current, jobId: event.target.value, page: 1 })); }}
              className="mt-2 w-full rounded-xl border border-[#DDE3EA] bg-white px-4 py-3 font-normal">
              {!jobs.length && <option value="">Sem vagas ativas</option>}
              {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
          <button type="submit" className="self-end rounded-full bg-[#07111F] px-6 py-3 font-semibold text-white">Pesquisar</button>
        </form>
        {!jobs.length && company && <p className="mb-6 text-sm">Podes consultar os candidatos. <Link href="/empresa/vagas/nova" className="text-[#1683FF] underline">Publica uma vaga</Link> para enviar pedidos.</p>}
        {feedback && <p role="status" className="mb-6 rounded-xl bg-white p-4 text-sm">{feedback}</p>}
        {error && <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" onClick={() => company ? setReload(current => current + 1) : setInitializationAttempt(current => current + 1)} className="underline">Tentar novamente</button></div>}
        {loading ? <p role="status">A carregar candidatos…</p> : (
          <>
            <p className="mb-4 text-sm text-slate-600">{total} {total === 1 ? "candidato disponível" : "candidatos disponíveis"}</p>
            {!candidates.length && !error && <p className="rounded-3xl bg-white p-8">Não existem candidatos para esta pesquisa.</p>}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {candidates.map(candidate => (
                <article key={candidate.id} className="min-w-0 rounded-3xl border border-[#DDE3EA] bg-white p-6 [overflow-wrap:anywhere]">
                  <p className="mb-2 text-xs font-semibold text-[#1683FF]">{candidate.profiles ? "Identidade autorizada" : "Identidade protegida"}</p>
                  <h2 className="text-lg font-semibold">{candidate.profiles?.name || candidate.headline || "Candidato"}</h2>
                  {candidate.profiles && <p className="mt-2 text-sm text-slate-600">{candidate.headline}</p>}
                  <p className="mt-3 text-sm text-slate-600">{[candidate.desired_area, candidate.location, candidate.seniority].filter(Boolean).join(" · ")}</p>
                  <div className="mt-5">
                    {candidate.profiles ? (
                      <Link href={`/empresa/candidatos/${candidate.id}${filters.jobId ? `?jobId=${filters.jobId}` : ""}`} className="font-semibold text-[#1683FF] underline">Ver perfil e contacto</Link>
                    ) : candidate.contact_request_status ? (
                      <p className="text-sm">{candidate.contact_request_status === "pending" ? "Pedido enviado. A aguardar resposta." : candidate.contact_request_status === "rejected" ? "O candidato recusou este pedido." : "Contacto indisponível."}</p>
                    ) : candidate.contact_visibility === "closed" ? (
                      <p className="text-sm">Este candidato não aceita pedidos de contacto.</p>
                    ) : (
                      <button type="button" disabled={!filters.jobId || !!sendingId || loading} onClick={() => requestContact(candidate)}
                        className="rounded-full bg-[#1683FF] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        {sendingId === candidate.id ? "A enviar…" : "Pedir autorização"}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {total > 24 && <nav aria-label="Páginas de candidatos" className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <button type="button" disabled={filters.page === 1 || loading || !!sendingId} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))} className="rounded-full border px-5 py-3 disabled:opacity-50">Anterior</button>
              <span>Página {filters.page} de {Math.ceil(total / 24)}</span>
              <button type="button" disabled={filters.page * 24 >= total || loading || !!sendingId} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))} className="rounded-full border px-5 py-3 disabled:opacity-50">Seguinte</button>
            </nav>}
          </>
        )}
      </div>
    </main>
  );
}
