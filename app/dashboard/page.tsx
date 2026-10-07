"use client";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  role: "student" | "company" | "admin";
  name: string;
  email: string;
};

type CompanyProfile = {
  id: string;
};

type StudentProfile = {
  talent_type: string | null;
  id: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
try {
      const { data: sessionData } = await supabase.auth.getSession();
    if (!active) return;

      if (!sessionData.session) {
        window.location.href = browserLocalizedPath("/login");
        return;
      }

      const userId = sessionData.session.user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, name, email")
        .eq("id", userId)
        .single();
    if (!active) return;

      if (error || !data) {
        setErrorMessage(error?.message || "Perfil não encontrado.");
        setIsLoading(false);
        return;
      }

      setProfile(data as Profile);

      const [{ data: companyData }, { data: studentData }] = await Promise.all([
        supabase
          .from("company_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("student_profiles")
          .select("id, talent_type")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
    if (!active) return;

      setCompanyProfile((companyData as CompanyProfile) || null);
      setStudentProfile((studentData as StudentProfile) || null);
    } catch {
      setErrorMessage("Não foi possível carregar o dashboard.");
    }

    setIsLoading(false);
  }

    void loadProfile();
    return () => { active = false; };
  }, []);


  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = browserLocalizedPath("/");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-neutral-600"><LText text={"A carregar dashboard..."} /></p>
      </main>
    );
  }

  if (errorMessage || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6">
        <div className="max-w-md rounded-[32px] border border-[#DDE3EA] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[#07111F]">
            <LText text={"Não foi possível carregar o dashboard"} /></h1>

          <p className="mt-4 text-sm text-neutral-600">
            <LText text={errorMessage || "Tenta iniciar sessão novamente."} />
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1683FF]"
          >
            <LText text={"Ir para login"} /></Link>
        </div>
      </main>
    );
  }

  const isAdmin = profile.role === "admin";

  const dashboardMode: "company" | "student" | "admin" =
    companyProfile || profile.role === "company"
      ? "company"
      : studentProfile || profile.role === "student"
        ? "student"
        : "admin";

  const isTalent = dashboardMode === "student";
  const isCompany = dashboardMode === "company";

  return (
    <main className="min-h-screen bg-[#F7F9FC]">
      <section className="relative overflow-hidden border-b border-[#DDE3EA] bg-white">
        <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-5 py-2 text-sm font-semibold text-[#1683FF]">
                <LText text={"Dashboard Arynqo"} /></div>

              <h1 className="mt-6 text-5xl font-black tracking-[-0.06em] text-[#07111F] md:text-6xl">
                <LText text={"Olá, "} />{profile.name}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-600">
                <LText text={isTalent
                  ? "Desenvolve o teu perfil profissional, descobre oportunidades compatíveis e deixa a IA encontrar os melhores matches para ti."
                  : isCompany
                    ? "Gere a presença da sua empresa, publique oportunidades e acompanhe candidatos numa experiência simples e inteligente."
                    : "Acede à área de administração da plataforma Arynqo."} />
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-[#07111F] px-4 py-2 text-sm font-semibold text-white">
                  <LText text={isTalent ? ({student: "Estudante", graduate: "Recém-licenciado", professional: "Profissional", career_change: "Em transição de carreira"}[studentProfile?.talent_type || ""] || "Candidato") : isCompany ? "Empresa" : "Admin"} />
                </span>

                {isAdmin && (
                  <span className="rounded-full border border-[#1683FF]/20 bg-[#1683FF]/5 px-4 py-2 text-sm font-semibold text-[#1683FF]">
                    <LText text={"Admin"} /></span>
                )}

                <span className="rounded-full border border-[#DDE3EA] bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                  <LText text={profile.email} />
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-full border border-[#DDE3EA] bg-white px-6 py-3 text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]"
            >
              <LText text={"Terminar sessão"} /></button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1683FF]">
            <LText text={isTalent
              ? "Área de talento"
              : isCompany
                ? "Área da empresa"
                : "Área de administração"} />
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#07111F]">
            <LText text={isTalent
              ? "O teu centro de crescimento profissional"
              : isCompany
                ? "Centro de recrutamento"
                : "Administração Arynqo"} />
          </h2>
        </div>

        {isCompany && (
          <section className="grid gap-6 md:grid-cols-2">
            {isAdmin && (
              <DashboardCard
                eyebrow="Admin"
                title="Painel de administração"
                text="Acede à área reservada de administração da plataforma."
                href="/admin"
                highlighted
              />
            )}

            <DashboardCard
              eyebrow="Empresa"
              title="Perfil da empresa"
              text="Atualize a informação institucional, descrição, localização, website e identidade pública."
              href="/empresa/perfil"
            />

            <DashboardCard
              eyebrow="Vagas"
              title="As minhas vagas"
              text="Consulte, edite, ative ou desative oportunidades publicadas pela sua empresa."
              href="/empresa/vagas"
              highlighted={!isAdmin}
            />

            <DashboardCard
              eyebrow="Matching"
              title="Candidatos compatíveis"
              text="Veja os melhores candidatos para cada vaga, organizados por score de compatibilidade."
              href="/empresa/matches"
            />

            <DashboardCard
              eyebrow="Candidatos"
              title="Explorar candidatos"
              text="Encontro candidatos em toda a plataforma, para além dos matches das minhas vagas, e peço autorização para consultar o perfil."
              href="/empresa/talentos"
            />

            <DashboardCard
              eyebrow="Publicação"
              title="Publicar vaga"
              text="Crie uma nova oportunidade e defina requisitos, área, localização e modelo de trabalho."
              href="/empresa/vagas/nova"
            />

            <DashboardCard
              eyebrow="Candidatos"
              title="Gestão de candidatos"
              text="Analise perfis, skills, CVs e atualize o estado das candidaturas recebidas."
              href="/empresa/candidatos"
            />

            <DashboardCard
              eyebrow="Academy"
              title="Arynqo Academy"
              text="Consulte recursos sobre recrutamento, publicação de vagas, avaliação e boas práticas."
              href="/academia"
            />

            <DashboardCard
              eyebrow="Atualizações"
              title="Notificações"
              text="Receba alertas de novas candidaturas e acompanhe acontecimentos importantes."
              href="/dashboard/notificacoes"
            />
          </section>
        )}

        {isTalent && (
          <section className="grid gap-6 md:grid-cols-2">
            {isAdmin && (
              <DashboardCard
                eyebrow="Admin"
                title="Painel de administração"
                text="Acede à área reservada de administração da plataforma."
                href="/admin"
                highlighted
              />
            )}

            <DashboardCard
              eyebrow="Perfil"
              title="O meu perfil"
              text="Completa o teu currículo online com formação, experiência, skills, CV e links profissionais."
              href="/dashboard/perfil"
            />

            <DashboardCard
              eyebrow="Matching"
              title="Vagas recomendadas"
              text="Descobre oportunidades compatíveis com o teu perfil, skills e objetivos profissionais."
              href="/dashboard/matches"
              highlighted={!isAdmin}
            />

            <DashboardCard
              eyebrow="Candidaturas"
              title="Estado das candidaturas"
              text="Acompanha as vagas a que te candidataste e vê se estão pendentes, aceites ou rejeitadas."
              href="/dashboard/candidaturas"
            />

            <DashboardCard
              eyebrow="Favoritos"
              title="Vagas guardadas"
              text="Guarda oportunidades importantes para voltares a consultá-las mais tarde."
              href="/dashboard/favoritos"
            />

            <DashboardCard
              eyebrow="Academy"
              title="Arynqo Academy"
              text="Aprende a melhorar o teu CV, candidaturas, entrevistas e perfil profissional."
              href="/academia"
            />

            <DashboardCard
              eyebrow="Atualizações"
              title="Notificações"
              text="Recebe atualizações sobre candidaturas, decisões de empresas e outras novidades relevantes."
              href="/dashboard/notificacoes"
            />
          </section>
        )}

        {!isCompany && !isTalent && isAdmin && (
          <section className="grid gap-6 md:grid-cols-2">
            <DashboardCard
              eyebrow="Admin"
              title="Painel de administração"
              text="Acede à área reservada de administração da plataforma."
              href="/admin"
              highlighted
            />

            <DashboardCard
              eyebrow="Academy"
              title="Gerir Arynqo Academy"
              text="Gere artigos, gera conteúdos com IA, revê rascunhos e publica recursos editoriais."
              href="/admin/academia"
            />

            <DashboardCard
              eyebrow="Conteúdos"
              title="Ver Arynqo Academy"
              text="Abre a página pública da academia para validar artigos publicados."
              href="/academia"
            />

            <DashboardCard
              eyebrow="Atualizações"
              title="Notificações"
              text="Acompanha notificações, pedidos e atualizações relevantes da plataforma."
              href="/dashboard/notificacoes"
            />
          </section>
        )}
      </section>
    </main>
  );
}

function DashboardCard({
  eyebrow,
  title,
  text,
  href,
  highlighted = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        highlighted
          ? "group rounded-[32px] border border-[#1683FF]/30 bg-[#07111F] p-8 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          : "group rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#1683FF]/30 hover:shadow-xl"
      }
    >
      <p
        className={
          highlighted
            ? "text-sm font-semibold text-blue-300"
            : "text-sm font-semibold text-[#1683FF]"
        }
      >
        <LText text={eyebrow} />
      </p>

      <h3
        className={
          highlighted
            ? "mt-4 text-3xl font-black tracking-[-0.04em] text-white"
            : "mt-4 text-3xl font-black tracking-[-0.04em] text-[#07111F] transition group-hover:text-[#1683FF]"
        }
      >
        <LText text={title} />
      </h3>

      <p
        className={
          highlighted
            ? "mt-4 leading-relaxed text-blue-100"
            : "mt-4 leading-relaxed text-neutral-600"
        }
      >
        <LText text={text} />
      </p>

      <div
        className={
          highlighted
            ? "mt-8 inline-flex text-sm font-semibold text-white"
            : "mt-8 inline-flex text-sm font-semibold text-[#1683FF]"
        }
      >
        <LText text={"Abrir →"} /></div>
    </Link>
  );
}