"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MobileBottomNav from "@/app/components/arynqo/MobileBottomNav";
import { useAppMatches } from "../../hooks/useAppMatches";
import { useAppMatchGeneration } from "../../hooks/useAppMatchGeneration";
import { useAppProfile } from "../../hooks/useAppProfile";
import { supabase } from "@/lib/supabase";

type MatchType = "Todos" | "Alto" | "Médio" | "Baixo";
type SwipeDirection = "left" | "right";

const filters: MatchType[] = ["Todos", "Alto", "Médio", "Baixo"];

function getMatchLevel(score: number): Exclude<MatchType, "Todos"> {
  if (score >= 85) {
    return "Alto";
  }

  if (score >= 65) {
    return "Médio";
  }

  return "Baixo";
}

function getLevelClass(level: Exclude<MatchType, "Todos">) {
  if (level === "Alto") {
    return "rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200";
  }

  if (level === "Médio") {
    return "rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200";
  }

  return "rounded-full bg-red-400/10 px-2.5 py-1 text-[11px] font-medium text-red-200";
}

async function getCurrentStudentProfileId() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return null;
  }

  const { data } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", sessionData.session.user.id)
    .maybeSingle();

  return data?.id || null;
}

export default function AppMatchesPage() {
  const {
    hasSession,
    appMode,
    isLoading: isProfileLoading,
  } = useAppProfile();

  const { matches, isLoading, errorMessage, reloadMatches } = useAppMatches();

  const {
    isGeneratingMatches,
    generationMessage,
    generateMatchesForCurrentStudent,
  } = useAppMatchGeneration();

  const [activeFilter, setActiveFilter] = useState<MatchType>("Todos");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);

  const isTalentMode = appMode === "talent";

  const visibleMatches = useMemo(() => {
    if (!hasSession) {
      return [];
    }

    return matches.filter((match) => match.isRelevant !== false);
  }, [hasSession, matches]);

  const filteredMatches = useMemo(() => {
    if (!hasSession) {
      return [];
    }

    return visibleMatches.filter((match) => {
      if (activeFilter === "Todos") {
        return true;
      }

      return getMatchLevel(match.score) === activeFilter;
    });
  }, [activeFilter, hasSession, visibleMatches]);

  const averageScore = useMemo(() => {
    if (!hasSession || filteredMatches.length === 0) {
      return 0;
    }

    const total = filteredMatches.reduce((sum, match) => sum + match.score, 0);

    return Math.round(total / filteredMatches.length);
  }, [filteredMatches, hasSession]);

  const currentMatch = isTalentMode ? visibleMatches[currentIndex] : null;
  const nextMatch = isTalentMode ? visibleMatches[currentIndex + 1] : null;

  async function handleGenerateMatches() {
    if (!hasSession) {
      return;
    }

    const generated = await generateMatchesForCurrentStudent();

    if (generated) {
      setCurrentIndex(0);
      await reloadMatches();
    }
  }

  function handleToggleMatch(matchId: string) {
    setExpandedMatchId((currentMatchId) =>
      currentMatchId === matchId ? null : matchId,
    );
  }

  function goToNextCard() {
    setDragX(0);
    setTouchStartX(null);
    setCurrentIndex((index) => index + 1);
  }

  async function handleRejectMatch(matchId: string) {
    setIsProcessingDecision(true);
    setDecisionMessage("");

    const { error } = await supabase
      .from("ai_matches")
      .update({
        is_relevant: false,
      })
      .eq("id", matchId);

    if (error) {
      console.error(error);
      setDecisionMessage("Não foi possível recusar esta vaga.");
      setIsProcessingDecision(false);
      setDragX(0);
      return;
    }

    setDecisionMessage("Vaga recusada.");
    setIsProcessingDecision(false);
    goToNextCard();
  }

  async function handleApplyToMatch(jobId: string) {
    setIsProcessingDecision(true);
    setDecisionMessage("");

    const studentId = await getCurrentStudentProfileId();

    if (!studentId) {
      setDecisionMessage("Apenas candidatos podem candidatar-se a vagas.");
      setIsProcessingDecision(false);
      setDragX(0);
      return;
    }

    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      student_id: studentId,
    });

    if (error) {
      console.error(error);

      if (
        error.message.toLowerCase().includes("duplicate") ||
        error.message.toLowerCase().includes("already")
      ) {
        setDecisionMessage("Já te candidataste a esta vaga.");
        setIsProcessingDecision(false);
        goToNextCard();
        return;
      }

      setDecisionMessage("Não foi possível enviar a candidatura.");
      setIsProcessingDecision(false);
      setDragX(0);
      return;
    }

    setDecisionMessage("Candidatura enviada com sucesso.");
    setIsProcessingDecision(false);
    goToNextCard();
  }

  async function handleSwipeDecision(direction: SwipeDirection) {
    if (!currentMatch || isProcessingDecision) {
      return;
    }

    if (direction === "right") {
      await handleApplyToMatch(currentMatch.jobId);
      return;
    }

    await handleRejectMatch(currentMatch.id);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (isProcessingDecision) {
      return;
    }

    setTouchStartX(event.touches[0].clientX);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null || isProcessingDecision) {
      return;
    }

    const currentX = event.touches[0].clientX;
    setDragX(currentX - touchStartX);
  }

  async function handleTouchEnd() {
    if (isProcessingDecision) {
      return;
    }

    if (dragX > 90) {
      await handleSwipeDecision("right");
      return;
    }

    if (dragX < -90) {
      await handleSwipeDecision("left");
      return;
    }

    setDragX(0);
    setTouchStartX(null);
  }

  if (isProfileLoading || isLoading) {
    return (
      <main className="min-h-screen bg-[#050816] px-5 py-6 text-white">
        <section className="mx-auto w-full max-w-md">
          <div>
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-9 w-52 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-16 w-full animate-pulse rounded-3xl bg-white/10" />
          </div>

          <div className="mt-8 h-[520px] animate-pulse rounded-[2rem] bg-white/10" />
        </section>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 pb-28">
          <header>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
              ARYNQO
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Matches IA
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/58">
              Os matches são personalizados e só ficam disponíveis depois de
              iniciares sessão, tal como na versão desktop.
            </p>
          </header>

          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-cyan-100">Acesso reservado</p>

            <h2 className="mt-2 text-xl font-semibold">
              Entra para veres os teus matches
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/60">
              A ARYNQO cruza o teu perfil real com vagas, competências,
              preferências e dados de IA. Sem sessão iniciada, estes dados não
              são apresentados.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
              >
                Entrar
              </Link>

              <Link
                href="/registo"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                Criar conta
              </Link>
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <h2 className="text-sm font-semibold">Podes continuar a explorar</h2>

            <p className="mt-1 text-sm leading-6 text-white/56">
              As vagas públicas e a ARYNQO Academy continuam disponíveis em modo
              público.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/app/vagas"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                Ver vagas
              </Link>

              <Link
                href="/app/academia"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                Academy
              </Link>
            </div>
          </section>

          <MobileBottomNav />
        </section>
      </main>
    );
  }

  if (isTalentMode) {
    const cardRotation = Math.max(-8, Math.min(8, dragX / 18));
    const decisionOpacity = Math.min(1, Math.abs(dragX) / 120);
    const isRightDecision = dragX > 0;
    const remainingMatches = Math.max(visibleMatches.length - currentIndex, 0);

    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 pb-28">
          <header>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
                  ARYNQO
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Matches IA
                </h1>
              </div>

              <button
                type="button"
                onClick={handleGenerateMatches}
                disabled={isGeneratingMatches}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingMatches ? "IA..." : "Gerar"}
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-white/58">
              Desliza para a direita para te candidatares. Desliza para a
              esquerda para recusares a vaga.
            </p>
          </header>

          {(errorMessage || generationMessage || decisionMessage) && (
            <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
              <p className="text-sm leading-6 text-cyan-100/85">
                {decisionMessage || generationMessage || errorMessage}
              </p>
            </section>
          )}

          <section className="mt-5 flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.045] p-4">
            <div>
              <p className="text-xs text-white/40">Matches disponíveis</p>
              <p className="mt-1 text-2xl font-semibold">{remainingMatches}</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-white/40">Média IA</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-200">
                {averageScore > 0 ? `${averageScore}%` : "—"}
              </p>
            </div>
          </section>

          {currentMatch ? (
            <section className="relative mt-6 flex flex-1 items-center justify-center">
              {nextMatch && (
                <article className="absolute inset-x-2 top-6 min-h-[520px] scale-[0.96] rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 opacity-60" />
              )}

              <article
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative min-h-[540px] w-full rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/35 backdrop-blur transition"
                style={{
                  transform: `translateX(${dragX}px) rotate(${cardRotation}deg)`,
                }}
              >
                <div
                  className={
                    isRightDecision
                      ? "pointer-events-none absolute left-5 top-5 rounded-2xl border border-emerald-300/40 bg-emerald-300/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-100"
                      : "pointer-events-none absolute right-5 top-5 rounded-2xl border border-red-300/40 bg-red-300/15 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-red-100"
                  }
                  style={{ opacity: decisionOpacity }}
                >
                  {isRightDecision ? "Candidatar" : "Recusar"}
                </div>

                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                        {currentMatch.matchCategory || "Match IA"}
                      </p>

                      <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                        {currentMatch.title}
                      </h2>

                      <p className="mt-2 text-sm text-white/55">
                        {currentMatch.company}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-emerald-400/10 px-4 py-3 text-center">
                      <p className="text-2xl font-semibold text-emerald-300">
                        {currentMatch.score}%
                      </p>

                      <p className="text-[11px] text-emerald-100/70">match</p>
                    </div>
                  </div>

                  <p className="mt-5 line-clamp-5 text-sm leading-6 text-white/64">
                    {currentMatch.reason}
                  </p>

                  {currentMatch.matchingSkills.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
                        Skills em comum
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentMatch.matchingSkills
                          .slice(0, 8)
                          .map((skill) => (
                            <span
                              key={`${currentMatch.id}-${skill}`}
                              className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1 text-xs text-emerald-100"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {currentMatch.gaps.length > 0 && (
                    <div className="mt-5">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
                        A validar
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentMatch.gaps.slice(0, 5).map((gap) => (
                          <span
                            key={`${currentMatch.id}-${gap}`}
                            className="rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-3 py-1 text-xs text-amber-100"
                          >
                            {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleSwipeDecision("left")}
                        disabled={isProcessingDecision}
                        className="rounded-2xl border border-red-300/20 bg-red-300/[0.08] px-4 py-4 text-sm font-semibold text-red-100 transition hover:bg-red-300/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Recusar
                      </button>

                      <Link
                        href={`/app/matches/${currentMatch.id}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                      >
                        Detalhes
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleSwipeDecision("right")}
                        disabled={isProcessingDecision}
                        className="rounded-2xl bg-cyan-300 px-4 py-4 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Candidatar
                      </button>
                    </div>

                    <p className="mt-4 text-center text-xs leading-5 text-white/40">
                      Também podes usar os botões para decidir sem deslizar.
                    </p>
                  </div>
                </div>
              </article>
            </section>
          ) : (
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 text-center">
              <h2 className="text-xl font-semibold">
                Sem mais matches disponíveis
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/58">
                Geraste decisão sobre todas as vagas disponíveis ou ainda não
                existem matches IA calculados.
              </p>

              <button
                type="button"
                onClick={handleGenerateMatches}
                disabled={isGeneratingMatches}
                className="mt-6 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingMatches
                  ? "A gerar matches..."
                  : "Gerar/Recalcular matches IA"}
              </button>
            </section>
          )}

          <MobileBottomNav />
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
                Matches IA
              </h1>
            </div>

            <button
              type="button"
              onClick={reloadMatches}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.09] hover:text-white"
            >
              Atualizar
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/58">
            Uma leitura inteligente do alinhamento entre perfil, oportunidades,
            competências e potencial profissional.
          </p>
        </header>

        {(errorMessage || generationMessage) && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4">
            <p className="text-sm leading-6 text-cyan-100/85">
              {generationMessage || errorMessage}
            </p>
          </section>
        )}

        <section className="mt-6 rounded-[2rem] border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm text-cyan-100">Análise inteligente</p>

              <h2 className="mt-2 text-xl font-semibold">
                {matches.length > 0
                  ? "Atratividade profissional calculada"
                  : "Ainda sem matches calculados"}
              </h2>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-cyan-200">
                {averageScore}%
              </p>

              <p className="text-[11px] text-white/45">média</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/60">
            {matches.length > 0
              ? "A IA encontrou padrões entre experiência, competências, preferências e vagas disponíveis."
              : "Gera matches para cruzar o teu perfil com as vagas ativas da plataforma."}
          </p>
        </section>

        <section className="sticky top-0 z-10 -mx-5 mt-6 border-b border-white/10 bg-[#050816]/92 px-5 pb-4 pt-2 backdrop-blur-xl">
          <div className="flex gap-2 overflow-x-auto pb-1">
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

        <section className="mt-5 space-y-4">
          {filteredMatches.map((match) => {
            const isExpanded = expandedMatchId === match.id;
            const level = getMatchLevel(match.score);

            return (
              <article
                key={match.id}
                className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
              >
                <button
                  type="button"
                  onClick={() => handleToggleMatch(match.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">
                          {match.title}
                        </h2>

                        <span className={getLevelClass(level)}>{level}</span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {match.company}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-emerald-300">
                        {match.score}%
                      </p>

                      <p className="text-[11px] text-emerald-100/70">match</p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                    <div className="rounded-2xl bg-white/[0.04] p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
                        Porque aparece
                      </p>

                      <p className="mt-2 text-sm leading-6 text-white/60">
                        {match.reason}
                      </p>
                    </div>

                    <Link
                      href={`/app/matches/${match.id}`}
                      className="block w-full rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
                    >
                      Ver recomendação completa
                    </Link>
                  </div>
                )}
              </article>
            );
          })}

          {filteredMatches.length === 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center">
              <h2 className="text-base font-semibold">
                {matches.length === 0
                  ? "Ainda não tens matches IA"
                  : "Sem resultados neste filtro"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-white/55">
                {matches.length === 0
                  ? "Gera os teus matches para cruzar o perfil com as vagas ativas."
                  : "Experimenta alterar o filtro para veres outros níveis de compatibilidade."}
              </p>

              <button
                type="button"
                onClick={
                  matches.length === 0
                    ? handleGenerateMatches
                    : () => setActiveFilter("Todos")
                }
                disabled={isGeneratingMatches}
                className="mt-5 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {matches.length === 0
                  ? isGeneratingMatches
                    ? "A gerar matches..."
                    : "Gerar matches IA"
                  : "Ver todos os matches"}
              </button>
            </section>
          )}
        </section>

        <MobileBottomNav />
      </section>
    </main>
  );
}