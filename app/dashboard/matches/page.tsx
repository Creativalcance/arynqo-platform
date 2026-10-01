"use client";
import { localizedAlert } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText } from "@/lib/i18n/client";


import { authenticatedFetch } from "@/lib/authenticated-fetch";

import Link from "@/lib/i18n/link";
import { useEffect, useMemo, useState } from "react";
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
  work_model: string | null;
  contract_type: string | null;
  seniority: string | null;
  company_profiles: CompanyProfile | CompanyProfile[] | null;
};

type RawMatch = {
  id: string;
  job_id: string;
  match_score: number;
  skills_score: number;
  role_score: number;
  seniority_score: number;
  location_score: number;
  work_model_score: number;
  salary_score: number;
  education_language_score: number;
  ai_reason: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  jobs: Job | Job[] | null;
};

type Match = {
  id: string;
  job_id: string;
  match_score: number;
  skills_score: number;
  role_score: number;
  seniority_score: number;
  location_score: number;
  work_model_score: number;
  salary_score: number;
  education_language_score: number;
  ai_reason: string;
  strengths: string[];
  gaps: string[];
  job: Job | null;
};

type CandidateAction = {
  job_id: string;
  action_type: string;
};

const workModelLabels: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  presential: "Presencial",
};

export default function CandidateMatchesPage() {
  const [studentId, setStudentId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [actions, setActions] = useState<CandidateAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = browserLocalizedPath("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      setIsLoading(false);
      return;
    }

    setStudentId(profile.id);

    const { data: actionsData } = await supabase
      .from("candidate_actions")
      .select("job_id, action_type")
      .eq("student_id", profile.id);

    setActions((actionsData || []) as CandidateAction[]);

    const { data, error } = await supabase
      .from("ai_matches")
      .select(
        `
        id,
        job_id,
        match_score,
        skills_score,
        role_score,
        seniority_score,
        location_score,
        work_model_score,
        salary_score,
        education_language_score,
        ai_reason,
        strengths,
        gaps,
        jobs (
          id,
          title,
          area,
          location,
          work_model,
          contract_type,
          seniority,
          company_profiles (
            company_name,
            logo_url
          )
        )
      `
      )
      .eq("student_id", profile.id)
      .order("match_score", { ascending: false });

    if (error) {
      console.error(error);
      setMatches([]);
      setIsLoading(false);
      return;
    }

    const normalizedMatches = ((data || []) as RawMatch[]).map((match) => {
      const job = Array.isArray(match.jobs)
        ? match.jobs[0] ?? null
        : match.jobs;

      const company = job
        ? Array.isArray(job.company_profiles)
          ? job.company_profiles[0] ?? null
          : job.company_profiles
        : null;

      return {
        id: match.id,
        job_id: match.job_id,
        match_score: match.match_score || 0,
        skills_score: match.skills_score || 0,
        role_score: match.role_score || 0,
        seniority_score: match.seniority_score || 0,
        location_score: match.location_score || 0,
        work_model_score: match.work_model_score || 0,
        salary_score: match.salary_score || 0,
        education_language_score: match.education_language_score || 0,
        ai_reason: match.ai_reason || "Resultado anterior: recalcula para obter os critérios e a cobertura de informação.",
        strengths: match.strengths || [],
        gaps: match.gaps || [],
        job: job
          ? {
              ...job,
              company_profiles: company,
            }
          : null,
      };
    });

    setMatches(normalizedMatches);
    setIsLoading(false);
  }

  function hasAction(jobId: string, actionType: string) {
    return actions.some(
      (action) => action.job_id === jobId && action.action_type === actionType
    );
  }

  async function handleAction(jobId: string, actionType: "saved" | "ignored") {
    if (!studentId) {
      return;
    }

    if (hasAction(jobId, actionType)) {
      const { error } = await supabase
        .from("candidate_actions")
        .delete()
        .eq("student_id", studentId)
        .eq("job_id", jobId)
        .eq("action_type", actionType);

      if (error) {
        localizedAlert(error.message);
        return;
      }

      setActions((current) =>
        current.filter(
          (action) =>
            !(action.job_id === jobId && action.action_type === actionType)
        )
      );

      return;
    }

    const { error } = await supabase.from("candidate_actions").insert({
      student_id: studentId,
      job_id: jobId,
      action_type: actionType,
    });

    if (error) {
      localizedAlert(error.message);
      return;
    }

    setActions((current) => [...current, { job_id: jobId, action_type: actionType }]);
  }

  async function regenerateMatches() {
    if (!studentId) {
      return;
    }

    setIsRegenerating(true);

    try {
      await authenticatedFetch("/api/ai/generate-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
        }),
      });

      await loadMatches();
    } catch (error) {
      console.error(error);
      localizedAlert("Não foi possível recalcular os matches.");
    }

    setIsRegenerating(false);
  }

  const visibleMatches = useMemo(() => {
    return matches.filter(
      (match) => !hasAction(match.job?.id || "", "ignored")
    );
  }, [matches, actions]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar matches..."} /></p>
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
                  <LText text={"AI Matching"} /></p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  <LText text={"Vagas compatíveis contigo."} /></h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  <LText text={"Ranking inteligente baseado no teu perfil, competências, preferências, senioridade e objetivos profissionais."} /></p>
              </div>

              <button
                type="button"
                onClick={regenerateMatches}
                disabled={isRegenerating}
                className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LText text={isRegenerating ? "A recalcular..." : "Recalcular matches"} />
              </button>
            </div>
          </div>
        </section>

        {visibleMatches.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              <LText text={"Ainda não existem matches disponíveis."} /></h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              <LText text={"Importa o teu CV, melhora o perfil com IA ou recalcula os matches para encontrar vagas compatíveis."} /></p>

            <button
              type="button"
              onClick={regenerateMatches}
              disabled={isRegenerating}
              className="mt-6 rounded-full bg-[#1683FF] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#07111F]"
            >
              <LText text={isRegenerating ? "A recalcular..." : "Gerar matches"} />
            </button>
          </section>
        ) : (
          <div className="grid gap-6">
            {visibleMatches.map((match) => {
              const job = match.job;
              const company = job?.company_profiles as CompanyProfile | null;

              if (!job) {
                return null;
              }

              return (
                <article
                  key={match.id}
                  className="overflow-hidden rounded-[32px] border border-[#DDE3EA] bg-white shadow-[0_24px_80px_rgba(7,17,31,0.06)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                    <div className="flex flex-col justify-between bg-[#07111F] p-8 text-white">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD]">
                          <LText text={"Índice de compatibilidade"} /></p>

                        <p className="mt-4 text-6xl font-semibold tracking-[-0.08em]">
                          {match.match_score}%
                        </p>
                      </div>

                      <div className="mt-10 space-y-3 text-sm text-white/60">
                        <p><LText text={"Skills: "} />{match.skills_score}%</p>
                        <p><LText text={"Função: "} />{match.role_score}%</p>
                        <p><LText text={"Localização: "} />{match.location_score}%</p>
                        <p><LText text={"Modelo: "} />{match.work_model_score}%</p>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="flex flex-wrap items-start justify-between gap-6">
                        <div>
                          <p className="text-sm font-medium text-slate-500">
                            {company?.company_name || <LText text="Empresa" />}
                          </p>

                          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#07111F]">
                            {job.title}
                          </h2>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {job.area && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                <LText text={job.area} />
                              </span>
                            )}

                            {job.location && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                {job.location}
                              </span>
                            )}

                            {job.work_model && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                <LText text={workModelLabels[job.work_model] || job.work_model} />
                              </span>
                            )}

                            {job.contract_type && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                <LText text={job.contract_type} />
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/vagas/${job.id}`}
                          className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
                        >
                          <LText text={"Ver vaga"} /></Link>
                      </div>

                      <div className="mt-8 rounded-[24px] bg-[#F7F9FC] p-5">
                        <p className="text-sm font-semibold text-[#07111F]">
                          <LText text={"Justificação IA"} /></p>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          <LText text={match.ai_reason} />
                        </p>
                      </div>

                      <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-semibold text-[#07111F]">
                            <LText text={"Pontos fortes"} /></p>

                          <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {match.strengths.length > 0 ? (
                              match.strengths.map((item) => (
                                <li key={item}>✓ <LText text={item} /></li>
                              ))
                            ) : (
                              <li><LText text={"Sem pontos fortes detalhados."} /></li>
                            )}
                          </ul>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-[#07111F]">
                            <LText text={"Gaps"} /></p>

                          <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {match.gaps.length > 0 ? (
                              match.gaps.map((item) => (
                                <li key={item}>• <LText text={item} /></li>
                              ))
                            ) : (
                              <li><LText text={"Sem gaps relevantes identificados."} /></li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleAction(job.id, "saved")}
                          className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                            hasAction(job.id, "saved")
                              ? "bg-[#07111F] text-white"
                              : "border border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF] hover:text-[#1683FF]"
                          }`}
                        >
                          <LText text={hasAction(job.id, "saved") ? "Guardada" : "Guardar"} />
                        </button>

                        <Link href={`/vagas/${job.id}`} className="rounded-full bg-[#1683FF]/10 px-5 py-3 text-sm font-semibold text-[#1683FF] transition hover:bg-[#1683FF] hover:text-white">
                          <LText text={"Candidatar-me"} /></Link>

                        <button
                          type="button"
                          onClick={() => handleAction(job.id, "ignored")}
                          className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-500"
                        >
                          <LText text={"Ignorar"} /></button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
