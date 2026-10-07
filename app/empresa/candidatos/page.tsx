"use client";
import { localizedAlert } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText, LElement } from "@/lib/i18n/client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import { candidateSnapshots } from "@/lib/candidate-snapshots";
import { CandidateCVButton } from "@/app/components/CandidateCVButton";
import Link from "@/lib/i18n/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decideApplication } from "@/lib/application-decision";
import { supabase } from "@/lib/supabase";

type Skill = {
  id: string;
  name: string;
};

type ApplicationStatus = "pending" | "accepted" | "rejected";

type CandidateApplication = {
  id: string;
  job_id: string;
  student_id: string;
  status: ApplicationStatus;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    area: string | null;
    work_model: string | null;
    opportunity_type: string | null;
    seniority: string | null;
  } | null;
  student_profiles: {
    id: string;
    user_id: string;
    phone: string | null;
    bio: string | null;
    headline: string | null;
    location: string | null;
    desired_area: string | null;
    availability: string | null;
    academic_education: string | null;
    professional_experience: string | null;
    languages: string | null;
    cv_url: string | null;
    linkedin_url: string | null;
    portfolio_url: string | null;
    main_role: string | null;
    seniority: string | null;
    work_model: string | null;
    expected_salary: string | null;
    preferred_regions: string | null;
    ai_summary: string | null;
    profiles: {
      name: string;
      email: string;
    } | null;
  } | null;
};

type StudentSkillRow = {
  student_id: string;
  skills: Skill | Skill[] | null;
};

