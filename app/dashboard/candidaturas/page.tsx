"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompanyProfile = {
  company_name: string | null;
  logo_url: string | null;
};

type Job = {
  id: string;
  title: string;
  area: string | null;
  location: string | null;
  work_mode: string | null;
  company_profiles: CompanyProfile | CompanyProfile[] | null;
};

type RawApplication = {
  id: string;
  status: string | null;
  created_at: string;
  jobs: Job | Job[] | null;
};

type Application = {
  id: string;
  status: string | null;
  created_at: string;
  jobs: Job | null;
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceite",
  rejected: "Rejeitada",
};

export default function CandidaturasPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!studentProfile) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("applications")
      .select(
        `
        id,
        status,
        created_at,
        jobs (
          id,
          title,
          area,
          location,
          work_mode,
          company_profiles (
            company_name,
            logo_url
          )
        )
      `
      )
      .eq("student_id", studentProfile.id)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setIsLoading(false);
      return;
    }

    const normalizedApplications = ((data || []) as RawApplication[]).map(
      (application) => {
        const job = Array.isArray(application.jobs)
          ? application.jobs[0] ?? null
          : application.jobs;

        const companyProfile = job
          ? Array.isArray(job.company_profiles)
            ? job.company_profiles[0] ?? null
            : job.company_profiles
          : null;

        return {
          id: application.id,
          status: application.status,
          created_at: application.created_at,
          jobs: job
            ? {
                ...job,
                company_profiles: companyProfile,
              }
            : null,
        };
      }
    );

    setApplications(normalizedApplications);
    setIsLoading(false);
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function getStatusLabel(status: string | null) {
    if (!status) {
      return "Pendente";
    }

    return statusLabels[status] || status;
  }

  function getStatusClass(status: string | null) {
    if (status === "accepted") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "rejected") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-[#1683FF]/20 bg-[#1683FF]/10 text-[#1683FF]";
  }

  const pendingCount = applications.filter(
    (application) => !application.status || application.status === "pending"
  ).length;

  const acceptedCount = applications.filter(
    (application) => application.status === "accepted"
  ).length;

  const rejectedCount = applications.filter(
    (application) => application.status === "rejected"
  ).length;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar candidaturas...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 overflow-hidden rounded-[32px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-10 md:py-12">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-32 h-40 w-40 rounded-full bg-[#4BB3FD]/20 blur-3xl" />

            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  Candidaturas
                </p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  Estado das tuas candidaturas.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  Acompanha as oportunidades às quais te candidataste, consulta
                  o estado de cada processo e volta rapidamente à vaga.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Pendentes" value={pendingCount} />
                <StatCard label="Aceites" value={acceptedCount} />
                <StatCard label="Rejeitadas" value={rejectedCount} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
              Histórico
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              Processos ativos
            </h2>
          </div>

          <div className="space-y-4">
            {applications.map((application) => {
              const job = application.jobs;
              const company = Array.isArray(job?.company_profiles)
                ? job?.company_profiles[0] ?? null
                : job?.company_profiles;

              return (
                <article
                  key={application.id}
                  className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 transition hover:border-[#1683FF]/30 hover:shadow-[0_20px_60px_rgba(7,17,31,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#07111F] to-[#1683FF] text-lg font-semibold text-white">
                        {company?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={company.logo_url}
                            alt={company.company_name || "Empresa"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (company?.company_name || "A")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                              application.status
                            )}`}
                          >
                            {getStatusLabel(application.status)}
                          </span>

                          <span className="text-xs font-medium text-slate-400">
                            {formatDate(application.created_at)}
                          </span>
                        </div>

                        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
                          {job?.title || "Vaga indisponível"}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {company?.company_name || "Empresa"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {job?.area && (
                            <Badge>{job.area}</Badge>
                          )}

                          {job?.location && (
                            <Badge>{job.location}</Badge>
                          )}

                          {job?.work_mode && (
                            <Badge>{job.work_mode}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {job?.id && (
                      <Link
                        href={`/vagas/${job.id}`}
                        className="rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                      >
                        Ver vaga
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}

            {applications.length === 0 && (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-12 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  Ainda não tens candidaturas.
                </h2>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Explora vagas compatíveis e candidata-te às oportunidades que
                  mais se alinham com o teu perfil.
                </p>

                <Link
                  href="/vagas"
                  className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                >
                  Explorar vagas
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
    <div className="min-w-[110px] rounded-[24px] border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
      <p className="text-xs font-medium text-white/60">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
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