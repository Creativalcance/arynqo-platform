"use client";

import Link from "next/link";
import { useMemo } from "react";
import MobileBottomNav from "@/app/components/arynqo/MobileBottomNav";
import { useAppJobs } from "../../hooks/useAppJobs";
import { useAppMatches } from "../../hooks/useAppMatches";
import { useAppProfile } from "../../hooks/useAppProfile";
import {
  getAppActions,
  getAppModeConfig,
  type AppAction,
} from "@/lib/arynqoApp";

function getFirstName(name: string | null, email: string | null) {
  if (name && name.trim().length > 0) {
    return name.trim().split(" ")[0];
  }

  if (email && email.includes("@")) {
    return email.split("@")[0];
  }

  return "Bem-vindo";
}

function getAverageScore(scores: number[]) {
  const validScores = scores.filter((score) => score > 0);

  if (validScores.length === 0) {
    return 0;
  }

  const total = validScores.reduce((sum, score) => sum + score, 0);

  return Math.round(total / validScores.length);
}

function PublicFeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1683FF]" />
      <p className="text-sm font-medium text-neutral-700">{text}</p>
    </div>
  );
}

function PublicDarkFeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#4BB3FD]" />
      <p className="text-sm font-medium text-blue-50">{text}</p>
    </div>
  );
}

function PublicStatItem({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
      <h3 className="text-4xl font-black tracking-[-0.05em] text-[#07111F]">
        {number}
      </h3>

      <p className="mt-2 text-sm text-neutral-600">{label}</p>
    </div>
  );
}

function PublicAppHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F9FC] pb-28 text-[#07111F]">
      <section className="relative border-b border-neutral-200 bg-gradient-to-b from-white to-[#F7F9FC]">
        <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-md flex-col px-5 pb-12 pt-10 text-center">
          <div className="mx-auto rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">
            Plataforma inteligente de recrutamento e evolução profissional
          </div>

          <h1 className="mt-8 text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#07111F]">
            Onde o talento se desenvolve.
          </h1>

          <p className="mt-6 text-base leading-7 text-neutral-600">
            A ARYNQO liga estudantes, profissionais e empresas através de uma
            experiência moderna, inteligente e premium de recrutamento.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Link
              href="/app/vagas"
              className="rounded-full bg-[#07111F] px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-[#1683FF]"
            >
              Explorar vagas
            </Link>

            <Link
              href="/registo"
              className="rounded-full border border-neutral-300 bg-white px-5 py-4 text-center text-sm font-semibold transition hover:bg-neutral-100"
            >
              Criar conta
            </Link>
          </div>

          <div className="mt-12 grid gap-4">
  <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
    <p className="text-sm font-medium text-blue-600">Estudantes</p>

    <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#07111F]">
      Começa a construir o teu futuro
    </h2>

    <p className="mt-3 text-sm leading-6 text-neutral-600">
      Cria um perfil profissional moderno, descobre oportunidades relevantes e
      dá os primeiros passos no mercado com mais clareza, confiança e direção.
    </p>
  </div>

  <div className="rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-sm">
    <p className="text-sm font-medium text-blue-600">Profissionais</p>

    <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#07111F]">
      Evolui para a próxima oportunidade
    </h2>

    <p className="mt-3 text-sm leading-6 text-neutral-600">
      Valoriza a tua experiência, identifica novas possibilidades de carreira e
      encontra oportunidades alinhadas com as tuas competências e ambição.
    </p>
  </div>

  <div className="rounded-3xl border border-neutral-200 bg-[#07111F] p-6 text-left text-white shadow-sm">
    <p className="text-sm font-medium text-blue-300">
      Empresas & Universidades
    </p>

    <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">
      Liga talento, conhecimento e mercado
    </h2>

    <p className="mt-3 text-sm leading-6 text-blue-100">
      Aproxima organizações, instituições de ensino e talento qualificado através
      de uma plataforma preparada para recrutamento, IA, empregabilidade e
      evolução profissional.
    </p>
  </div>
</div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-5 py-10">
  <div className="grid gap-5">
    <div className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-blue-600">
        Para estudantes e profissionais
      </p>

      <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#07111F]">
        Muito mais do que candidaturas
      </h2>

      <p className="mt-4 text-sm leading-6 text-neutral-600">
        Transforma o teu percurso num perfil profissional claro, atrativo e
        preparado para novas oportunidades.
      </p>

      <div className="mt-6 grid gap-3">
        <PublicFeatureItem text="Cria o teu perfil com um clique" />
        <PublicFeatureItem text="Perfil profissional moderno e inteligente" />
        <PublicFeatureItem text="Matching com as melhores vagas" />
        <PublicFeatureItem text="Candidaturas rápidas e simples" />
        <PublicFeatureItem text="Notificações em tempo real" />
      </div>
    </div>

    <div className="rounded-[32px] border border-neutral-200 bg-[#07111F] p-6 text-white shadow-sm">
      <p className="text-sm font-medium text-blue-300">
        Para empresas e universidades
      </p>

      <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">
        Recrutamento inteligente
      </h2>

      <p className="mt-4 text-sm leading-6 text-blue-100">
        Aproxima talento, empresas e instituições de ensino através de processos
        mais rápidos, dados mais úteis e IA aplicada ao recrutamento.
      </p>

      <div className="mt-6 grid gap-3">
        <PublicDarkFeatureItem text="Cria o perfil da organização com um clique" />
        <PublicDarkFeatureItem text="Publicação de vagas em 90 segundos" />
        <PublicDarkFeatureItem text="Análise inteligente de perfis" />
        <PublicDarkFeatureItem text="Matching com candidatos qualificados" />
        <PublicDarkFeatureItem text="Gestão integrada de candidatos" />
      </div>
    </div>
  </div>
</section>

<section className="border-y border-neutral-200 bg-white">
  <div className="mx-auto grid w-full max-w-md gap-3 px-5 py-10">
    <PublicStatItem number="+12k" label="Candidatos" />
    <PublicStatItem number="+350" label="Empresas & Universidades" />
    <PublicStatItem number="+4.5k" label="Candidaturas" />
  </div>
</section>

<section className="mx-auto w-full max-w-md px-5 py-12">
  <div className="rounded-[36px] bg-[#07111F] px-6 py-12 text-center text-white">
    <p className="text-xs font-medium uppercase tracking-[0.3em] text-blue-300">
      ARYNQO
    </p>

    <h2 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.05em]">
      The next step starts here.
    </h2>

    <p className="mt-5 text-sm leading-7 text-blue-100">
      Junta-te à nova plataforma de recrutamento, talento e evolução
      profissional.
    </p>

    <div className="mt-8 grid grid-cols-2 gap-3">
      <Link
        href="/registo"
        className="rounded-full bg-white px-5 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-neutral-100"
      >
        Criar conta
      </Link>

      <Link
        href="/app/vagas"
        className="rounded-full border border-white/20 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        Explorar vagas
      </Link>
    </div>
  </div>
