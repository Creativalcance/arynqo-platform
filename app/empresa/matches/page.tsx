"use client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import { createNotification } from "@/lib/create-notification";
import { candidateSnapshots } from "@/lib/candidate-snapshots";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isPremiumCompany } from "@/lib/company-plan";
import CompanyLaunchOffer from "@/app/components/arynqo/CompanyLaunchOffer";

type CompanyProfile = {
  id: string;
  user_id: string;
  company_name: string | null;
};

type Job = {
  id: string;
  title: string;
  area: string | null;
  location: string | null;
  work_model: string | null;
  work_mode: string | null;
  opportunity_type: string | null;
  seniority: string | null;
  contract_type: string | null;
};

type StudentProfile = {
  id: string;
  user_id: string;
  headline: string | null;
  location: string | null;
  desired_area: string | null;
  seniority: string | null;
  work_model: string | null;
  ai_summary: string | null;
  ai_profile_score: number | null;
  ai_employability_score: number | null;
  avatar_url: string | null;
  talent_type: string | null;
  contact_visibility: "open" | "approval_required" | "closed" | null;
};

type PublicProfile = {
  id: string;
  name: string | null;
  email: string | null;
};

type RawMatch = {
  id: string;
  student_id: string;
  job_id: string;
  match_score: number;
  match_category: MatchCategory | null;
  is_relevant: boolean | null;
  skills_score: number | null;
  role_score: number | null;
  seniority_score: number | null;
  location_score: number | null;
  work_model_score: number | null;
  salary_score: number | null;
  education_language_score: number | null;
  opportunity_type_score: number | null;
  ai_reason: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  ai_recommendations: string[] | null;
  student_profiles: StudentProfile | StudentProfile[] | null;
};

type Match = {
  id: string;
  student_id: string;
  job_id: string;
  match_score: number;
  match_category: MatchCategory;
  is_relevant: boolean;
  skills_score: number;
  role_score: number;
  seniority_score: number;
  location_score: number;
  work_model_score: number;
  salary_score: number;
  education_language_score: number;
  opportunity_type_score: number;
  ai_reason: string;
  strengths: string[];
  gaps: string[];
  matchingSkills: string[];
  missingSkills: string[];
  aiRecommendations: string[];
  student: StudentProfile | null;
  publicProfile: PublicProfile | null;
  hasApplication: boolean;
  contactRequestStatus: "pending" | "accepted" | "rejected" | null;
};

type MatchCategory =
  | "recommended"
  | "possible"
  | "low_compatibility"
  | "not_relevant";

type CompanyAction = {
  student_id: string;
  job_id: string;
  action_type: string;
};

type ContactRequest = {
  student_id: string;
  job_id: string;
  status: "pending" | "accepted" | "rejected";
};

type DetailTab = "resumo" | "skills" | "gaps" | "acoes";
type MatchView = "recommended" | "others";

const freeVisibleLimit = 5;
const recommendedThreshold = 50;

const workModelLabels: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  presential: "Presencial",
  Remoto: "Remoto",
  Híbrido: "Híbrido",
  Presencial: "Presencial",
};

const talentTypeLabels: Record<string, string> = {
  student: "Estudante",
  graduate: "Recém-licenciado",
  professional: "Profissional",
  career_change: "Transição de carreira",
};

