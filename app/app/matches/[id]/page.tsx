"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import MobileBottomNav from "@/app/components/arynqo/MobileBottomNav";
import { useAppMatches } from "../../../hooks/useAppMatches";

function getMatchLevel(score: number) {
  if (score >= 85) {
    return "Alto";
  }

  if (score >= 65) {
    return "Médio";
  }

  return "Baixo";
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

export default function AppMatchDetailPage() {
  const params = useParams<{ id: string }>();
  const { matches, isLoading } = useAppMatches();

  const match = matches.find((item) => item.id === params.id);

  if (isLoading) {
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

  if (!match) {
    return (
      <main className="min-h-screen bg-[#050816] text-white">
        <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-6 pb-28">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            ARYNQO
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Match não encontrado
          </h1>

          <p className="mt-4 text-sm leading-6 text-white/60">
            Esta recomendação ainda não existe, foi removida ou não pertence ao
            teu perfil.
          </p>

          <Link
            href="/app/matches"
            className="mt-8 rounded-2xl bg-cyan-300 px-5 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
          >
            Voltar aos matches
          </Link>
        </section>

        <MobileBottomNav />
      </main>
    );
  }

  const level = getMatchLevel(match.score);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-28">
        <header>
          <Link
            href="/app/matches"
            className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            ← Voltar aos matches
          </Link>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            ARYNQO
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {match.title}
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/58">
            {match.company}
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-cyan-950/30">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm text-white/60">Compatibilidade IA</p>

              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-semibold tracking-tight">
                  {match.score}
                </span>

                <span className="mb-2 text-sm text-cyan-300">%</span>
              </div>
            </div>

            <div
              className={
                level === "Alto"
                  ? "rounded-2xl bg-emerald-400/10 px-3 py-2 text-center"
                  : level === "Médio"
                    ? "rounded-2xl bg-amber-400/10 px-3 py-2 text-center"
                    : "rounded-2xl bg-red-400/10 px-3 py-2 text-center"
              }
            >
              <p
                className={
                  level === "Alto"
                    ? "text-sm font-semibold text-emerald-200"
                    : level === "Médio"
                      ? "text-sm font-semibold text-amber-200"
                      : "text-sm font-semibold text-red-200"
                }
              >
                {level}
              </p>

              <p className="mt-1 text-[11px] text-white/50">nível de match</p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500"
              style={{ width: `${match.score}/100` }}
            />
          </div>

          {match.matchCategory && (
            <p className="mt-4 text-sm leading-6 text-white/55">
              Categoria: {match.matchCategory}
            </p>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Porque aparece
          </p>

          <p className="mt-3 text-sm leading-6 text-white/65">
            {match.reason}
          </p>
        </section>

        <section className="mt-5 grid gap-3">
          <ScoreItem label="Skills" value={match.scores.skills} />
          <ScoreItem label="Área/Função" value={match.scores.role} />
          <ScoreItem label="Senioridade" value={match.scores.seniority} />
          <ScoreItem label="Localização" value={match.scores.location} />
          <ScoreItem label="Modelo de trabalho" value={match.scores.workModel} />
          <ScoreItem label="Salário" value={match.scores.salary} />
          <ScoreItem
            label="Formação / Idiomas"
            value={match.scores.educationLanguage}
          />
          <ScoreItem
            label="Tipo oportunidade"
            value={match.scores.opportunityType}
          />
        </section>

        <div className="mt-5 grid gap-3">
          <TagList title="Pontos fortes" items={match.strengths} tone="success" />

          <TagList
            title="Skills em comum"
            items={match.matchingSkills}
            tone="success"
          />

          <TagList title="A validar" items={match.gaps} tone="warning" />

          <TagList
            title="Skills em falta"
            items={match.missingSkills}
            tone="warning"
          />

          <TagList
            title="Recomendações IA"
            items={match.recommendations}
            tone="neutral"
          />
        </div>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/35">
            Descrição da vaga
          </p>

          <p className="mt-3 text-sm leading-6 text-white/65">
            {match.description}
          </p>
        </section>

        <Link
          href={`/app/vagas/${match.jobId}`}
          className="mt-6 block w-full rounded-2xl bg-cyan-300 px-4 py-3 text-center text-sm font-semibold text-[#06111f] transition hover:bg-cyan-200"
        >
          Ver vaga associada
        </Link>

        <MobileBottomNav />
      </section>
    </main>
  );
}