</section>

<MobileBottomNav />
    </main>
  );
}

export default function MobileAppShell() {
  const {
    profile,
    hasSession,
    isLoading: isProfileLoading,
    appMode,
    roleLabel,
  } = useAppProfile();

  const { jobs, isLoading: isJobsLoading, errorMessage: jobsError } =
    useAppJobs();

  const {
    matches,
    isLoading: isMatchesLoading,
    errorMessage: matchesError,
  } = useAppMatches();

  const isLoading = isProfileLoading || isJobsLoading || isMatchesLoading;

  const config = useMemo(() => {
    return getAppModeConfig(profile?.role ?? null, hasSession);
  }, [hasSession, profile?.role]);

  const actions: AppAction[] = useMemo(() => {
    return getAppActions(profile?.role ?? null, hasSession);
  }, [hasSession, profile?.role]);

  const featuredJobs = useMemo(() => {
    const jobsWithMatch = jobs.filter((job) => job.hasAIMatch);

    if (jobsWithMatch.length > 0) {
      return [...jobsWithMatch].sort((a, b) => b.score - a.score).slice(0, 3);
    }

    return jobs.slice(0, 3);
  }, [jobs]);

  const featuredMatches = useMemo(() => {
    if (!hasSession) {
      return [];
    }

    return matches.slice(0, 3);
  }, [hasSession, matches]);

  const firstName = getFirstName(profile?.name ?? null, profile?.email ?? null);

  const score = useMemo(() => {
    if (!hasSession) {
      return 0;
    }

    if (
      appMode === "company" ||
      appMode === "recruiter" ||
      appMode === "admin"
    ) {
      return getAverageScore(featuredMatches.map((match) => match.score));
    }

    return getAverageScore(featuredJobs.map((job) => job.score));
  }, [appMode, featuredJobs, featuredMatches, hasSession]);

  const showMatchesAsFeatured =
    hasSession &&
    (appMode === "company" || appMode === "recruiter" || appMode === "admin");

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm font-medium text-slate-500">
          A carregar ARYNQO...
        </p>
      </main>
    );
  }

  if (!hasSession) {
    return <PublicAppHome />;
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
              ARYNQO
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Olá, {firstName}
            </h1>

            <p className="mt-1 text-xs font-medium text-white/42">
              {roleLabel}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
          >
            Dashboard
          </Link>
        </header>

        {(jobsError || matchesError) && (
          <section className="mt-5 rounded-3xl border border-amber-300/15 bg-amber-300/[0.06] p-4">
            <p className="text-sm leading-6 text-amber-100/80">
              {jobsError || matchesError}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
          <p className="text-sm font-medium text-cyan-100">
            {config.modeLabel}
          </p>

          <p className="mt-1 text-sm leading-6 text-white/60">
            {config.modeDescription}
          </p>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">{config.scoreLabel}</p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight">
                  {score > 0 ? score : "—"}
                </span>

                {score > 0 && (
                  <span className="mb-2 text-sm text-cyan-300">%</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-400/10 px-3 py-2 text-right">
              <p className="text-xs text-cyan-200">Supabase</p>
              <p className="text-sm font-semibold text-cyan-100">Dados reais</p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
              style={{ width: `${score > 0 ? score : 0}%` }}
            />
          </div>

          {score === 0 && (
            <p className="mt-4 text-sm leading-6 text-white/56">
              Ainda não existem matches IA calculados para este perfil.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              href={config.primaryHref}
              className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
            >
              {config.primaryLabel}
            </Link>

            <Link
              href={config.secondaryHref}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {config.secondaryLabel}
            </Link>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-2 gap-3">
          <Link
            href="/app/vagas"
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.075]"
          >
            <p className="text-3xl font-semibold">{jobs.length}</p>
            <p className="mt-1 text-sm text-white/55">vagas reais</p>
          </Link>

          <Link
            href="/app/matches"
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.075]"
          >
            <p className="text-3xl font-semibold">{matches.length}</p>
            <p className="mt-1 text-sm text-white/55">matches IA</p>
          </Link>
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{config.featuredTitle}</h2>

            <Link
              href={showMatchesAsFeatured ? "/app/matches" : "/app/vagas"}
              className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              Ver todos
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {showMatchesAsFeatured ? (
              featuredMatches.length > 0 ? (
                featuredMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/app/matches/${match.id}`}
                    className="block rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.075]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {match.title}
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-white/58">
                          {match.company}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-center">
                        <p className="text-lg font-semibold text-emerald-300">
                          {match.score}%
                        </p>

                        <p className="text-[11px] text-emerald-100/70">
                          match
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  <h3 className="text-base font-semibold">
                    Sem matches IA calculados
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Gera matches para cruzar o perfil com as vagas reais da
                    plataforma.
                  </p>
                </section>
              )
            ) : featuredJobs.length > 0 ? (
              featuredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/app/vagas/${job.id}`}
                  className="block rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.075]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {job.title}
                      </h3>

                      <p className="mt-1 text-sm text-white/58">
                        {job.company}
                      </p>
                    </div>

                    <div
                      className={
                        job.hasAIMatch
                          ? "rounded-2xl bg-emerald-400/10 px-3 py-2 text-center"
                          : "rounded-2xl bg-white/10 px-3 py-2 text-center"
                      }
                    >
                      <p
                        className={
                          job.hasAIMatch
                            ? "text-lg font-semibold text-emerald-300"
                            : "text-lg font-semibold text-white/60"
                        }
                      >
                        {job.hasAIMatch ? `${job.score}%` : "—"}
                      </p>

                      <p className="text-[11px] text-white/45">
                        {job.hasAIMatch ? "match" : "IA"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
                      {job.location}
                    </span>

                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
                      {job.rawWorkModel || job.model}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                <h3 className="text-base font-semibold">
                  Sem vagas disponíveis
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/55">
                  Não existem vagas ativas no Supabase neste momento.
                </p>
              </section>
            )}
          </div>
        </section>

        <section className="mt-7 pb-28">
          <h2 className="text-lg font-semibold">Próximos passos</h2>

          <div className="mt-4 space-y-3">
            {actions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="block rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/40 hover:bg-white/[0.07]"
              >
                <h3 className="text-sm font-semibold text-white">
                  {action.title}
                </h3>

                <p className="mt-1 text-sm leading-6 text-white/56">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <MobileBottomNav />
      </section>
    </main>
  );
}
