"use client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MobileBottomNav from "@/app/components/arynqo/MobileBottomNav";
import { createNotification } from "@/lib/create-notification";
import { supabase } from "@/lib/supabase";
import { useAppJobs } from "../../../hooks/useAppJobs";

type StudentProfile = {
  id: string;
};

type AIMatch = {
  match_score: number;
  skills_score: number | null;
  role_score: number | null;
  seniority_score: number | null;
  location_score: number | null;
  work_model_score: number | null;
  salary_score: number | null;
  education_language_score: number | null;
  opportunity_type_score: number | null;
  strengths: string[] | null;
  gaps: string[] | null;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  ai_recommendations: string[] | null;
  ai_reason: string | null;
};

type ApplicationInsertResponse = {
  id: string;
};

type CompanyProfileRelation = {
  user_id: string;
};

type JobWithCompany = {
  title: string;
  company_profiles: CompanyProfileRelation | CompanyProfileRelation[] | null;
};

function normalizeCompanyProfile(
  companyProfiles: CompanyProfileRelation | CompanyProfileRelation[] | null,
) {
  if (Array.isArray(companyProfiles)) {
    return companyProfiles[0] ?? null;
  }

  return companyProfiles;
}

function ScoreItem({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const safeValue = value ?? 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/58">{label}</p>
        <p className="text-sm font-semibold text-cyan-200">{safeValue}%</p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function TagList({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "success" | "warning";
}) {
  if (items.length === 0) {
    return null;
  }

  const className =
    tone === "success"
      ? "rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1 text-xs text-emerald-100"
      : tone === "warning"
        ? "rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-3 py-1 text-xs text-amber-100"
        : "rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1 text-xs text-cyan-100";

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        {title}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={className}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function AppVagaDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const { jobs, isLoading, reloadJobs } = useAppJobs();

  const [studentProfile, setStudentProfile] =
    useState<StudentProfile | null>(null);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
  const [aiMatch, setAiMatch] = useState<AIMatch | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [isGeneratingMatch, setIsGeneratingMatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const job = jobs.find((item) => item.id === jobId);

  useEffect(() => {
    loadStudentAndJobStatus();
  }, [jobId]);

  async function loadStudentAndJobStatus() {
    setIsLoadingStatus(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setStudentProfile(null);
      setSavedJobId(null);
      setAiMatch(null);
      setIsLoadingStatus(false);
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: student } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!student) {
      setStudentProfile(null);
      setSavedJobId(null);
      setAiMatch(null);
      setIsLoadingStatus(false);
      return;
    }

    const currentStudent = student as StudentProfile;

    setStudentProfile(currentStudent);

    const [{ data: savedJob }, { data: match }] = await Promise.all([
      supabase
        .from("saved_jobs")
        .select("id")
        .eq("student_id", currentStudent.id)
        .eq("job_id", jobId)
        .maybeSingle(),
      supabase
        .from("ai_matches")
        .select(
          `
          match_score,
          skills_score,
          role_score,
          seniority_score,
          location_score,
          work_model_score,
          salary_score,
          education_language_score,
          opportunity_type_score,
          strengths,
          gaps,
          matching_skills,
          missing_skills,
          ai_recommendations,
          ai_reason
        `,
        )
        .eq("student_id", currentStudent.id)
        .eq("job_id", jobId)
        .maybeSingle(),
    ]);

    setSavedJobId(savedJob?.id || null);
    setAiMatch((match as AIMatch) || null);
    setIsLoadingStatus(false);
  }

  async function generateMatchForCurrentStudent() {
    if (!studentProfile) {
      setStatusMessage("Apenas candidatos podem calcular match com vagas.");
      return;
    }

    setIsGeneratingMatch(true);
    setStatusMessage("");

    try {
      const response = await authenticatedFetch("/api/ai/generate-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: studentProfile.id,
          jobId,
        }),
      });

      if (!response.ok) {
        setStatusMessage("Não foi possível calcular o match neste momento.");
        setIsGeneratingMatch(false);
        return;
      }

      const { data: match } = await supabase
        .from("ai_matches")
        .select(
          `
          match_score,
          skills_score,
          role_score,
          seniority_score,
          location_score,
          work_model_score,
          salary_score,
          education_language_score,
          opportunity_type_score,
          strengths,
          gaps,
          matching_skills,
          missing_skills,
          ai_recommendations,
          ai_reason
        `,
        )
        .eq("student_id", studentProfile.id)
        .eq("job_id", jobId)
        .maybeSingle();

      setAiMatch((match as AIMatch) || null);
      await reloadJobs();
      setStatusMessage("Match calculado com sucesso.");
    } catch (error) {
      console.error("Erro ao gerar match:", error);
      setStatusMessage("Erro ao calcular match com IA.");
    }

    setIsGeneratingMatch(false);
  }

  async function notifyCompanyAboutApplication(
    studentId: string,
    applicationId: string,
  ) {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        title,
        company_profiles (
          user_id
        )
      `,
      )
      .eq("id", jobId)
      .single();

    if (error || !data) {
      console.error(error);
      return;
    }

    const jobData = data as JobWithCompany;
    const companyProfile = normalizeCompanyProfile(jobData.company_profiles);

    if (!companyProfile?.user_id) {
      return;
    }

    try {
      await createNotification({
        userId: companyProfile.user_id,
        title: "Nova candidatura recebida",
        message: `Recebeste uma nova candidatura para a vaga "${jobData.title}".`,
        relatedType: "application",
        relatedId: applicationId,
        relatedUrl: `/empresa/candidatos/${studentId}?jobId=${jobId}`,
        actionLabel: "Ver candidato",
        channels: ["in_app", "email", "push"],
      });
    } catch (notificationError) {
      console.error("Erro ao criar notificação:", notificationError);
    }
  }

  async function handleApply() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    if (!studentProfile) {
      setStatusMessage("Apenas candidatos podem candidatar-se.");
      return;
    }

    if (isApplying) return;
    setIsApplying(true);
    setStatusMessage("");

    const { data: applicationData, error } = await supabase
      .from("applications")
      .insert({
        job_id: jobId,
        student_id: studentProfile.id,
      })
      .select("id")
      .single();

    if (error) {
      setStatusMessage(error.code === "23505" ? "Já enviaste uma candidatura para esta vaga." : error.code === "P0001" ? "Não foi possível enviar a candidatura. Confirma que a vaga continua disponível." : "Não foi possível enviar a candidatura. Tenta novamente.");
      setIsApplying(false);
      return;
    }

    await generateMatchForCurrentStudent();

    await notifyCompanyAboutApplication(
      studentProfile.id,
      (applicationData as ApplicationInsertResponse).id,
    );

    setStatusMessage("Candidatura enviada com sucesso.");
    setIsApplying(false);
  }

  async function handleToggleSaveJob() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    if (!studentProfile) {
      setStatusMessage("Apenas candidatos podem guardar vagas.");
      return;
    }

    setIsSavingJob(true);
    setStatusMessage("");

    if (savedJobId) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("id", savedJobId);

      if (error) {
        setStatusMessage(error.message);
        setIsSavingJob(false);
        return;
      }

      setSavedJobId(null);
      setStatusMessage("Vaga removida dos favoritos.");
      setIsSavingJob(false);
      return;
    }

    const { data, error } = await supabase
      .from("saved_jobs")
      .insert({
        job_id: jobId,
        student_id: studentProfile.id,
      })
      .select("id")
      .single();

    if (error) {
      setStatusMessage(error.message);
      setIsSavingJob(false);
      return;
    }

    setSavedJobId(data.id);
    setStatusMessage("Vaga guardada nos favoritos.");
    setIsSavingJob(false);
  }

  if (isLoading || isLoadingStatus) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
        <section className="mx-auto w-full max-w-md">
          <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-10 w-64 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-64 animate-pulse rounded-[2rem] bg-white/10" />
          <div className="mt-5 h-40 animate-pulse rounded-3xl bg-white/10" />
        </section>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-6 pb-28">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            ARYNQO
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Vaga não encontrada
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/60">
            Esta oportunidade já não está disponível ou não está ativa.
          </p>

          <Link
            href="/app/vagas"
            className="mt-8 rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
          >
            Voltar às vagas
          </Link>
        </section>

        <MobileBottomNav />
      </main>
    );
  }

  const matchScore = aiMatch?.match_score ?? job.score;
  const hasScore = matchScore > 0;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-28">
        <header>
          <Link
            href="/app/vagas"
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            ← Voltar às vagas
          </Link>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            ARYNQO
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {job.title}
          </h1>

          <p className="mt-3 text-sm text-white/58">{job.company}</p>
        </header>

        {statusMessage && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-sm leading-6 text-cyan-100/85">
              {statusMessage}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm text-white/60">Compatibilidade IA</p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight">
                  {hasScore ? matchScore : "—"}
                </span>

                {hasScore && (
                  <span className="mb-2 text-sm text-cyan-300">%</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={generateMatchForCurrentStudent}
              disabled={isGeneratingMatch || !studentProfile}
              className="rounded-2xl bg-cyan-400/10 px-3 py-2 text-center text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingMatch ? "A calcular..." : "Calcular match"}
            </button>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
              style={{ width: `${hasScore ? matchScore : 0}%` }}
            />
          </div>

          {!studentProfile && (
            <p className="mt-4 text-sm leading-6 text-white/55">
              Entra como candidato/profissional para calcular o teu match com
              esta vaga.
            </p>
          )}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs text-white/40">Área</p>
            <p className="mt-1 text-sm font-medium">
              {job.area || "Não definida"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs text-white/40">Modelo</p>
            <p className="mt-1 text-sm font-medium">
              {job.rawWorkModel || job.model}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs text-white/40">Tipo</p>
            <p className="mt-1 text-sm font-medium">{job.type}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs text-white/40">Localização</p>
            <p className="mt-1 text-sm font-medium">{job.location}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Descrição
          </p>

          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/65">
            {job.description}
          </p>
        </section>

        {job.candidatePitch && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/60">
              Enquadramento da vaga
            </p>

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/65">
              {job.candidatePitch}
            </p>
          </section>
        )}

        {aiMatch?.ai_reason && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/60">
              Leitura IA
            </p>

            <p className="mt-3 text-sm leading-6 text-white/65">
              {aiMatch.ai_reason}
            </p>
          </section>
        )}

        {aiMatch && (
          <section className="mt-5 grid gap-3">
            <ScoreItem label="Skills" value={aiMatch.skills_score} />
            <ScoreItem label="Área/Função" value={aiMatch.role_score} />
            <ScoreItem label="Senioridade" value={aiMatch.seniority_score} />
            <ScoreItem label="Localização" value={aiMatch.location_score} />
            <ScoreItem label="Modelo" value={aiMatch.work_model_score} />
            <ScoreItem
              label="Tipo oportunidade"
              value={aiMatch.opportunity_type_score}
            />
          </section>
        )}

        <div className="mt-5 grid gap-3">
          <TagList
            title="Skills obrigatórias"
            items={job.requiredSkills}
            tone="success"
          />

          <TagList
            title="Skills preferenciais"
            items={job.preferredSkills}
            tone="neutral"
          />

          <TagList
            title="Skills em comum"
            items={aiMatch?.matching_skills || []}
            tone="success"
          />

          <TagList
            title="A validar"
            items={aiMatch?.gaps || []}
            tone="warning"
          />

          <TagList
            title="Recomendações IA"
            items={aiMatch?.ai_recommendations || []}
            tone="neutral"
          />
        </div>

        {job.companyProfile && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
              Empresa
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-xl font-semibold">
                {job.companyProfile.logo_url ? (
                  <img
                    src={job.companyProfile.logo_url}
                    alt={job.company}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  job.company.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <p className="text-base font-semibold">{job.company}</p>

                <p className="mt-1 text-sm text-white/50">
                  {job.companyProfile.industry ||
                    job.companyProfile.location ||
                    "Empresa ARYNQO"}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplying ? "A candidatar..." : "Candidatar-me"}
          </button>

          <button
            type="button"
            onClick={handleToggleSaveJob}
            disabled={isSavingJob}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingJob
              ? "A guardar..."
              : savedJobId
                ? "Remover dos favoritos"
                : "Guardar vaga"}
          </button>
        </section>

        <MobileBottomNav />
      </section>
    </main>
  );
}