export default function CompanyMatchesPage() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyPlan, setCompanyPlan] = useState("free");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("resumo");
  const [activeMatchView, setActiveMatchView] =
    useState<MatchView>("recommended");
  const [matches, setMatches] = useState<Match[]>([]);
  const [actions, setActions] = useState<CompanyAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const isPremium = isPremiumCompany(companyPlan);

  useEffect(() => {
    loadCompanyData();
  }, []);

  useEffect(() => {
    if (company?.id && selectedJobId) {
      loadMatches(company.id, selectedJobId);
    }
  }, [company?.id, selectedJobId]);

  async function loadCompanyData() {
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: companyData, error: companyError } = await supabase
      .from("company_profiles")
      .select("id, user_id, company_name")
      .eq("user_id", userId)
      .single();

    if (companyError || !companyData) {
      alert("Apenas empresas podem aceder a esta página.");
      window.location.href = "/dashboard";
      return;
    }

    const currentCompany = companyData as CompanyProfile;
    setCompany(currentCompany);

    const { data: subscriptionData } = await supabase
      .from("company_subscriptions")
      .select("plan")
      .eq("company_id", currentCompany.id)
      .maybeSingle();

    setCompanyPlan(subscriptionData?.plan || "free");

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        area,
        location,
        work_model,
        work_mode,
        opportunity_type,
        seniority,
        contract_type
      `
      )
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error(jobsError);
      setJobs([]);
      setIsLoading(false);
      return;
    }

    const normalizedJobs = (jobsData || []) as Job[];

    setJobs(normalizedJobs);

    if (normalizedJobs.length > 0) {
      const requested=new URLSearchParams(window.location.search).get('jobId');
      setSelectedJobId(normalizedJobs.find(job=>job.id===requested)?.id||normalizedJobs[0].id);
    }

    setIsLoading(false);
  }

  async function loadMatches(companyId: string, jobId: string) {
    setIsLoadingMatches(true);

    const [
      { data: actionsData },
      { data: applicationsData },
      { data: contactRequestsData },
    ] = await Promise.all([
      supabase
        .from("company_candidate_actions")
        .select("student_id, job_id, action_type")
        .eq("company_id", companyId)
        .eq("job_id", jobId),
      supabase
        .from("applications")
        .select("student_id, job_id")
        .eq("job_id", jobId),
      supabase
        .from("candidate_contact_requests")
        .select("student_id, job_id, status")
        .eq("company_id", companyId)
        .eq("job_id", jobId),
    ]);

    const applicationsSet = new Set(
      (applicationsData || []).map(
        (application) => `${application.student_id}:${application.job_id}`
      )
    );

    const contactRequestsMap = new Map<string, ContactRequest["status"]>();

    ((contactRequestsData || []) as ContactRequest[]).forEach((request) => {
      contactRequestsMap.set(`${request.student_id}:${request.job_id}`, request.status);
    });

    setActions((actionsData || []) as CompanyAction[]);

    const { data, error } = await supabase
      .from("ai_matches")
      .select(
        `
        id,
        student_id,
        job_id,
        match_score,
        match_category,
