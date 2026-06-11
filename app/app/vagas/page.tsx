"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MobileBottomNav from "@/app/components/arynqo/MobileBottomNav";
import { useAppJobs } from "../../hooks/useAppJobs";
import type { AppJobCard } from "../../hooks/useAppJobs";
import { useAppMatchGeneration } from "../../hooks/useAppMatchGeneration";

const filters = ["Todas", "Híbrido", "Presencial", "Remoto"] as const;

type Filter = (typeof filters)[number];

function getBestMatchText(job: AppJobCard | undefined) {
  if (!job) {
    return "Não encontrámos vagas com os filtros selecionados.";
  }

  if (!job.hasAIMatch || job.score <= 0) {
    return `Melhor oportunidade encontrada: ${job.title}. Gera matches IA para calcular a compatibilidade real.`;
  }

  return `Melhor correspondência atual: ${job.title}, com ${job.score}% de compatibilidade.`;
}

function getScoreLabel(job: AppJobCard) {
  if (!job.hasAIMatch || job.score <= 0) {
    return "—";
  }

  return `${job.score}%`;
}

export default function AppVagasPage() {
  const { jobs, isLoading, errorMessage, reloadJobs } = useAppJobs();

  const {
    isGeneratingMatches,
    generationMessage,
    generateMatchesForCurrentStudent,
  } = useAppMatchGeneration();

  const [activeFilter, setActiveFilter] = useState<Filter>("Todas");
  const [search, setSearch] = useState("");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesFilter =
        activeFilter === "Todas" ? true : job.model === activeFilter;

      const searchableText = [
        job.title,
        job.company,
        job.area || "",
        job.location,
        job.model,
        job.rawWorkModel || "",
        job.type,
        job.seniority || "",
        job.salary,
        job.description,
        job.candidatePitch || "",
        job.aiSummary || "",
        ...job.requiredSkills,
        ...job.preferredSkills,
        ...job.specializations,
        ...job.languages,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(search.toLowerCase().trim());

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, jobs, search]);

  const bestMatch = useMemo(() => {
    const jobsWithMatch = filteredJobs.filter((job) => job.hasAIMatch);

    if (jobsWithMatch.length > 0) {
      return [...jobsWithMatch].sort((a, b) => b.score - a.score)[0];
    }

    return filteredJobs[0];
  }, [filteredJobs]);

  const hasAnyCalculatedMatch = jobs.some((job) => job.hasAIMatch);

  async function handleGenerateMatches() {
    const generated = await generateMatchesForCurrentStudent();

    if (generated) {
      await reloadJobs();
    }
  }

  function handleToggleJob(jobId: string) {
    setExpandedJobId((currentJobId) =>
      currentJobId === jobId ? null : jobId,
    );
  }

  function handleClearFilters() {
    setSearch("");
    setActiveFilter("Todas");
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
        <section className="mx-auto w-full max-w-md">
          <div>
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-9 w-56 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-16 w-full animate-pulse rounded-3xl bg-white/10" />
          </div>

          <div className="mt-8 h-36 animate-pulse rounded-[2rem] bg-white/10" />

          <div className="mt-6 space-y-4">
            <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
            <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-28">
        <header>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
                ARYNQO
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Oportunidades
              </h1>
            </div>

            <button
              type="button"
              onClick={reloadJobs}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
            >
              Atualizar
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/58">
            Vagas reais publicadas na plataforma, cruzadas com os teus dados de
            perfil e matches gerados por IA.
          </p>
        </header>

        <section className="sticky top-0 z-10 -mx-5 mt-6 border-b border-white/10 bg-[#050816]/92 px-5 pb-4 pt-2 backdrop-blur-xl">
          <label htmlFor="job-search" className="sr-only">
            Pesquisar vagas
          </label>

          <input
            id="job-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar por função, skill ou localização..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/50 focus:bg-white/[0.08]"
          />

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={
                    isActive
                      ? "shrink-0 rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold text-[#06111f]"
                      : "shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                  }
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </section>

        {(errorMessage || generationMessage) && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-sm leading-6 text-cyan-100/85">
              {generationMessage || errorMessage}
            </p>
          </section>
        )}

        <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm text-white/60">Recomendação IA</p>

              <h2 className="mt-2 text-xl font-semibold">
                {filteredJobs.length === 1
                  ? "1 vaga encontrada"
                  : `${filteredJobs.length} vagas encontradas`}
              </h2>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-cyan-200">
                {jobs.filter((job) => job.hasAIMatch).length}
              </p>

              <p className="text-[11px] text-white/45">com match</p>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/58">
            {getBestMatchText(bestMatch)}
          </p>

          <button
            type="button"
            onClick={handleGenerateMatches}
            disabled={isGeneratingMatches}
            className="mt-5 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingMatches
              ? "A gerar matches com IA..."
              : hasAnyCalculatedMatch
                ? "Recalcular matches IA"
                : "Gerar matches IA"}
          </button>
        </section>

        <section className="mt-6 space-y-4">
          {filteredJobs.map((job) => {
            const isExpanded = expandedJobId === job.id;

            return (
              <article
                key={job.id}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
              >
                <button
                  type="button"
                  onClick={() => handleToggleJob(job.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {job.area && (
                        <p className="mb-1 text-xs font-medium text-cyan-300">
                          {job.area}
                        </p>
                      )}

                      <h2 className="text-base font-semibold">{job.title}</h2>

                      <p className="mt-1 text-sm text-white/55">
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
                        {getScoreLabel(job)}
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

                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
                      {job.type}
                    </span>

                    {job.seniority && (
                      <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/70">
                        {job.seniority}
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-sm leading-6 text-white/60">
                      {job.description}
                    </p>

                    {job.aiSummary && (
                      <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/60">
                          Resumo IA
                        </p>

                        <p className="mt-2 text-sm leading-6 text-white/60">
                          {job.aiSummary}
                        </p>
                      </div>
                    )}

                    {job.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.skills.map((skill) => (
                          <span
                            key={`${job.id}-${skill}`}
                            className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-3 py-1 text-xs text-cyan-100"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/app/vagas/${job.id}`}
                      className="mt-5 block w-full rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
                    >
                      Ver detalhes da vaga
                    </Link>
                  </div>
                )}
              </article>
            );
          })}

          {filteredJobs.length === 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center">
              <h2 className="text-base font-semibold">Sem resultados</h2>

              <p className="mt-2 text-sm leading-6 text-white/55">
                Experimenta remover filtros ou pesquisar por outra competência,
                localização ou modelo de trabalho.
              </p>

              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-5 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
              >
                Limpar filtros
              </button>
            </section>
          )}
        </section>

        <MobileBottomNav />
      </section>
    </main>
  );
}