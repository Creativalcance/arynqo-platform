"use client";

import Image from "next/image";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

import { use, useEffect, useState } from "react";
import { createNotification } from "@/lib/create-notification";
import { supabase } from "@/lib/supabase";

type Company = {
  company_name: string;
  description: string | null;
  website_url: string | null;
  location: string | null;
  industry: string | null;
  company_type: string | null;
  company_size: string | null;
  logo_url: string | null;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  area: string | null;
  specializations: string[] | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  location: string | null;
  work_model: string | null;
  work_mode: string | null;
  opportunity_type: string | null;
  contract_type: string | null;
  seniority: string | null;
  languages: string[] | null;
  salary_range: string | null;
  education_requirements: string | null;
  experience_requirements: string | null;
  screening_questions: string[] | null;
  evaluation_criteria: string[] | null;
  candidate_pitch: string | null;
  ai_summary: string | null;
  created_at: string;
  company_profiles: Company | Company[] | null;
};

type StudentProfile = {
  id: string;
};

type CompanyProfileRelation = {
  user_id: string;
};

type JobWithCompany = {
  title: string;
  company_profiles: CompanyProfileRelation | CompanyProfileRelation[] | null;
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

export default function JobPage({
  params, initialJob,
}: {
  initialJob: Job;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [job] = useState<Job | null>(initialJob);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfile | null>(null);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
  const [aiMatch, setAiMatch] = useState<AIMatch | null>(null);
  const [isLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isGeneratingMatch, setIsGeneratingMatch] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadStudentAndSavedStatus() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: student } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!student) {
      return;
    }

    if (!active) return;
    setStudentProfile(student);

    const [{ data: savedJob }, { data: match }] = await Promise.all([
      supabase
        .from("saved_jobs")
        .select("id")
        .eq("student_id", student.id)
        .eq("job_id", id)
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
        `
        )
        .eq("student_id", student.id)
        .eq("job_id", id)
        .maybeSingle(),
    ]);

    if (!active) return;
    setSavedJobId(savedJob?.id || null);
    setAiMatch((match as AIMatch) || null);
  }

    void loadStudentAndSavedStatus().catch(() => { /* Public vacancy remains available if account data cannot load. */ });
    return () => { active = false; };
  }, [id]);

  async function generateMatchForCurrentStudent() {
    if (!studentProfile) {
      return;
    }

    setIsGeneratingMatch(true);

    try {
      const response = await authenticatedFetch("/api/ai/generate-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: studentProfile.id,
          jobId: id,
        }),
      });

      if (!response.ok) {
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
        `
        )
        .eq("student_id", studentProfile.id)
        .eq("job_id", id)
        .maybeSingle();

      setAiMatch((match as AIMatch) || null);
    } catch (error) {
      console.error("Erro ao gerar match:", error);
    }

    setIsGeneratingMatch(false);
  }

  async function notifyCompanyAboutApplication(
    studentId: string,
    applicationId: string
  ) {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        title,
        company_profiles (
          user_id
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error(error);
      return;
    }

    const jobData = data as JobWithCompany;

    const companyProfile = Array.isArray(jobData.company_profiles)
      ? jobData.company_profiles[0] ?? null
      : jobData.company_profiles;

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
        relatedUrl: `/empresa/candidatos/${studentId}?jobId=${id}`,
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
      window.location.href = `/login?next=${encodeURIComponent(`/vagas/${id}`)}`;
      return;
    }

    if (!studentProfile) {
      alert("Apenas candidatos podem candidatar-se.");
      return;
    }

    if (isApplying) return;
    setIsApplying(true);

    const { data: applicationData, error } = await supabase
      .from("applications")
      .insert({
        job_id: id,
        student_id: studentProfile.id,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.code === "23505" ? "Já enviaste uma candidatura para esta vaga." : error.code === "P0001" ? "Não foi possível enviar a candidatura. Confirma que a vaga continua disponível." : "Não foi possível enviar a candidatura. Tenta novamente.");
      setIsApplying(false);
      return;
    }

    await generateMatchForCurrentStudent();

    await notifyCompanyAboutApplication(
      studentProfile.id,
      (applicationData as ApplicationInsertResponse).id
    );

    alert("Candidatura enviada com sucesso.");
    setIsApplying(false);
  }

  async function handleToggleSaveJob() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = `/login?next=${encodeURIComponent(`/vagas/${id}`)}`;
      return;
    }

    if (!studentProfile) {
      alert("Apenas candidatos podem guardar vagas.");
      return;
    }

    if (savedJobId) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("id", savedJobId);

      if (error) {
        alert(error.message);
        return;
      }

      setSavedJobId(null);
      return;
    }

    const { data, error } = await supabase
      .from("saved_jobs")
      .insert({
        job_id: id,
        student_id: studentProfile.id,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setSavedJobId(data.id);
  }

  function getWorkModelLabel() {
    if (job?.work_model) {
      return job.work_model;
    }

    if (job?.work_mode === "remote") {
      return "Remoto";
    }

    if (job?.work_mode === "presential") {
      return "Presencial";
    }

    if (job?.work_mode === "hybrid") {
      return "Híbrido";
    }

    return "";
  }

  function getOpportunityTypeLabel() {
    return job?.opportunity_type || job?.contract_type || "";
  }

  if (isLoading || !job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-neutral-600">A carregar oportunidade...</p>
      </main>
    );
  }

  const company = Array.isArray(job.company_profiles)
    ? job.company_profiles[0]
    : job.company_profiles;

  const requiredSkills = job.required_skills || [];
  const preferredSkills = job.preferred_skills || [];
  const specializations = job.specializations || [];
  const languages = job.languages || [];
  const screeningQuestions = (job.screening_questions || []).slice(0, 3);
  const evaluationCriteria = job.evaluation_criteria || [];

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#07111F]">
      <section className="relative overflow-hidden border-b border-[#DDE3EA] bg-[#07111F]">
        <div className="absolute right-0 top-0 h-[520px] w-[520px] rounded-full bg-[#1683FF]/20 blur-3xl" />
        <div className="absolute bottom-0 left-20 h-[320px] w-[320px] rounded-full bg-[#4BB3FD]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-12">
          <div className="max-w-5xl">
            <div className="flex flex-wrap gap-3">
              {job.area && <HeroPill>{job.area}</HeroPill>}
              {getWorkModelLabel() && <HeroPill>{getWorkModelLabel()}</HeroPill>}
              {getOpportunityTypeLabel() && (
                <HeroPill>{getOpportunityTypeLabel()}</HeroPill>
              )}
              {job.seniority && <HeroPill>{job.seniority}</HeroPill>}
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-7xl">
              {job.title}
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-white/70">
              <p className="mt-4 text-sm text-white/80">Publicada em {new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon" }).format(new Date(job.created_at))}</p>
              {!company?.company_name && <p className="mt-3 text-sm text-white/80">Empresa não identificada neste anúncio.</p>}
              {company?.company_name && (
                <span className="text-lg font-semibold text-white">
                  {company.company_name}
                </span>
              )}

              {job.location && (
                <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold">
                  {job.location}
                </span>
              )}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplying ? "A candidatar..." : "Candidatar-me"}
              </button>

              <button
                onClick={handleToggleSaveJob}
                className="rounded-full border border-white/15 bg-white/10 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white hover:text-[#07111F]"
              >
                {savedJobId ? "Remover dos favoritos" : "Guardar vaga"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1fr_400px] lg:px-12">
        <div className="space-y-8">
          {studentProfile && (
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-[#1683FF]">
                    Compatibilidade
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#07111F]">
                    A tua correspondência com esta vaga
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={generateMatchForCurrentStudent}
                  disabled={isGeneratingMatch}
                  className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingMatch ? "A calcular..." : "Calcular match"}
                </button>
              </div>

              {aiMatch ? (
                <div className="mt-8">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-6xl font-black tracking-[-0.07em] text-[#1683FF]">
                        {aiMatch.match_score}%
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        Compatibilidade estimada, não probabilidade de contratação
                      </p>
                    </div>

                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#1683FF]"
                        style={{ width: `${aiMatch.match_score}%` }}
                      />
                    </div>
                  </div>

                  {aiMatch.ai_reason && (
                    <p className="mt-6 rounded-3xl bg-[#F7F9FC] p-5 text-sm leading-6 text-slate-600">
                      {aiMatch.ai_reason}
                    </p>
                  )}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <ScoreItem label="Skills" value={aiMatch.skills_score} />
                    <ScoreItem label="Área/Função" value={aiMatch.role_score} />
                    <ScoreItem
                      label="Senioridade"
                      value={aiMatch.seniority_score}
                    />
                    <ScoreItem
                      label="Localização"
                      value={aiMatch.location_score}
                    />
                    <ScoreItem label="Modelo" value={aiMatch.work_model_score} />
                    <ScoreItem
                      label="Tipo oportunidade"
                      value={aiMatch.opportunity_type_score}
                    />
                  </div>

                  <MatchList
                    title="Pontos fortes"
                    items={aiMatch.strengths || []}
                  />

                  <MatchList title="A validar" items={aiMatch.gaps || []} />

                  <MatchList
                    title="Recomendações IA"
                    items={aiMatch.ai_recommendations || []}
                  />
                </div>
              ) : (
                <p className="mt-6 rounded-3xl bg-[#F7F9FC] p-5 text-sm leading-6 text-slate-600">
                  Ainda não existe match calculado para esta vaga. Clica em
                  “Calcular match” para veres a compatibilidade com o teu
                  perfil.
                </p>
              )}
            </section>
          )}

          {job.candidate_pitch && !/^\s*(sou|tenho|o meu)\b/i.test(job.candidate_pitch) && (
            <ContentSection title="Perfil procurado" eyebrow="Contexto">
              <p className="whitespace-pre-line text-lg leading-relaxed text-neutral-700">
                {job.candidate_pitch}
              </p>
            </ContentSection>
          )}

          <ContentSection title="Descrição da vaga" eyebrow="Oportunidade">
            <p className="whitespace-pre-line text-lg leading-relaxed text-neutral-700">
              {job.description}
            </p>
          </ContentSection>

          {(requiredSkills.length > 0 || preferredSkills.length > 0) && (
            <ContentSection title="Competências" eyebrow="Matching">
              {requiredSkills.length > 0 && (
                <SkillGroup title="Competências obrigatórias" items={requiredSkills} />
              )}

              {preferredSkills.length > 0 && (
                <SkillGroup
                  title="Competências preferenciais"
                  items={preferredSkills}
                />
              )}
            </ContentSection>
          )}

          {specializations.length > 0 && (
            <ContentSection title="Especializações" eyebrow="Perfil ideal">
              <div className="flex flex-wrap gap-3">
                {specializations.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </div>
            </ContentSection>
          )}

          {(job.education_requirements || job.experience_requirements) && (
            <ContentSection title="Formação e experiência" eyebrow="Requisitos">
              <div className="grid gap-5 md:grid-cols-2">
                {job.education_requirements && (
                  <InfoBox
                    label="Formação exigida"
                    value={job.education_requirements}
                  />
                )}

                {job.experience_requirements && (
                  <InfoBox
                    label="Experiência exigida"
                    value={job.experience_requirements}
                  />
                )}
              </div>
            </ContentSection>
          )}

          {screeningQuestions.length > 0 && (
            <ContentSection title="Perguntas de triagem" eyebrow="Candidatura">
              <div className="grid gap-4">
                {screeningQuestions.map((question, index) => (
                  <div
                    key={`${question}-${index}`}
                    className="rounded-3xl border border-[#DDE3EA] bg-[#F7F9FC] p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Pergunta {index + 1}
                    </p>
                    <p className="mt-2 font-semibold text-[#07111F]">
                      {question}
                    </p>
                  </div>
                ))}
              </div>
            </ContentSection>
          )}

          {evaluationCriteria.length > 0 && (
            <ContentSection title="Critérios de avaliação" eyebrow="Processo">
              <div className="flex flex-wrap gap-3">
                {evaluationCriteria.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </div>
            </ContentSection>
          )}

          {job.ai_summary && (
            <ContentSection title="Resumo IA" eyebrow="Leitura rápida">
              <p className="whitespace-pre-line text-lg leading-relaxed text-neutral-700">
                {job.ai_summary}
              </p>
            </ContentSection>
          )}
        </div>

        <aside className="space-y-8 lg:sticky lg:top-32 lg:self-start">
          <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-[#1683FF]">Resumo</p>

            <div className="mt-6 grid gap-4">
              <SummaryItem label="Área" value={job.area} />
              <SummaryItem label="Modelo" value={getWorkModelLabel()} />
              <SummaryItem label="Tipo" value={getOpportunityTypeLabel()} />
              <SummaryItem label="Senioridade" value={job.seniority} />
              <SummaryItem label="Localização" value={job.location} />
              <SummaryItem label="Salário" value={job.salary_range} />
            </div>

            {languages.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Idiomas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {languages.map((language) => (
                    <Chip key={language}>{language}</Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-3">
              <button
                onClick={handleApply}
                disabled={isApplying}
                className="rounded-full bg-[#07111F] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplying ? "A candidatar..." : "Candidatar-me"}
              </button>

              <button
                onClick={handleToggleSaveJob}
                className="rounded-full border border-[#DDE3EA] px-6 py-4 text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]"
              >
                {savedJobId ? "Remover dos favoritos" : "Guardar vaga"}
              </button>
            </div>
          </section>

          {company && (
            <section className="rounded-[32px] border border-[#DDE3EA] bg-[#07111F] p-8 text-white shadow-sm">
              <p className="text-sm font-semibold text-blue-300">Empresa</p>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-2xl font-black">
                  {company.logo_url ? (
                    <Image unoptimized width={64} height={64}
                      src={company.logo_url}
                      alt={company.company_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    company.company_name.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-black tracking-[-0.04em]">
                    {company.company_name}
                  </h2>

                  {company.location && (
                    <p className="mt-1 text-sm text-blue-100">
                      {company.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {company.industry && <DarkChip>{company.industry}</DarkChip>}
                {company.company_type && (
                  <DarkChip>{company.company_type}</DarkChip>
                )}
                {company.company_size && (
                  <DarkChip>{company.company_size}</DarkChip>
                )}
              </div>

              {company.description && (
                <p className="mt-6 whitespace-pre-line leading-relaxed text-blue-50">
                  {company.description}
                </p>
              )}

              {company.website_url && (
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Visitar website
                </a>
              )}
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
      {children}
    </span>
  );
}

function ContentSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-[#1683FF]">{eyebrow}</p>

      <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#07111F]">
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function SkillGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 text-sm font-semibold text-slate-500">{title}</h3>

      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <Chip key={item}>{item}</Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#DDE3EA] bg-[#F7F9FC] px-4 py-2 text-sm font-semibold text-neutral-700">
      {children}
    </span>
  );
}

function DarkChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#F7F9FC] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[#F7F9FC] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-[#07111F]">{value}</p>
    </div>
  );
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
    <div className="rounded-3xl bg-[#F7F9FC] p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="text-lg font-black text-[#1683FF]">{safeValue}%</p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#1683FF]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function MatchList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-black text-[#07111F]">{title}</h3>

      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl bg-[#F7F9FC] px-4 py-3 text-sm leading-6 text-slate-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
