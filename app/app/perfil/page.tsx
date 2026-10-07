"use client";
import { LText, LElement } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import MobileBottomNav from "../../components/arynqo/MobileBottomNav";
import { useAppProfile } from "../../hooks/useAppProfile";
import {
  getCompanyProfileCompletion,
  getStudentProfileCompletion,
  useAppProfileDetails,
} from "../../hooks/useAppProfileDetails";

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-white/40"><LText text={label} /></p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function TagList({
  title,
  items,
}: {
  title: string;
  items: string[] | null | undefined;
}) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        <LText text={title} />
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1 text-xs text-cyan-100"
          >
            <LText text={item} />
          </span>
        ))}
      </div>
    </section>
  );
}

function TextSection({
  title,
  value,
}: {
  title: string;
  value: string | null | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
        <LText text={title} />
      </p>

      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/65">
        <LText text={value} />
      </p>
    </section>
  );
}

function getTalentTypeLabel(value: string | null | undefined) {
  if (value === "student") {
    return "Estudante";
  }

  if (value === "graduate") {
    return "Recém-licenciado";
  }

  if (value === "professional") {
    return "Profissional";
  }

  if (value === "career_change") {
    return "Em transição de carreira";
  }

  return value || null;
}

function getContactVisibilityLabel(
  value: "open" | "approval_required" | "closed" | null | undefined,
) {
  if (value === "open") {
    return "Disponível para pedidos de empresas";
  }

  if (value === "approval_required") {
    return "Pedido de autorização";
  }

  if (value === "closed") {
    return "Perfil fechado";
  }

  return null;
}

