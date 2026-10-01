"use client";

import { createNotification } from "@/lib/create-notification";
import { candidateSnapshots } from "@/lib/candidate-snapshots";
import { CandidateCVButton } from "@/app/components/CandidateCVButton";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ContactVisibility = "open" | "approval_required" | "closed";
type ContactRequestStatus = "pending" | "accepted" | "rejected";

type PublicProfile = {
  name: string;
  email: string;
};

type StudentProfile = {
  id: string;
  user_id: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  cv_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  academic_education: string | null;
  professional_experience: string | null;
  languages: string | null;
  availability: string | null;
  desired_area: string | null;
  phone: string | null;
  main_role: string | null;
  seniority: string | null;
  work_model: string | null;
  expected_salary: string | null;
  preferred_regions: string | null;
  ai_summary: string | null;
  contact_visibility: ContactVisibility | null;
  profiles: PublicProfile | PublicProfile[] | null;
};

type Skill = {
  id: string;
  name: string;
};

type StudentSkillRow = {
  skills: Skill | Skill[] | null;
};

type CompanyProfile = {
  id: string;
  user_id: string;
};

type ContactRequest = {
  id: string;
  status: ContactRequestStatus;
};

export default function EmpresaCandidatoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [hasApplication, setHasApplication] = useState(false);
  const [contactRequest, setContactRequest] = useState<ContactRequest | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isRequestingContact, setIsRequestingContact] = useState(false);

  useEffect(() => {
    loadCandidate();
  }, []);

  const profile = useMemo(() => {
    if (!student?.profiles) {
      return null;
    }

    return Array.isArray(student.profiles)
      ? student.profiles[0] ?? null
      : student.profiles;
  }, [student]);

  const canViewFullProfile = useMemo(() => {
    // The server snapshot reveals identity only after consent or an application to this company.
    if (profile) return true;
    if (!student) {
      return false;
    }

    if (hasApplication) {
      return true;
    }

    if (contactRequest?.status === "accepted" && student.contact_visibility !== "closed") {
      return true;
    }

    return false;
  }, [profile, student, hasApplication, contactRequest]);

  const contactStatusLabel = useMemo(() => {
    if (hasApplication) {
      return "Contacto permitido: o candidato candidatou-se a esta vaga.";
    }

    if (contactRequest?.status === "accepted" && student?.contact_visibility !== "closed") {
      return "Contacto permitido: o candidato aceitou o pedido.";
    }

    if (profile) return "Contacto permitido: identidade autorizada para esta empresa.";

    if (contactRequest?.status === "pending") {
      return "Pedido de contacto enviado. Aguarda resposta do candidato.";
    }

    if (contactRequest?.status === "rejected") {
      return "Pedido de contacto recusado pelo candidato.";
    }

    if (student?.contact_visibility === "closed") {
      return "Contacto indisponível: o candidato só aceita contacto após candidatura.";
    }

    return "Contacto protegido: é necessário pedir autorização ao candidato.";
  }, [profile, student, hasApplication, contactRequest]);

  async function loadCandidate() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: companyProfile, error: companyError } = await supabase
      .from("company_profiles")
      .select("id, user_id")
      .eq("user_id", userId)
      .single();

    if (companyError || !companyProfile) {
      alert("Apenas empresas podem aceder a esta página.");
      window.location.href = "/dashboard";
      return;
    }

    const currentCompany = companyProfile as CompanyProfile;
    setCompany(currentCompany);

    let data: StudentProfile | undefined;
    try { data = (await candidateSnapshots<StudentProfile>([id])).get(id); }
    catch { data = undefined; }

    if (!data) {
      alert("Candidato não encontrado.");
      window.location.href = "/empresa/matches";
      return;
    }

    const normalizedProfile = Array.isArray(data.profiles)
      ? data.profiles[0] ?? null
      : data.profiles;

    const currentStudent = {
      ...(data as StudentProfile),
      profiles: normalizedProfile,
    };

    setStudent(currentStudent);

    await Promise.all([
      loadSkills(id),
      loadApplicationStatus(id),
      loadContactRequest(currentCompany.id, id),
    ]);

    setIsLoading(false);
  }

  async function loadSkills(studentId: string) {
    const { data, error } = await supabase
      .from("student_skills")
      .select(
        `
        skills (
          id,
          name
        )
      `
      )
      .eq("student_id", studentId);

    if (error) {
      console.error(error);
      return;
    }

    const normalizedSkills = ((data || []) as StudentSkillRow[])
      .map((row) =>
        Array.isArray(row.skills) ? row.skills[0] ?? null : row.skills
      )
      .filter((skill): skill is Skill => Boolean(skill));

    setSkills(normalizedSkills);
  }

  async function loadApplicationStatus(studentId: string) {
    if (!jobId) {
      setHasApplication(false);
      return;
    }

    const { data } = await supabase
      .from("applications")
      .select("id")
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .maybeSingle();

    setHasApplication(Boolean(data?.id));
  }

  async function loadContactRequest(companyId: string, studentId: string) {
    if (!jobId) {
      setContactRequest(null);
      return;
    }

    const { data } = await supabase
      .from("candidate_contact_requests")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("student_id", studentId)
      .eq("job_id", jobId)
      .maybeSingle();

    setContactRequest((data as ContactRequest | null) || null);
  }

  async function requestContactAuthorization() {
    if (isRequestingContact) return;
    if (!company || !student || !jobId) {
      alert("Não foi possível associar este pedido a uma vaga.");
      return;
    }

    if (student.contact_visibility === "closed") {
      alert("Este candidato não aceita pedidos de contacto sem candidatura.");
      return;
    }

    setIsRequestingContact(true);

    const { data, error } = await supabase
      .from("candidate_contact_requests")
      .upsert(
        {
          company_id: company.id,
          student_id: student.id,
          job_id: jobId,
          status: "pending",
          message:
            "A empresa pretende ver o teu perfil completo e contactar-te sobre uma vaga compatível.",
        },
        {
          onConflict: "company_id,student_id,job_id",
        }
      )
      .select("id, status")
      .single();

    if (error) {
      alert(error.message);
      setIsRequestingContact(false);
      return;
    }

    await createNotification({
  userId: student.user_id,
  title: "Pedido de contacto recebido",
  message:
    "Uma empresa quer ver o teu perfil completo para uma vaga compatível. Podes aceitar ou recusar na área de notificações.",
  relatedType: "candidate_contact_request",
  relatedId: data.id,
  relatedUrl: "/dashboard/notificacoes",
  actionLabel: "Responder pedido",
  channels: ["in_app", "email", "push"],
}).catch(() => undefined); // The database already persisted the notification and email queue.

    setContactRequest(data as ContactRequest);
    setIsRequestingContact(false);

    alert("Pedido de contacto enviado ao candidato.");
  }

  async function handleCompanyAction(actionType: "shortlisted" | "accepted") {
    if (!company || !student?.id || !jobId) {
      alert("Não foi possível associar esta ação a uma vaga.");
      return;
    }

    if (!canViewFullProfile) {
      alert("Precisas de autorização do candidato antes de executar esta ação.");
      return;
    }

    setIsSavingAction(true);

    const { error } = await supabase.from("company_candidate_actions").insert({
      company_id: company.id,
      student_id: student.id,
      job_id: jobId,
      action_type: actionType,
    });

    if (error && error.code !== "23505") {
      alert(error.message);
      setIsSavingAction(false);
      return;
    }

    if (actionType === "accepted" && student.user_id) {
      await createNotification({
  userId: student.user_id,
  title: "Empresa interessada no teu perfil",
  message:
    "Uma empresa demonstrou interesse no teu perfil para uma vaga compatível.",
  relatedType: "candidate_action",
  relatedJobId: jobId,
  relatedId: student.id,
  relatedUrl: "/dashboard/notificacoes",
  actionLabel: "Ver notificações",
  channels: ["in_app", "email", "push"],
});
    }

    alert(
      actionType === "accepted"
        ? "Candidato aceite e notificado com sucesso."
        : "Candidato adicionado à shortlist."
    );

    setIsSavingAction(false);
  }

  function buildCandidateExport() {
    return {
      name: canViewFullProfile ? profile?.name || "" : "Perfil protegido",
      email: canViewFullProfile ? profile?.email || "" : "",
      phone: canViewFullProfile ? student?.phone || "" : "",
      headline: student?.headline || "",
      main_role: student?.main_role || "",
      seniority: student?.seniority || "",
      location: student?.location || "",
      desired_area: student?.desired_area || "",
      availability: student?.availability || "",
      work_model: student?.work_model || "",
      expected_salary: student?.expected_salary || "",
      preferred_regions: student?.preferred_regions || "",
      ai_summary: student?.ai_summary || "",
      bio: canViewFullProfile ? student?.bio || "" : "",
      academic_education: canViewFullProfile
        ? student?.academic_education || ""
        : "",
      professional_experience: canViewFullProfile
        ? student?.professional_experience || ""
        : "",
      languages: canViewFullProfile ? student?.languages || "" : "",
      cv_url: canViewFullProfile ? student?.cv_url || "" : "",
      linkedin_url: canViewFullProfile ? student?.linkedin_url || "" : "",
      portfolio_url: canViewFullProfile ? student?.portfolio_url || "" : "",
      skills: skills.map((skill) => skill.name).join(", "),
    };
  }

  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  function exportCandidateJSON() {
    if (!canViewFullProfile) {
      alert("Precisas de autorização do candidato para exportar o perfil.");
      return;
    }

    const data = buildCandidateExport();

    downloadFile(
      `candidato-${data.name || "arynqo"}.json`,
      JSON.stringify(data, null, 2),
      "application/json"
    );
  }

  function exportCandidateCSV() {
    if (!canViewFullProfile) {
      alert("Precisas de autorização do candidato para exportar o perfil.");
      return;
    }

    const data = buildCandidateExport();

    const headers = Object.keys(data).join(",");
    const values = Object.values(data)
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",");

    downloadFile(
      `candidato-${data.name || "arynqo"}.csv`,
      `${headers}\n${values}`,
      "text/csv;charset=utf-8"
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar candidato...</p>
      </main>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/empresa/matches"
            className="inline-flex rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
          >
            ← Voltar aos matches
          </Link>
        </div>

        <section className="mb-8 overflow-hidden rounded-[32px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-10 md:py-12">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-32 h-40 w-40 rounded-full bg-[#4BB3FD]/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  Candidate profile
                </p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  {canViewFullProfile
                    ? profile?.name || "Candidato"
                    : student.headline || "Perfil protegido"}
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  {student.main_role ||
                    student.headline ||
                    "Perfil profissional em análise"}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <PreviewDark label="Senioridade" value={student.seniority} />
                <PreviewDark label="Localização" value={student.location} />
                <PreviewDark
                  label="Disponibilidade"
                  value={student.availability}
                />
              </div>
            </div>
          </div>
        </section>

        {!canViewFullProfile && (
          <section className="mb-8 rounded-[32px] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.04em]">
                  Perfil protegido
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6">
                  {contactStatusLabel}
                </p>
                {!jobId && <p className="mt-2 text-sm">Seleciona uma vaga ativa em <Link href="/empresa/talentos" className="underline">Explorar candidatos</Link> para enviar o pedido.</p>}
              </div>

              {student.contact_visibility !== "closed" &&
                contactRequest?.status !== "pending" &&
                contactRequest?.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={requestContactAuthorization}
                    disabled={isRequestingContact || !jobId}
                    className="rounded-full bg-[#1683FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRequestingContact
                      ? "A enviar..."
                      : "Pedir autorização para ver o perfil"}
                  </button>
                )}
            </div>
          </section>
        )}

        <section className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-[#07111F] to-[#1683FF] text-4xl font-semibold text-white shadow-[0_20px_60px_rgba(22,131,255,0.25)]">
                  {canViewFullProfile && profile?.name
                    ? profile.name.charAt(0).toUpperCase()
                    : "T"}
                </div>

                <h2 className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
                  {canViewFullProfile
                    ? profile?.name || "Candidato"
                    : "Perfil protegido"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {student.headline ||
                    student.main_role ||
                    "Função não definida"}
                </p>
              </div>

              <div className="mt-6 space-y-3 border-t border-[#DDE3EA] pt-6">
                <PreviewLine
                  label="Email"
                  value={canViewFullProfile ? profile?.email : "Protegido"}
                />
                <PreviewLine
                  label="Telefone"
                  value={canViewFullProfile ? student.phone : "Protegido"}
                />
                <PreviewLine label="Área" value={student.desired_area} />
                <PreviewLine label="Modelo" value={student.work_model} />
                <PreviewLine
                  label="Regiões"
                  value={student.preferred_regions}
                />
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                Estado de contacto
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {contactStatusLabel}
              </p>

              {!canViewFullProfile &&
                student.contact_visibility !== "closed" &&
                contactRequest?.status !== "pending" &&
                contactRequest?.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={requestContactAuthorization}
                    disabled={isRequestingContact || !jobId}
                    className="mt-5 w-full rounded-2xl bg-[#1683FF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRequestingContact
                      ? "A enviar pedido..."
                      : "Pedir autorização"}
                  </button>
                )}
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                Skills
              </h2>

              <div className="mt-5 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-full border border-[#1683FF]/20 bg-[#1683FF]/5 px-3 py-2 text-xs font-semibold text-[#07111F]"
                  >
                    {skill.name}
                  </span>
                ))}

                {skills.length === 0 && (
                  <p className="text-sm leading-6 text-slate-500">
                    Sem skills registadas.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                Documentos e links
              </h2>

              <div className="mt-5 space-y-3">
                {canViewFullProfile && student.cv_url && (
                  <CandidateCVButton studentId={student.id} className="block rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm font-medium transition hover:border-[#1683FF] hover:text-[#1683FF]" />
                )}

                {canViewFullProfile && student.linkedin_url && (
                  <a
                    href={student.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm font-medium transition hover:border-[#1683FF] hover:text-[#1683FF]"
                  >
                    LinkedIn
                  </a>
                )}

                {canViewFullProfile && student.portfolio_url && (
                  <a
                    href={student.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm font-medium transition hover:border-[#1683FF] hover:text-[#1683FF]"
                  >
                    Portfólio
                  </a>
                )}

                {!canViewFullProfile && (
                  <p className="text-sm leading-6 text-slate-500">
                    Documentos e links protegidos até o candidato autorizar o
                    contacto.
                  </p>
                )}

                {canViewFullProfile &&
                  !student.cv_url &&
                  !student.linkedin_url &&
                  !student.portfolio_url && (
                    <p className="text-sm leading-6 text-slate-500">
                      Sem documentos ou links disponíveis.
                    </p>
                  )}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                Ações de recrutamento
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                As ações de recrutamento completas ficam disponíveis quando o
                contacto estiver autorizado.
              </p>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => handleCompanyAction("accepted")}
                  disabled={isSavingAction || !jobId || !canViewFullProfile}
                  className="rounded-2xl bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Aceitar candidato
                </button>

                <button
                  type="button"
                  onClick={() => handleCompanyAction("shortlisted")}
                  disabled={isSavingAction || !jobId || !canViewFullProfile}
                  className="rounded-2xl border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Adicionar à shortlist
                </button>

                <button
                  type="button"
                  onClick={exportCandidateJSON}
                  disabled={!canViewFullProfile}
                  className="rounded-2xl border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Exportar JSON
                </button>

                <button
                  type="button"
                  onClick={exportCandidateCSV}
                  disabled={!canViewFullProfile}
                  className="rounded-2xl border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Exportar CSV
                </button>
              </div>
            </section>
          </aside>

          <div className="space-y-8">
            {student.ai_summary && (
              <ProfileSection eyebrow="IA" title="Resumo profissional">
                <p className="text-base leading-7 text-slate-600">
                  {student.ai_summary}
                </p>
              </ProfileSection>
            )}

            {canViewFullProfile && student.bio && (
              <ProfileSection eyebrow="Perfil" title="Bio">
                <p className="whitespace-pre-line text-base leading-7 text-slate-600">
                  {student.bio}
                </p>
              </ProfileSection>
            )}

            {!canViewFullProfile && (
              <ProfileSection eyebrow="Privacidade" title="Dados protegidos">
                <p className="text-base leading-7 text-slate-600">
                  Este candidato ainda não autorizou o acesso ao perfil completo.
                  Até lá, apenas são apresentados os dados essenciais de
                  compatibilidade profissional.
                </p>
              </ProfileSection>
            )}

            {canViewFullProfile && (
              <>
                <ProfileSection eyebrow="Percurso" title="Formação académica">
                  <p className="whitespace-pre-line text-base leading-7 text-slate-600">
                    {student.academic_education || "Não indicado."}
                  </p>
                </ProfileSection>

                <ProfileSection
                  eyebrow="Experiência"
                  title="Experiência profissional"
                >
                  <p className="whitespace-pre-line text-base leading-7 text-slate-600">
                    {student.professional_experience || "Não indicado."}
                  </p>
                </ProfileSection>

                <ProfileSection eyebrow="Idiomas" title="Idiomas">
                  <p className="whitespace-pre-line text-base leading-7 text-slate-600">
                    {student.languages || "Não indicado."}
                  </p>
                </ProfileSection>
              </>
            )}

            <ProfileSection eyebrow="Matching" title="Dados estruturados IA">
              <div className="grid gap-5 md:grid-cols-2">
                <InfoBox label="Profissão principal" value={student.main_role} />
                <InfoBox label="Senioridade" value={student.seniority} />
                <InfoBox label="Modelo de trabalho" value={student.work_model} />
                <InfoBox
                  label="Expectativa salarial"
                  value={
                    canViewFullProfile ? student.expected_salary : "Protegido"
                  }
                />
                <InfoBox
                  label="Regiões preferidas"
                  value={student.preferred_regions}
                />
                <InfoBox label="Disponibilidade" value={student.availability} />
              </div>
            </ProfileSection>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-7 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-[#F7F9FC] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-[#07111F]">
        {value || "Não indicado"}
      </p>
    </div>
  );
}

function PreviewLine({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium">
        {value || "Ainda não definido"}
      </p>
    </div>
  );
}

function PreviewDark({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {value || "Não indicado"}
      </p>
    </div>
  );
}