is_relevant,
        skills_score,
        role_score,
        seniority_score,
        location_score,
        work_model_score,
        salary_score,
        education_language_score,
        opportunity_type_score,
        ai_reason,
        strengths,
        gaps,
        matching_skills,
        missing_skills,
        ai_recommendations,
        student_profiles (
          id,
          user_id,
          headline,
          location,
          desired_area,
          seniority,
          work_model,
          ai_summary,
          ai_profile_score,
          ai_employability_score,
          avatar_url,
          talent_type,
          contact_visibility
          
        )
      `
      )
      .eq("job_id", jobId)
      .order("match_score", { ascending: false });

    if (error) {
      console.error(error);
      setMatches([]);
      setIsLoadingMatches(false);
      return;
    }

    const rawMatches = (data || []) as RawMatch[];

    let snapshots: Map<string, StudentProfile & { profiles: PublicProfile | null }>;
    try { snapshots = await candidateSnapshots<StudentProfile & { profiles: PublicProfile | null }>(rawMatches.map(match => match.student_id)); }
    catch { setMatches([]); setIsLoadingMatches(false); alert("Não foi possível carregar os candidatos."); return; }

    const normalizedMatches = rawMatches.map((match) => {
      const student = snapshots.get(match.student_id) || null;
      const publicProfile = student?.profiles || null;

      const key = `${match.student_id}:${match.job_id}`;

      return {
  id: match.id,
  student_id: match.student_id,
  job_id: match.job_id,
  match_score: match.match_score || 0,
  match_category: match.match_category || "low_compatibility",
  is_relevant: match.is_relevant === true,
        skills_score: match.skills_score || 0,
        role_score: match.role_score || 0,
        seniority_score: match.seniority_score || 0,
        location_score: match.location_score || 0,
        work_model_score: match.work_model_score || 0,
        salary_score: match.salary_score || 0,
        education_language_score: match.education_language_score || 0,
        opportunity_type_score: match.opportunity_type_score || 0,
        ai_reason:
          match.ai_reason ||
          "Resultado anterior: recalcula para obter os critérios e a cobertura de informação.",
        strengths: match.strengths || [],
        gaps: match.gaps || [],
        matchingSkills: match.matching_skills || [],
        missingSkills: match.missing_skills || [],
        aiRecommendations: match.ai_recommendations || [],
        student,
        publicProfile,
        hasApplication: applicationsSet.has(key),
        contactRequestStatus: contactRequestsMap.get(key) || null,
      };
    });

    setMatches(normalizedMatches);
    setSelectedMatchId("");
    setActiveDetailTab("resumo");
    setIsLoadingMatches(false);
  }

  function hasAction(studentId: string, jobId: string, actionType: string) {
    return actions.some(
      (action) =>
        action.student_id === studentId &&
        action.job_id === jobId &&
        action.action_type === actionType
    );
  }

  function canContactDirectly(match: Match) {
    if (match.hasApplication) {
      return true;
    }

    if (match.contactRequestStatus === "accepted" && match.student?.contact_visibility !== "closed") {
      return true;
    }

    return false;
  }

  async function requestContact(match: Match) {
  if (!company || !match.student) {
    return;
  }

  if (!isPremium) {
    handleUpgradeClick();
    return;
  }

  if (match.student.contact_visibility === "closed") {
    alert("Este candidato não aceita pedidos de contacto sem candidatura.");
    return;
  }

  if (match.contactRequestStatus === "pending") {
    alert("Já existe um pedido de contacto pendente para este candidato.");
    return;
  }

  if (match.contactRequestStatus === "accepted") {
    alert("O contacto já foi aprovado pelo candidato.");
    return;
  }

  const selectedJob = jobs.find((job) => job.id === match.job_id);

  const { data, error } = await supabase
    .from("candidate_contact_requests")
    .upsert(
      {
        company_id: company.id,
        student_id: match.student_id,
        job_id: match.job_id,
        status: "pending",
        message: `A empresa ${
          company.company_name || "ARYNQO"
        } pretende ver o teu perfil completo para a vaga "${
          selectedJob?.title || "vaga compatível"
        }".`,
      },
      {
        onConflict: "company_id,student_id,job_id",
      }
    )
    .select("id, status")
    .single();

  if (error || !data) {
    alert(error?.message || "Não foi possível enviar o pedido de contacto.");
    return;
  }

  if (match.student.user_id) {
    try {
      await createNotification({
        userId: match.student.user_id,
        title: "Pedido de contacto recebido",
        message: `A empresa ${
          company.company_name || "ARYNQO"
        } quer ver o teu perfil completo para a vaga "${
          selectedJob?.title || "vaga compatível"
        }". Podes aceitar ou recusar na área de notificações.`,
        relatedType: "candidate_contact_request",
        relatedId: data.id,
        relatedUrl: "/dashboard/notificacoes",
        actionLabel: "Responder pedido",
        channels: ["in_app", "email", "push"],
      });
    } catch (notificationError) {
      console.error("Erro ao criar notificação:", notificationError);
    }
  }

  setMatches((currentMatches) =>
    currentMatches.map((currentMatch) =>
      currentMatch.id === match.id
        ? { ...currentMatch, contactRequestStatus: "pending" }
        : currentMatch
    )
  );

  alert("Pedido de contacto enviado ao candidato.");
}

  async function handleAction(
  studentId: string,
  jobId: string,
  actionType: string
) {
  if (!company) {
    return;
  }

  if (!isPremium) {
    handleUpgradeClick();
    return;
  }

  const currentMatch = matches.find(
    (match) => match.student_id === studentId && match.job_id === jobId
  );

  if (
    actionType === "accepted" &&
    currentMatch &&
    !canContactDirectly(currentMatch)
  ) {
    alert(
      "Precisas de autorização do candidato antes de o aceitares ou contactares."
    );
    return;
  }

  if (hasAction(studentId, jobId, actionType)) {
    const { error } = await supabase
      .from("company_candidate_actions")
      .delete()
      .eq("company_id", company.id)
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .eq("action_type", actionType);

    if (error) {
      alert(error.message);
      return;
    }

    setActions((currentActions) =>
      currentActions.filter(
        (action) =>
          !(
            action.student_id === studentId &&
            action.job_id === jobId &&
            action.action_type === actionType
          )
      )
    );

    return;
  }

  const { error } = await supabase.from("company_candidate_actions").insert({
    company_id: company.id,
    student_id: studentId,
    job_id: jobId,
    action_type: actionType,
  });

  if (error && error.code !== "23505") {
    alert(error.message);
    return;
  }

  setActions((currentActions) => [
    ...currentActions,
    {
      student_id: studentId,
      job_id: jobId,
      action_type: actionType,
    },
  ]);

  if (actionType === "accepted" && currentMatch?.student?.user_id) {
    const selectedJob = jobs.find((job) => job.id === jobId);

    try {
      await createNotification({
        userId: currentMatch.student.user_id,
        title: "Empresa interessada no teu perfil",
        message: `A empresa ${
          company.company_name || "ARYNQO"
        } demonstrou interesse no teu perfil para a vaga "${
          selectedJob?.title || "vaga compatível"
        }".`,
        relatedType: "candidate_action",
  relatedJobId: jobId,
        relatedId: studentId,
        relatedUrl: "/dashboard/notificacoes",
        actionLabel: "Ver notificações",
        channels: ["in_app", "email", "push"],
      });
    } catch (notificationError) {
      console.error("Erro ao criar notificação:", notificationError);
    }
  }
}

  async function regenerateMatches() {
    if (!selectedJobId) {
      return;
    }

    setIsRegenerating(true);

    try {
      const response = await authenticatedFetch("/api/ai/recalculate-job-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: selectedJobId,
        }),
      });

      if (!response.ok) {
        alert("Não foi possível recalcular os matches.");
        setIsRegenerating(false);
        return;
      }

      if (company) {
        await loadMatches(company.id, selectedJobId);
      }
    } catch (error) {
      console.error(error);
      alert("Não foi possível recalcular os matches.");
    }

    setIsRegenerating(false);
  }

  function handleUpgradeClick() {
    alert(
      "Funcionalidade Premium em breve. Este botão irá ligar ao checkout/planos da ARYNQO."
    );
  }

  const selectedJob = useMemo(() => {
    return jobs.find((job) => job.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  const recommendedMatches = useMemo(() => {
  return matches.filter(
    (match) =>
      match.is_relevant === true &&
      match.match_category !== "not_relevant" &&
      (match.match_category === "recommended" ||
        match.match_category === "possible") &&
      !hasAction(match.student_id, match.job_id, "rejected")
  );
}, [matches, actions, selectedJob]);

const otherMatches = useMemo(() => {
  return matches.filter(
    (match) =>
      match.is_relevant === true &&
      match.match_category === "low_compatibility" &&
      match.match_score < 50 &&
      !hasAction(match.student_id, match.job_id, "rejected")
  );
}, [matches, actions, selectedJob]);

  const activeMatches =
    activeMatchView === "recommended" ? recommendedMatches : otherMatches;

  const visibleMatches = useMemo(() => {
    if (isPremium) {
      return activeMatches;
    }

    return activeMatches.slice(0, freeVisibleLimit);
  }, [activeMatches, isPremium]);

  const lockedMatchesCount = Math.max(activeMatches.length - visibleMatches.length, 0);

  const selectedMatch = useMemo(() => {
    return activeMatches.find((match) => match.id === selectedMatchId) || null;
  }, [activeMatches, selectedMatchId]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar matches...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-7xl">
        <CompanyLaunchOffer />
        <Link href="/empresa/talentos" className="mb-6 inline-block font-semibold text-[#1683FF] underline">Explorar todos os candidatos</Link>
        <section className="mb-8 overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  AI Recruiter Board
                </p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  Candidatos compatíveis.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  O índice de compatibilidade combina os dados do perfil e da vaga.
                  Confirma os requisitos e a informação em falta antes de selecionar candidatos.
                </p>
              </div>

              <button
                type="button"
                onClick={regenerateMatches}
                disabled={isRegenerating || !selectedJobId}
                className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRegenerating ? "A recalcular..." : "Recalcular candidatos"}
              </button>
            </div>
          </div>
        </section>

        {jobs.length === 0 ? (
          <section className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">
              Ainda não existem vagas ativas.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              Cria uma vaga para a IA começar a recomendar candidatos.
            </p>

            <Link
              href="/empresa/vagas/nova"
              className="mt-6 inline-flex rounded-full bg-[#1683FF] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#07111F]"
            >
              Criar vaga
            </Link>
          </section>
        ) : (
          <>
            <section className="mb-8 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-sm font-semibold text-[#07111F]">
                    Vaga em análise
                  </label>

                  <select
                    value={selectedJobId}
                    onChange={(event) => setSelectedJobId(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-4 text-sm text-[#07111F] outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedJob && (
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.area && <Badge>{selectedJob.area}</Badge>}
                    {selectedJob.location && <Badge>{selectedJob.location}</Badge>}

                    {(selectedJob.work_model || selectedJob.work_mode) && (
                      <Badge>
                        {workModelLabels[
                          selectedJob.work_model || selectedJob.work_mode || ""
                        ] ||
                          selectedJob.work_model ||
                          selectedJob.work_mode}
                      </Badge>
                    )}

                    {(selectedJob.opportunity_type || selectedJob.contract_type) && (
                      <Badge>
                        {selectedJob.opportunity_type || selectedJob.contract_type}
                      </Badge>
                    )}

                    {selectedJob.seniority && <Badge>{selectedJob.seniority}</Badge>}
                  </div>
                )}
              </div>
            </section>

            <section className="mb-8 flex flex-wrap gap-3">
              <ViewButton
                active={activeMatchView === "recommended"}
                label={`Matches recomendados (${recommendedMatches.length})`}
                onClick={() => {
                  setActiveMatchView("recommended");
                  setSelectedMatchId("");
                  setActiveDetailTab("resumo");
                }}
              />

              <ViewButton
                active={activeMatchView === "others"}
                label={`Outros candidatos (${otherMatches.length})`}
                onClick={() => {
                  setActiveMatchView("others");
                  setSelectedMatchId("");
                  setActiveDetailTab("resumo");
                }}
              />
            </section>

            {activeMatchView === "others" && (
              <section className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                Estes perfis têm compatibilidade baixa ou informação insuficiente.
                Consulta os critérios e as lacunas antes de tomar uma decisão.
              </section>
            )}

            {isLoadingMatches ? (
              <section className="rounded-[32px] bg-white p-12 text-center shadow-sm">
                <p className="text-sm text-slate-500">
                  A carregar candidatos compatíveis...
                </p>
              </section>
            ) : activeMatches.length === 0 ? (
              <section className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center shadow-sm">
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  {activeMatchView === "recommended"
                    ? "Ainda não existem matches recomendados."
                    : "Não existem candidatos de baixa compatibilidade."}
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
                  Recalcula os matches ou melhora a estrutura da vaga para
                  aumentar a precisão da recomendação.
                </p>

                <button
                  type="button"
                  onClick={regenerateMatches}
                  disabled={isRegenerating}
                  className="mt-6 rounded-full bg-[#1683FF] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRegenerating ? "A recalcular..." : "Gerar candidatos"}
                </button>
              </section>
            ) : (
              <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
                <aside className="min-w-0 rounded-[32px] border border-[#DDE3EA] bg-white p-4 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
                  <div className="mb-4 flex items-center justify-between px-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                        {activeMatchView === "recommended"
                          ? "Ranking IA"
                          : "Baixa compatibilidade"}
                      </p>

                      <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">
                        {activeMatches.length} candidatos
                      </h2>

                      {!isPremium && (
                        <p className="mt-1 text-xs text-slate-500">
                          Top {freeVisibleLimit} visíveis no plano free
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeMatches.map((match, index) => {
                      const isActive = selectedMatch?.id === match.id;
                      const student = match.student;
                      const publicProfile = match.publicProfile;
                      const isLocked = !isPremium && index >= freeVisibleLimit;

                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => {
                            if (isLocked) {
                              handleUpgradeClick();
                              return;
                            }

                            setSelectedMatchId(match.id);
                            setActiveDetailTab("resumo");
                          }}
                          className={`w-full rounded-[24px] border p-4 text-left transition ${
                            isLocked
                              ? "border-dashed border-[#1683FF]/30 bg-[#1683FF]/5 hover:bg-[#1683FF]/10"
                              : isActive
                                ? "border-[#1683FF] bg-[#1683FF]/5 shadow-sm"
                                : "border-transparent bg-[#F7F9FC] hover:border-[#DDE3EA] hover:bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#07111F] to-[#1683FF] text-sm font-semibold text-white">
                              {student?.avatar_url && isPremium && canContactDirectly(match) ? (
                                <img
                                  src={student.avatar_url}
                                  alt={publicProfile?.name || "Candidato"}
                                  className="h-full w-full object-cover"
                                />
                              ) : isLocked ? (
                                "🔒"
                              ) : (
                                "T"
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#07111F]">
                                    #{index + 1}{" "}
                                    {isLocked
                                      ? "Candidato Premium"
                                      : isPremium && canContactDirectly(match)
                                        ? publicProfile?.name ||
                                          "Candidato sem nome"
                                        : student?.headline ||
                                          `Talent #${match.student_id.slice(
                                            0,
                                            4
                                          )}`}
                                  </p>

                                  {!canContactDirectly(match) && !isLocked && (
                                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                                      Identidade protegida • Requer autorização
                                    </p>
                                  )}
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                                    match.match_score >= recommendedThreshold
                                      ? "bg-[#07111F]"
                                      : "bg-amber-500"
                                  }`}
                                >
                                  {match.match_score}%
                                </span>
                              </div>

                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                                {isLocked
                                  ? "Desbloqueia este candidato para ver a análise completa."
                                  : student?.headline ||
                                    "Sem título profissional definido."}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {match.hasApplication && (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                                    Candidatou-se
                                  </span>
                                )}

                                {!match.hasApplication &&
                                  student?.contact_visibility === "open" && (
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                                      Requer aprovação
                                    </span>
                                  )}

                                {!match.hasApplication &&
                                  student?.contact_visibility ===
                                    "approval_required" && (
                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600">
                                      Requer aprovação
                                    </span>
                                  )}

                                {!match.hasApplication &&
                                  student?.contact_visibility === "closed" && (
                                    <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600">
                                      Contacto fechado
                                    </span>
                                  )}

                                {match.contactRequestStatus === "pending" && (
                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600">
                                    Pedido enviado
                                  </span>
                                )}

                                {match.contactRequestStatus === "accepted" && (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                                    Contacto aprovado
                                  </span>
                                )}

                                {student?.talent_type && !isLocked && (
                                  <span className="rounded-full bg-[#1683FF]/10 px-3 py-1 text-[11px] font-semibold text-[#1683FF]">
                                    {talentTypeLabels[student.talent_type] ||
                                      student.talent_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {lockedMatchesCount > 0 && (
                      <button
                        type="button"
                        onClick={handleUpgradeClick}
                        className="w-full rounded-[24px] border border-dashed border-[#1683FF]/30 bg-[#1683FF]/5 p-5 text-left transition hover:bg-[#1683FF]/10"
                      >
                        <p className="text-sm font-semibold text-[#07111F]">
                          +{lockedMatchesCount} candidatos bloqueados
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Atualiza para Premium para ver todos os candidatos,
                          identidade completa, contactos e ações.
                        </p>
                      </button>
                    )}
                  </div>
                </aside>

                <section className="min-w-0 rounded-[32px] border border-[#DDE3EA] bg-white shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
                  {selectedMatch && selectedMatch.student ? (
                    <CandidateDetail
                      match={selectedMatch}
                      hasAction={hasAction}
                      handleAction={handleAction}
                      activeDetailTab={activeDetailTab}
                      setActiveDetailTab={setActiveDetailTab}
                      isPremium={isPremium}
                      handleUpgradeClick={handleUpgradeClick}
                      canContactDirectly={canContactDirectly}
                      requestContact={requestContact}
                    />
                  ) : (
                    <div className="flex min-h-[520px] items-center justify-center p-10 text-center">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                          Análise IA
                        </p>

                        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#07111F]">
                          Seleciona um candidato
                        </h3>

                        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">
                          Seleciona um candidato para veres a compatibilidade,
                          pontos fortes, gaps e regras de contacto.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function CandidateDetail({
  match,
  hasAction,
  handleAction,
  activeDetailTab,
  setActiveDetailTab,
  isPremium,
  handleUpgradeClick,
  canContactDirectly,
  requestContact,
}: {
  match: Match;
  hasAction: (studentId: string, jobId: string, actionType: string) => boolean;
  handleAction: (
    studentId: string,
    jobId: string,
    actionType: string
  ) => Promise<void>;
  activeDetailTab: DetailTab;
  setActiveDetailTab: (tab: DetailTab) => void;
  isPremium: boolean;
  handleUpgradeClick: () => void;
  canContactDirectly: (match: Match) => boolean;
  requestContact: (match: Match) => Promise<void>;
}) {
  const student = match.student;
  const publicProfile = match.publicProfile;

  if (!student) {
    return null;
  }

  const contactAllowed = canContactDirectly(match);

  const displayName = isPremium && contactAllowed
    ? publicProfile?.name || "Candidato sem nome"
    : student.headline || `Talent #${match.student_id.slice(0, 4)}`;

  return (
    <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
      <div className="border-b border-[#DDE3EA] p-4 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 max-w-full gap-3 sm:gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[#07111F] to-[#1683FF] text-2xl font-semibold text-white">
              {student.avatar_url && isPremium && contactAllowed ? (
                <img
                  src={student.avatar_url}
                  alt={publicProfile?.name || "Candidato"}
                  className="h-full w-full object-cover"
                />
              ) : (
                "T"
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-500">
                {student.desired_area || "Talento"}
              </p>

              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.06em] text-[#07111F] sm:text-4xl">
                {displayName}
              </h2>

              {!contactAllowed && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Contacto protegido. O candidato ainda não autorizou contacto
                  direto para esta vaga.
                </p>
              )}

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                {student.headline || "Sem título profissional definido."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {match.hasApplication && (
                  <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">
                    Candidatou-se à vaga
                  </span>
                )}

                {!match.hasApplication && contactAllowed && (
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600">
                    Contacto permitido
                  </span>
                )}

                {!match.hasApplication && !contactAllowed && (
                  <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-600">
                    Requer autorização
                  </span>
                )}

                {student.location && <Badge>{student.location}</Badge>}
                {student.seniority && <Badge>{student.seniority}</Badge>}

                {student.work_model && (
                  <Badge>
                    {workModelLabels[student.work_model] || student.work_model}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-[#07111F] p-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD]">
              Match
            </p>

            <p className="mt-2 text-6xl font-semibold tracking-[-0.08em]">
              {match.match_score}%
            </p>

            <p className="mt-2 text-xs text-white/50">Compatibilidade</p>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 p-4 sm:p-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { id: "resumo", label: "Resumo IA" },
              { id: "skills", label: "Skills" },
              { id: "gaps", label: "Gaps" },
              { id: "acoes", label: "Ações" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDetailTab(tab.id as DetailTab)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeDetailTab === tab.id
                    ? "bg-[#07111F] text-white"
                    : "bg-[#F7F9FC] text-slate-500 hover:text-[#07111F]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeDetailTab === "resumo" && (
            <div className="space-y-6">
              <InfoPanel title="Justificação IA">
                <p>{match.ai_reason}</p>
              </InfoPanel>

              {student.ai_summary && (
                <InfoPanel title="Resumo profissional">
                  <p>{student.ai_summary}</p>
                </InfoPanel>
              )}

              {match.aiRecommendations.length > 0 && (
                <InfoPanel title="Recomendações IA">
                  <ul className="space-y-2">
                    {match.aiRecommendations.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </InfoPanel>
              )}
            </div>
          )}

          {activeDetailTab === "skills" && (
            <div className="grid gap-6 md:grid-cols-2">
              <InfoPanel title="Skills em comum">
                <ChipList
                  items={match.matchingSkills}
                  empty="Sem competências coincidentes identificadas."
                  type="positive"
                />
              </InfoPanel>

              <InfoPanel title="Skills em falta">
                <ChipList
                  items={match.missingSkills}
                  empty="Sem gaps técnicos relevantes."
                  type="negative"
                />
              </InfoPanel>
            </div>
          )}

          {activeDetailTab === "gaps" && (
            <div className="grid gap-6 md:grid-cols-2">
              <InfoPanel title="Pontos fortes">
                <ul className="space-y-2">
                  {match.strengths.length > 0 ? (
                    match.strengths.map((item) => <li key={item}>✓ {item}</li>)
                  ) : (
                    <li>Sem pontos fortes detalhados.</li>
                  )}
                </ul>
              </InfoPanel>

              <InfoPanel title="Gaps">
                <ul className="space-y-2">
                  {match.gaps.length > 0 ? (
                    match.gaps.map((item) => <li key={item}>• {item}</li>)
                  ) : (
                    <li>Sem gaps relevantes identificados.</li>
                  )}
                </ul>
              </InfoPanel>
            </div>
          )}

          {activeDetailTab === "acoes" && (
            <div className="rounded-[28px] border border-[#DDE3EA] bg-[#F7F9FC] p-6">
              <h3 className="text-xl font-semibold tracking-[-0.04em]">
                Decisão de recrutamento
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Se o candidato se candidatou à vaga, a empresa pode contactar.
                Caso contrário, é necessário respeitar a visibilidade definida
                pelo candidato.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionButton
                  active={hasAction(student.id, match.job_id, "shortlisted")}
                  onClick={() =>
                    isPremium
                      ? handleAction(student.id, match.job_id, "shortlisted")
                      : handleUpgradeClick()
                  }
                  activeLabel="Na shortlist"
                  label="Shortlist"
                />

                <ActionButton
                  active={hasAction(student.id, match.job_id, "accepted")}
                  onClick={() =>
                    isPremium
                      ? handleAction(student.id, match.job_id, "accepted")
                      : handleUpgradeClick()
                  }
                  activeLabel="Aceite"
                  label="Aceitar candidato"
                  primary
                />

                {contactAllowed ? (
                  <Link
                    href={`/empresa/candidatos/${student.id}?jobId=${match.job_id}`}
                    className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                  >
                    Ver contacto / perfil
                  </Link>
                ) : student.contact_visibility !== "closed" ? (
                  <button
                    type="button"
                    onClick={() =>
                      isPremium ? requestContact(match) : handleUpgradeClick()
                    }
                    disabled={match.contactRequestStatus === "pending"}
                    className="rounded-full bg-[#1683FF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {match.contactRequestStatus === "pending"
                      ? "Pedido enviado"
                      : "Pedir autorização"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold text-slate-400"
                  >
                    Contacto indisponível
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 border-t border-[#DDE3EA] p-4 sm:p-8 xl:border-l xl:border-t-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
            Breakdown
          </h3>

          <div className="mt-6 space-y-5">
            <MatchMetric label="Skills" value={match.skills_score} />
            <MatchMetric label="Função" value={match.role_score} />
            <MatchMetric label="Senioridade" value={match.seniority_score} />
            <MatchMetric label="Localização" value={match.location_score} />
            <MatchMetric label="Modelo" value={match.work_model_score} />
            <MatchMetric label="Tipo" value={match.opportunity_type_score} />
            <MatchMetric label="Salário" value={match.salary_score} />
          </div>

          <div className="mt-8 rounded-[24px] bg-[#F7F9FC] p-5">
            <p className="text-sm font-semibold text-[#07111F]">
              Score de perfil
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#1683FF]">
              {student.ai_profile_score || 0}
            </p>
          </div>

          <div className="mt-4 rounded-[24px] bg-[#F7F9FC] p-5">
            <p className="text-sm font-semibold text-[#07111F]">
              Empregabilidade
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-[#1683FF]">
              {student.ai_employability_score || 0}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}

function ViewButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
        active
          ? "border-[#1683FF] bg-[#1683FF] text-white"
          : "border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF] hover:text-[#1683FF]"
      }`}
    >
      {label}
    </button>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[28px] border border-[#DDE3EA] bg-[#F7F9FC] p-4 text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] sm:p-6">
      <p className="mb-3 text-sm font-semibold text-[#07111F]">{title}</p>
      {children}
    </div>
  );
}

function ChipList({
  items,
  empty,
  type,
}: {
  items: string[];
  empty: string;
  type: "positive" | "negative";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-full px-3 py-2 text-xs font-semibold ${
            type === "positive"
              ? "bg-[#1683FF]/10 text-[#1683FF]"
              : "bg-red-50 text-red-500"
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function MatchMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#1683FF]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  label,
  activeLabel,
  primary = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeLabel: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
        active
          ? primary
            ? "bg-[#1683FF] text-white"
            : "bg-[#07111F] text-white"
          : primary
            ? "bg-[#1683FF]/10 text-[#1683FF] hover:bg-[#1683FF] hover:text-white"
            : "border border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF] hover:text-[#1683FF]"
      }`}
    >
      {active ? activeLabel : label}
    </button>
  );
}
