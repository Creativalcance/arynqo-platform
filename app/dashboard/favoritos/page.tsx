"use client";
import { localizedAlert } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText, LElement, useI18n } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
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

type RawSavedJob = {
  id: string;
  created_at: string;
  jobs: Job | Job[] | null;
};

type SavedJob = {
  id: string;
  created_at: string;
  jobs: Job | null;
};

export default function FavoritosPage() {
  const { locale: displayLocale } = useI18n();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  async function loadSavedJobs() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = browserLocalizedPath("/login");
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
      .from("saved_jobs")
      .select(
        `
        id,
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
      localizedAlert(error.message);
      setIsLoading(false);
      return;
    }

    const normalizedSavedJobs = ((data || []) as RawSavedJob[]).map(
      (savedJob) => {
        const job = Array.isArray(savedJob.jobs)
          ? savedJob.jobs[0] ?? null
          : savedJob.jobs;

        const companyProfile = job
          ? Array.isArray(job.company_profiles)
            ? job.company_profiles[0] ?? null
            : job.company_profiles
          : null;

        return {
          id: savedJob.id,
          created_at: savedJob.created_at,
          jobs: job
            ? {
                ...job,
                company_profiles: companyProfile,
              }
            : null,
        };
      }
    );

    setSavedJobs(normalizedSavedJobs);
    setIsLoading(false);
  }

  async function removeSavedJob(savedJobId: string) {
    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("id", savedJobId);

    if (error) {
      localizedAlert(error.message);
      return;
    }

    setSavedJobs((currentSavedJobs) =>
      currentSavedJobs.filter((savedJob) => savedJob.id !== savedJobId)
    );
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(displayLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar favoritos..."} /></p>
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
                  <LText text={"Favoritos"} /></p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  <LText text={"Vagas guardadas."} /></h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  <LText text={"Consulta oportunidades que guardaste para analisar mais tarde, comparar ou candidatar-te quando estiveres pronto."} /></p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm font-medium text-white/70">
                  <LText text={"Total guardadas"} /></p>

                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
                  {savedJobs.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
              <LText text={"Oportunidades"} /></p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              <LText text={"Lista de favoritos"} /></h2>
          </div>

          <div className="space-y-4">
            {savedJobs.map((savedJob) => {
              const job = savedJob.jobs;
              const company = Array.isArray(job?.company_profiles)
                ? job?.company_profiles[0] ?? null
                : job?.company_profiles;

              return (
                <article
                  key={savedJob.id}
                  className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 transition hover:border-[#1683FF]/30 hover:shadow-[0_20px_60px_rgba(7,17,31,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#07111F] to-[#1683FF] text-lg font-semibold text-white">
                        {company?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <LElement as="img"
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
                        <p className="text-xs font-medium text-slate-400">
                          <LText text={"Guardada em "} /><LText text={formatDate(savedJob.created_at)} />
                        </p>

                        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
                          <LText text={job?.title || "Vaga indisponível"} />
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {company?.company_name || <LText text="Empresa" />}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {job?.area && <Badge><LText text={job.area} /></Badge>}
                          {job?.location && <Badge>{job.location}</Badge>}
                          {job?.work_mode && <Badge><LText text={job.work_mode} /></Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {job?.id && (
                        <Link
                          href={`/vagas/${job.id}`}
                          className="rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                        >
                          <LText text={"Ver vaga"} /></Link>
                      )}

                      <button
                        type="button"
                        onClick={() => removeSavedJob(savedJob.id)}
                        className="rounded-full border border-[#DDE3EA] px-6 py-3 text-sm font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-500"
                      >
                        <LText text={"Remover"} /></button>
                    </div>
                  </div>
                </article>
              );
            })}

            {savedJobs.length === 0 && (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-12 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  <LText text={"Ainda não tens vagas guardadas."} /></h2>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  <LText text={"Guarda vagas para criares uma shortlist pessoal de oportunidades relevantes."} /></p>

                <Link
                  href="/vagas"
                  className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                >
                  <LText text={"Explorar vagas"} /></Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#DDE3EA] bg-[#F7F9FC] px-3 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}