type AIMatch = {
  student_id: string;
  job_id: string;
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

type ApplicationWithMatch = CandidateApplication & {
  ai_match: AIMatch | null;
};

const statusLabels: Record<ApplicationStatus, string> = {
  pending: "Pendente",
  accepted: "Aceite",
  rejected: "Rejeitada",
};

const statusStyles: Record<ApplicationStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

export default function EmpresaCandidatosPage() {
  const [applications, setApplications] = useState<ApplicationWithMatch[]>([]);
  const [candidateSkills, setCandidateSkills] = useState<Record<string, Skill[]>>(
    {}
  );
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "all">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const decisionLocks = useRef(new Set<string>());
  const [decidingIds, setDecidingIds] = useState<Set<string>>(new Set());


  const filteredApplications = useMemo(() => {
    if (selectedStatus === "all") {
      return applications;
    }

    return applications.filter(
      (application) => application.status === selectedStatus
    );
  }, [applications, selectedStatus]);

  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(
      (application) => application.status === "pending"
    ).length;
    const accepted = applications.filter(
      (application) => application.status === "accepted"
    ).length;
    const rejected = applications.filter(
      (application) => application.status === "rejected"
    ).length;

    const averageMatch =
      applications.length > 0
        ? Math.round(
            applications.reduce(
              (sum, application) =>
                sum + (application.ai_match?.match_score || 0),
              0
            ) / applications.length
          )
        : 0;

    return {
      total,
      pending,
      accepted,
      rejected,
      averageMatch,
    };
  }, [applications]);

  const loadCandidateSkills = useCallback(async (studentIds: string[]) => {
    if (studentIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from("student_skills")
      .select(
        `
        student_id,
        skills (
          id,
          name
        )
      `
      )
      .in("student_id", studentIds);

    if (error) {
      console.error(error);
      return {};
    }

    const groupedSkills = ((data || []) as StudentSkillRow[]).reduce<
      Record<string, Skill[]>
    >((accumulator, row) => {
      const skill = Array.isArray(row.skills)
        ? row.skills[0] ?? null
        : row.skills;

      if (!skill) {
        return accumulator;
      }

      if (!accumulator[row.student_id]) {
        accumulator[row.student_id] = [];
      }

      accumulator[row.student_id].push(skill);

      return accumulator;
    }, {});

    return groupedSkills;
  }, []);

  const readApplications = useCallback(async () => {

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = browserLocalizedPath("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!companyProfile) {
      localizedAlert("Apenas empresas podem aceder.");
      window.location.href = browserLocalizedPath("/dashboard");
      return;
    }

    const { data: jobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", companyProfile.id);

    const jobIds = jobs?.map((job) => job.id) || [];

    if (jobIds.length === 0) {
      return { applications: [] as ApplicationWithMatch[], skills: {} as Record<string, Skill[]> };
    }

    const { data, error } = await supabase
      .from("applications")
      .select(
        `
        id,
        job_id,
        student_id,
        status,
        created_at,

        jobs (
          id,
          title,
          area,
          work_model,
          opportunity_type,
          seniority
        ),

        student_profiles (id)
      `
      )
      .in("job_id", (()=>{const requested=new URLSearchParams(window.location.search).get('jobId');return requested?jobIds.filter(id=>id===requested):jobIds;})())
      .order("created_at", { ascending: false });

    if (error) {
      localizedAlert(error.message);
      return null;
    }

    let snapshots: Map<string, NonNullable<CandidateApplication["student_profiles"]>>;
    try { snapshots = await candidateSnapshots<NonNullable<CandidateApplication["student_profiles"]>>((data || []).map(application => application.student_id)); }
    catch { localizedAlert("Não foi possível carregar os candidatos."); return null; }

    const normalizedApplications = (data || []).map((application) => {
      const normalizedStudentProfile = snapshots.get(application.student_id) || null;

      return {
        ...application,
        jobs: Array.isArray(application.jobs)
          ? application.jobs[0] ?? null
          : application.jobs,

        student_profiles: normalizedStudentProfile
          ? {
              ...normalizedStudentProfile,
              profiles: Array.isArray(normalizedStudentProfile.profiles)
                ? normalizedStudentProfile.profiles[0] ?? null
                : normalizedStudentProfile.profiles,
            }
          : null,
      };
    }) as CandidateApplication[];

    const studentIds = Array.from(
      new Set(
        normalizedApplications
          .map((application) => application.student_profiles?.id)
          .filter((studentId): studentId is string => Boolean(studentId))
      )
    );

    const [{ data: matches }, skills] = await Promise.all([
      supabase
        .from("ai_matches")
        .select(
          `
          student_id,
          job_id,
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
        .in("job_id", jobIds),
      loadCandidateSkills(studentIds),
    ]);

    const matchMap = new Map<string, AIMatch>();

    ((matches || []) as AIMatch[]).forEach((match) => {
      matchMap.set(`${match.student_id}:${match.job_id}`, match);
    });

    const applicationsWithMatches = normalizedApplications
      .map((application) => ({
        ...application,
        ai_match:
          matchMap.get(`${application.student_id}:${application.job_id}`) ||
          null,
      }))
      .sort((firstApplication, secondApplication) => {
        const firstScore = firstApplication.ai_match?.match_score || 0;
        const secondScore = secondApplication.ai_match?.match_score || 0;

        if (secondScore !== firstScore) {
          return secondScore - firstScore;
        }

        return (
          new Date(secondApplication.created_at).getTime() -
          new Date(firstApplication.created_at).getTime()
        );
      });

    return { applications: applicationsWithMatches, skills };
  }, [loadCandidateSkills]);

  const applyApplications = useCallback((result: Awaited<ReturnType<typeof readApplications>>) => {
    if (result) {
      setApplications(result.applications);
      setCandidateSkills(result.skills);
    }
    setIsLoading(false);
  }, []);

  async function loadApplications() {
    setIsLoading(true);
    applyApplications(await readApplications());
  }

  useEffect(() => {
    let active = true;
    void readApplications().then(result => {
      if (active) applyApplications(result);
    });
    return () => { active = false; };
  }, [readApplications, applyApplications]);


  async function recalculateAllMatches() {
    const jobIds = Array.from(
      new Set(
        applications
          .map((application) => application.jobs?.id)
          .filter((jobId): jobId is string => Boolean(jobId))
      )
    );

    if (jobIds.length === 0) {
      return;
    }

    setIsRecalculating(true);

    try {
      await Promise.all(
        jobIds.map((jobId) =>
          authenticatedFetch("/api/ai/recalculate-job-matches", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ jobId }),
          })
        )
      );

      await loadApplications();
    } catch {
      localizedAlert("Não foi possível recalcular os matches.");
    }

    setIsRecalculating(false);
  }

  async function updateStatus(
    application: CandidateApplication,
    status: "accepted" | "rejected"
  ) {
    if (application.status !== "pending" || decisionLocks.current.has(application.id)) return;
    decisionLocks.current.add(application.id);
    setDecidingIds(new Set(decisionLocks.current));
    try {
      const savedStatus = await decideApplication(supabase, application.id, status);
      setApplications((current) => current.map((item) =>
        item.id === application.id ? { ...item, status: savedStatus } : item
      ));
    } catch {
      localizedAlert("Não foi possível atualizar a candidatura. Atualiza a lista e tenta novamente.");
    } finally {
      decisionLocks.current.delete(application.id);
      setDecidingIds(new Set(decisionLocks.current));
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar candidatos..."} /></p>
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
                  <LText text={"Talent intelligence"} /></p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  <LText text={"Candidatos."} /></h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  <LText text={"Analise candidaturas recebidas, veja compatibilidade IA, competências em comum, gaps e recomendações de recrutamento."} /></p>
              </div>

              <button
                type="button"
                onClick={recalculateAllMatches}
                disabled={isRecalculating || applications.length === 0}
                className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LText text={isRecalculating ? "A recalcular..." : "Recalcular matches"} />
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-5">
          <StatCard label="Candidaturas" value={stats.total} />
          <StatCard label="Pendentes" value={stats.pending} />
          <StatCard label="Aceites" value={stats.accepted} />
          <StatCard label="Rejeitadas" value={stats.rejected} />
          <StatCard label="Match médio" value={`${stats.averageMatch}%`} />
        </section>

        <section className="mb-8 flex flex-wrap gap-3">
          <FilterButton
            label="Todas"
            active={selectedStatus === "all"}
            onClick={() => setSelectedStatus("all")}
          />

          <FilterButton
            label="Pendentes"
            active={selectedStatus === "pending"}
            onClick={() => setSelectedStatus("pending")}
          />

          <FilterButton
            label="Aceites"
            active={selectedStatus === "accepted"}
            onClick={() => setSelectedStatus("accepted")}
          />

          <FilterButton
            label="Rejeitadas"
            active={selectedStatus === "rejected"}
            onClick={() => setSelectedStatus("rejected")}
          />
        </section>

        <div className="grid gap-6">
          {filteredApplications.map((application) => {
            const studentId = application.student_profiles?.id;
            const jobId = application.jobs?.id;
            const profile = application.student_profiles?.profiles;
            const skills = studentId ? candidateSkills[studentId] || [] : [];
            const match = application.ai_match;

            return (
              <article
                key={application.id}
                className="overflow-hidden rounded-[32px] border border-[#DDE3EA] bg-white shadow-[0_24px_80px_rgba(7,17,31,0.06)]"
              >
                <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
                  <aside className="border-b border-[#DDE3EA] bg-[#07111F] p-7 text-white xl:border-b-0 xl:border-r">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
                        {profile?.name?.charAt(0).toUpperCase() || <LText text="A" />}
                      </div>

                      <span
                        className={`rounded-full border px-4 py-2 text-xs font-semibold ${statusStyles[application.status]}`}
                      >
                        <LText text={statusLabels[application.status]} />
                      </span>
                    </div>

                    <h2 className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
                      {profile?.name || <LText text="Nome não disponível" />}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-white/60">
                      {application.student_profiles?.headline ||
                        application.student_profiles?.main_role ||
                        application.student_profiles?.desired_area || <LText text="Perfil profissional não definido" />}
                    </p>

                    {match ? (
                      <div className="mt-8 rounded-[28px] border border-white/10 bg-white/10 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD]">
                          <LText text={"Match IA"} /></p>

                        <div className="mt-3 flex items-end gap-2">
                          <p className="text-5xl font-black tracking-[-0.07em]">
                            {match.match_score}%
                          </p>
                          <p className="mb-2 text-xs text-white/50">
                            <LText text={"compatibilidade"} /></p>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#4BB3FD]"
                            style={{ width: `${match.match_score}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-8 rounded-[28px] border border-white/10 bg-white/10 p-5">
                        <p className="text-sm leading-6 text-white/65">
                          <LText text={"Ainda não existe match calculado para esta candidatura."} /></p>
                      </div>
                    )}
                  </aside>

                  <div className="p-7">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                          <LText text={"Vaga"} /></p>

                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                          <LText text={application.jobs?.title || "Vaga não disponível"} />
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {application.jobs?.area && (
                            <Chip><LText text={application.jobs.area} /></Chip>
                          )}
                          {application.jobs?.work_model && (
                            <Chip><LText text={application.jobs.work_model} /></Chip>
                          )}
                          {application.jobs?.opportunity_type && (
                            <Chip><LText text={application.jobs.opportunity_type} /></Chip>
                          )}
                          {application.jobs?.seniority && (
                            <Chip><LText text={application.jobs.seniority} /></Chip>
                          )}
                        </div>
                      </div>

                      {studentId && jobId && (
                        <Link
                          href={`/empresa/candidatos/${studentId}?jobId=${jobId}`}
                          className="rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
                        >
                          <LText text={"Ver perfil completo"} /></Link>
                      )}
                    </div>

                    <section className="mt-8 grid gap-5 lg:grid-cols-3">
                      <InfoItem
                        label="Email"
                        value={profile?.email || "Não indicado"}
                      />
                      <InfoItem
                        label="Telefone"
                        value={
                          application.student_profiles?.phone || "Não indicado"
                        }
                      />
                      <InfoItem
                        label="Localização"
                        value={
                          application.student_profiles?.location ||
                          "Não indicada"
                        }
                      />
                      <InfoItem
                        label="Área pretendida"
                        value={
                          application.student_profiles?.desired_area ||
                          "Não indicada"
                        }
                      />
                      <InfoItem
                        label="Modelo pretendido"
                        value={
                          application.student_profiles?.work_model ||
                          "Não indicado"
                        }
                      />
                      <InfoItem
                        label="Salário esperado"
                        value={
                          application.student_profiles?.expected_salary ||
                          "Não indicado"
                        }
                      />
                    </section>

                    {match && (
                      <section className="mt-8 rounded-[28px] border border-[#DDE3EA] bg-[#F7F9FC] p-6">
                        <div className="grid gap-4 md:grid-cols-3">
                          <ScoreMini label="Skills" value={match.skills_score} />
                          <ScoreMini label="Função" value={match.role_score} />
                          <ScoreMini
                            label="Senioridade"
                            value={match.seniority_score}
                          />
                          <ScoreMini
                            label="Localização"
                            value={match.location_score}
                          />
                          <ScoreMini
                            label="Modelo"
                            value={match.work_model_score}
                          />
                          <ScoreMini
                            label="Tipo"
                            value={match.opportunity_type_score}
                          />
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                          <MatchBlock
                            title="Skills em comum"
                            items={match.matching_skills || []}
                          />

                          <MatchBlock
                            title="Skills em falta"
                            items={match.missing_skills || []}
                          />

                          <MatchBlock
                            title="Pontos fortes"
                            items={match.strengths || []}
                          />

                          <MatchBlock
                            title="A validar"
                            items={match.gaps || []}
                          />
                        </div>

                      </section>
                    )}

                    {!match && skills.length > 0 && (
                      <section className="mt-8">
                        <h4 className="text-sm font-semibold"><LText text={"Skills"} /></h4>

                        <div className="mt-3 flex flex-wrap gap-3">
                          {skills.map((skill) => (
                            <Chip key={skill.id}><LText text={skill.name} /></Chip>
                          ))}
                        </div>
                      </section>
                    )}

                    {application.student_profiles?.ai_summary && (
                      <section className="mt-8 rounded-[28px] border border-[#DDE3EA] bg-white p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                          <LText text={"Resumo IA do candidato"} /></p>

                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          <LText text={application.student_profiles.ai_summary} />
                        </p>
                      </section>
                    )}

                    <div className="mt-8 flex flex-wrap gap-3">
                      {application.status === "pending" ? <><button
                        onClick={() => updateStatus(application, "accepted")}
                        disabled={decidingIds.has(application.id)}
                        className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <LText text={"Aceitar"} /></button>

                      <button
                        onClick={() => updateStatus(application, "rejected")}
                        disabled={decidingIds.has(application.id)}
                        className="rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <LText text={"Rejeitar"} /></button></> : (
                        <p role="status" className={`rounded-full border px-5 py-3 text-sm font-semibold ${statusStyles[application.status]}`}>
                          <LText text={statusLabels[application.status]} />
                        </p>
                      )}

                      {application.student_profiles?.cv_url && (
                        <CandidateCVButton studentId={application.student_profiles.id} className="rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]" />
                      )}

                      {application.student_profiles?.linkedin_url && (
                        <LElement as="a"
                          href={application.student_profiles.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
                        >
                          <LText text={"LinkedIn"} /></LElement>
                      )}

                      {application.student_profiles?.portfolio_url && (
                        <LElement as="a"
                          href={application.student_profiles.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
                        >
                          <LText text={"Portfólio"} /></LElement>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredApplications.length === 0 && (
            <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center">
              <p className="text-lg font-semibold text-[#07111F]">
                <LText text={"Ainda não existem candidaturas para este filtro."} /></p>

              <p className="mt-2 text-sm text-slate-500">
                <LText text={"Quando os candidatos se candidatarem, serão apresentados aqui com score de compatibilidade IA."} /></p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <LText text={label} />
      </p>

      <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[#07111F]">
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
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
      <LText text={label} />
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#DDE3EA] bg-white px-4 py-2 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        <LText text={label} />
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-[#07111F]">
        <LText text={value} />
      </p>
    </div>
  );
}

function ScoreMini({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const safeValue = value ?? 0;

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <LText text={label} />
        </p>

        <p className="text-sm font-black text-[#1683FF]">{safeValue}%</p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[#1683FF]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function MatchBlock({
  title,
  items,
  className = "",
}: {
  title: string;
  items: string[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h4 className="text-sm font-semibold text-[#07111F]"><LText text={title} /></h4>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#DDE3EA] bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <LText text={item} />
          </span>
        ))}
      </div>
    </div>
  );
}
