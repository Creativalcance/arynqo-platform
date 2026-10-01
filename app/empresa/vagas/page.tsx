"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Job = {
  id: string;
  title: string;
  description: string;
  area: string | null;
  location: string | null;
  work_mode: "remote" | "presential" | "hybrid" | null;
  contract_type: string | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  created_at: string;
  expires_at: string | null;
  renewal_deadline: string | null;
};

const workModeLabels: Record<string, string> = {
  remote: "Remoto",
  presential: "Presencial",
  hybrid: "Híbrido",
};

export default function EmpresaVagasPage() {
  const [companyId, setCompanyId] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCompanyJobs();
  }, []);

  async function loadCompanyJobs() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!companyProfile) {
      alert("Apenas empresas podem aceder a esta página.");
      window.location.href = "/dashboard";
      return;
    }

    setCompanyId(companyProfile.id);

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        description,
        area,
        location,
        work_mode,
        contract_type,
        is_featured,
        is_active,
        created_at,
        expires_at,
        renewal_deadline
      `
      )
      .eq("company_id", companyProfile.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setIsLoading(false);
      return;
    }

    setJobs((data || []) as Job[]);
    setIsLoading(false);
  }

  async function toggleJobStatus(jobId: string, currentStatus: boolean | null) {
    if (!currentStatus) {
      const {error}=await supabase.rpc('renew_job_publication',{job_id:jobId});
      if(error){alert('Não foi possível renovar a vaga.');return;}
      await loadCompanyJobs();return;
    }
    const { error } = await supabase
      .from("jobs")
      .update({
        is_active: !currentStatus,
      })
      .eq("id", jobId)
      .eq("company_id", companyId);

    if (error) {
      alert(error.message);
      return;
    }

    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job.id === jobId ? { ...job, is_active: !currentStatus } : job
      )
    );
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  }

  const activeJobs = jobs.filter((job) => job.is_active).length;
  const inactiveJobs = jobs.filter((job) => !job.is_active).length;
  const featuredJobs = jobs.filter((job) => job.is_featured).length;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar vagas da empresa...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  Gestão de vagas
                </p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  As vagas da sua empresa.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  Consulte oportunidades publicadas, ative ou desative vagas,
                  veja candidatos compatíveis e acompanhe o processo de
                  recrutamento.
                </p>
              </div>

              <Link
                href="/empresa/vagas/nova"
                className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
              >
                Publicar nova vaga
              </Link>
            </div>

            <div className="relative mt-10 grid gap-4 md:grid-cols-3">
              <StatCard label="Vagas ativas" value={activeJobs} />
              <StatCard label="Inativas" value={inactiveJobs} />
              <StatCard label="Em destaque" value={featuredJobs} />
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Backoffice
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Lista de vagas publicadas
              </h2>
            </div>

            <p className="text-sm font-medium text-slate-500">
              {jobs.length} vaga{jobs.length === 1 ? "" : "s"} registada
              {jobs.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-4">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 transition hover:border-[#1683FF]/30 hover:shadow-[0_20px_60px_rgba(7,17,31,0.08)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={
                          job.is_active
                            ? "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500"
                        }
                      >
                        {job.is_active ? "Ativa" : "Inativa"}
                      </span>

                      {job.is_featured && (
                        <span className="rounded-full border border-[#1683FF]/20 bg-[#1683FF]/10 px-3 py-1 text-xs font-semibold text-[#1683FF]">
                          Destaque
                        </span>
                      )}

                      <span className="text-xs font-medium text-slate-400">
                        Publicada em {formatDate(job.created_at)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
                      {job.title}
                    </h3>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {job.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {job.area && <Badge>{job.area}</Badge>}
                      {job.location && <Badge>{job.location}</Badge>}

                      {job.work_mode && (
                        <Badge>{workModeLabels[job.work_mode]}</Badge>
                      )}

                      {job.contract_type && <Badge>{job.contract_type}</Badge>}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <Link href={`/empresa/candidatos?jobId=${job.id}`} className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold">Ver candidaturas</Link>
                    {job.is_active && job.renewal_deadline && <div className="w-full rounded-xl bg-amber-50 p-4 text-sm"><p>Confirma até {new Date(job.renewal_deadline).toLocaleDateString('pt-PT')} se continuas a recrutar.</p><button className="mt-2 font-semibold underline" onClick={async()=>{const {error}=await supabase.rpc('renew_job_publication',{job_id:job.id});if(error)alert('Não foi possível renovar a vaga.');else await loadCompanyJobs();}}>Sim, renovar por 30 dias</button><button className="ml-4 underline" onClick={()=>toggleJobStatus(job.id,true)}>Não, desativar</button></div>}
                    <Link
                      href={`/empresa/matches?jobId=${job.id}`}
                      className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                    >
                      Ver matches
                    </Link>

                    <Link
                      href={`/empresa/vagas/${job.id}/editar`}
                      className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
                    >
                      Editar
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleJobStatus(job.id, job.is_active)}
                      className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold text-slate-500 transition hover:border-[#1683FF] hover:text-[#1683FF]"
                    >
                      {job.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {jobs.length === 0 && (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-12 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  Ainda não existem vagas publicadas.
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
                  Crie a primeira oportunidade para começar a receber
                  candidaturas e gerar candidatos compatíveis através do motor
                  de matching da ARYNQO.
                </p>

                <Link
                  href="/empresa/vagas/nova"
                  className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                >
                  Publicar primeira vaga
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
      <p className="text-sm font-medium text-white/60">{label}</p>

      <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
        {value}
      </p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#DDE3EA] bg-[#F7F9FC] px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}