export default function AppPerfilPage() {
  const {
    profile,
    hasSession,
    isLoading,
    appMode,
    roleLabel,
    signOut,
  } = useAppProfile();

  const {
    studentProfile,
    companyProfile,
    isLoadingDetails,
    errorMessage,
    reloadDetails,
  } = useAppProfileDetails();

  const isCompany = appMode === "company";

  const completion = isCompany
    ? getCompanyProfileCompletion(companyProfile)
    : getStudentProfileCompletion(studentProfile);

  const profileName = isCompany
    ? companyProfile?.company_name || profile?.name || "Empresa"
    : profile?.name || studentProfile?.headline || "Perfil profissional";

  const profileSubtitle = isCompany
    ? companyProfile?.industry || companyProfile?.location || roleLabel
    : studentProfile?.headline ||
      studentProfile?.main_role ||
      studentProfile?.role_title ||
      roleLabel;

  const imageUrl = isCompany
    ? companyProfile?.logo_url || null
    : studentProfile?.avatar_url || null;

  if (isLoading || isLoadingDetails) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
        <section className="mx-auto w-full max-w-md">
          <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-52 animate-pulse rounded-[2rem] bg-white/10" />
          <div className="mt-5 h-24 animate-pulse rounded-3xl bg-white/10" />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-28">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
              <LText text={"ARYNQO"} /></p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              <LText text={"O meu perfil"} /></h1>

            <p className="mt-3 text-sm leading-6 text-white/58">
              <LText text={"Dados reais do teu perfil na plataforma, ligados ao Supabase e à camada de IA."} /></p>
          </div>

          {hasSession && (
            <button
              type="button"
              onClick={reloadDetails}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
            >
              <LText text={"Atualizar"} /></button>
          )}
        </header>

        {!hasSession && (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
            <h2 className="text-xl font-semibold"><LText text={"Entra na tua conta"} /></h2>

            <p className="mt-3 text-sm leading-6 text-white/58">
              <LText text={"Para veres o teu perfil e desbloqueares a experiência ARYNQO na APP, inicia sessão ou cria uma conta."} /></p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
              >
                <LText text={"Entrar"} /></Link>

              <Link
                href="/registo"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <LText text={"Criar conta"} /></Link>
            </div>
          </section>
        )}

        {hasSession && (
          <>
            {errorMessage && (
              <section className="mt-5 rounded-3xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
                <p className="text-sm leading-6 text-amber-100/80">
                  <LText text={errorMessage} />
                </p>
              </section>
            )}

            <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#07111F] to-[#1683FF] text-3xl font-semibold text-white">
                  {imageUrl ? (
                    <LElement as="img"
                      src={imageUrl}
                      alt={profileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profileName.charAt(0).toUpperCase()
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/70">
                    <LText text={roleLabel} />
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    <LText text={profileName} />
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-white/55">
                    <LText text={profileSubtitle} />
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60"><LText text={"Completude do perfil"} /></p>
                  <p className="text-xl font-semibold text-cyan-200">
                    {completion}%
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </section>

            {isCompany && companyProfile && (
              <>
                <section className="mt-5 grid grid-cols-2 gap-3">
                  <InfoCard label="Setor" value={companyProfile.industry} />
                  <InfoCard label="Tipo" value={companyProfile.company_type} />
                  <InfoCard
                    label="Dimensão"
                    value={companyProfile.company_size}
                  />
                  <InfoCard label="Localização" value={companyProfile.location} />
                  <InfoCard label="Cidade" value={companyProfile.city} />
                  <InfoCard label="País" value={companyProfile.country} />
                </section>

                <TextSection
                  title="Descrição da empresa"
                  value={companyProfile.description}
                />

                <section className="mt-5 grid gap-3">
                  <InfoCard
                    label="Email"
                    value={companyProfile.contact_email}
                  />
                  <InfoCard
                    label="Telefone"
                    value={companyProfile.contact_phone}
                  />
                  <InfoCard
                    label="Website"
                    value={companyProfile.website_url}
                  />
                  <InfoCard label="Morada" value={companyProfile.address} />
                  <InfoCard
                    label="Código postal"
                    value={companyProfile.postal_code}
                  />
                </section>
              </>
            )}

            {!isCompany && studentProfile && (
              <>
                <section className="mt-5 grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Tipo de talento"
                    value={getTalentTypeLabel(studentProfile.talent_type)}
                  />
                  <InfoCard
                    label="Disponibilidade"
                    value={studentProfile.availability}
                  />
                  <InfoCard
                    label="Área pretendida"
                    value={studentProfile.desired_area}
                  />
                  <InfoCard
                    label="Localização"
                    value={studentProfile.location}
                  />
                  <InfoCard
                    label="Senioridade"
                    value={studentProfile.seniority}
                  />
                  <InfoCard
                    label="Modelo"
                    value={studentProfile.work_model}
                  />
                  <InfoCard
                    label="Salário esperado"
                    value={studentProfile.expected_salary}
                  />
                  <InfoCard
                    label="Privacidade"
                    value={getContactVisibilityLabel(
                      studentProfile.contact_visibility,
                    )}
                  />
                </section>

                <section className="mt-5 grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Score"
                    value={studentProfile.ai_profile_score}
                  />
                  <InfoCard
                    label="Empregabilidade"
                    value={studentProfile.ai_employability_score}
                  />
                </section>

                <TextSection title="Bio" value={studentProfile.bio} />

                <TextSection
                  title="Resumo IA"
                  value={studentProfile.ai_summary}
                />

                <TextSection
                  title="Experiência profissional"
                  value={studentProfile.professional_experience}
                />

                <TextSection
                  title="Formação académica"
                  value={studentProfile.academic_education}
                />

                <TextSection
                  title="Formação profissional"
                  value={studentProfile.professional_training}
                />

                <TextSection
                  title="Objetivos de carreira"
                  value={studentProfile.career_goals}
                />

                <div className="mt-5 grid gap-3">
                  <TagList
                    title="Skills normalizadas"
                    items={studentProfile.skills_normalized}
                  />

                  <TagList
                    title="Ferramentas"
                    items={studentProfile.tools_normalized}
                  />

                  <TagList
                    title="Soft skills"
                    items={studentProfile.soft_skills_normalized}
                  />

                  <TagList
                    title="Regiões"
                    items={studentProfile.regions}
                  />

                  <TagList
                    title="Palavras-chave IA"
                    items={studentProfile.ai_match_keywords}
                  />
                </div>

                <section className="mt-5 grid gap-3">
                  <InfoCard
                    label="Telefone"
                    value={studentProfile.phone}
                  />
                  <InfoCard
                    label="LinkedIn"
                    value={studentProfile.linkedin_url}
                  />
                  <InfoCard
                    label="Portfólio"
                    value={studentProfile.portfolio_url}
                  />
                  <InfoCard
                    label="CV"
                    value={studentProfile.cv_url ? "Disponível" : null}
                  />
                </section>
              </>
            )}

            <section className="mt-6 space-y-3">
              <Link
                href={isCompany ? "/empresa" : "/profile"}
                className="block rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-white/[0.07]"
              >
                <h2 className="text-sm font-semibold"><LText text={"Editar perfil completo"} /></h2>

                <p className="mt-1 text-sm leading-6 text-white/56">
                  <LText text={"Abre a versão completa do website para editar todos os campos, importar CV, carregar logotipo ou usar IA."} /></p>
              </Link>

              <Link
                href="/dashboard"
                className="block rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-white/[0.07]"
              >
                <h2 className="text-sm font-semibold"><LText text={"Abrir dashboard"} /></h2>

                <p className="mt-1 text-sm leading-6 text-white/56">
                  <LText text={"Acede à área completa da plataforma ARYNQO."} /></p>
              </Link>

              <button
                type="button"
                onClick={signOut}
                className="block w-full rounded-3xl border border-red-400/20 bg-red-400/[0.06] p-4 text-left transition hover:border-red-300/40 hover:bg-red-400/[0.1]"
              >
                <h2 className="text-sm font-semibold text-red-200">
                  <LText text={"Terminar sessão"} /></h2>

                <p className="mt-1 text-sm leading-6 text-red-100/60">
                  <LText text={"Sair da APP ARYNQO neste dispositivo."} /></p>
              </button>
            </section>
          </>
        )}

        <MobileBottomNav />
      </section>
    </main>
  );
}
