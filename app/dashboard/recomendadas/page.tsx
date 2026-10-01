"use client";
import { localizedAlert } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText, LElement } from "@/lib/i18n/client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Skill = {
  id: string;
  name: string;
};

type Job = {
  id: string;
  title: string;
  description: string;
  area: string;
  location: string;
  work_mode: string;
  contract_type: string | null;
};

type RecommendedJob = Job & {
  matchedSkills: Skill[];
};

type StudentSkillRow = {
  skills: Skill | Skill[] | null;
};

type JobSkillRow = {
  job_id: string;
  skills: Skill | Skill[] | null;
  jobs: Job | Job[] | null;
};

export default function VagasRecomendadasPage() {
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [studentSkills, setStudentSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = browserLocalizedPath("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!studentProfile) {
      localizedAlert("Apenas estudantes podem ver recomendações.");
      window.location.href = browserLocalizedPath("/dashboard");
      return;
    }

    const { data: studentSkillsData, error: studentSkillsError } =
      await supabase
        .from("student_skills")
        .select(
          `
          skills (
            id,
            name
          )
        `
        )
        .eq("student_id", studentProfile.id);

    if (studentSkillsError) {
      localizedAlert(studentSkillsError.message);
      setIsLoading(false);
      return;
    }

    const normalizedStudentSkills = (
      (studentSkillsData || []) as StudentSkillRow[]
    )
      .map((row) =>
        Array.isArray(row.skills) ? row.skills[0] ?? null : row.skills
      )
      .filter((skill): skill is Skill => Boolean(skill));

    setStudentSkills(normalizedStudentSkills);

    if (normalizedStudentSkills.length === 0) {
      setRecommendedJobs([]);
      setIsLoading(false);
      return;
    }

    const studentSkillIds = normalizedStudentSkills.map((skill) => skill.id);

    const { data: jobSkillsData, error: jobSkillsError } = await supabase
      .from("job_skills")
      .select(
        `
        job_id,
        skills (
          id,
          name
        ),
        jobs (
          id,
          title,
          description,
          area,
          location,
          work_mode,
          contract_type
        )
      `
      )
      .in("skill_id", studentSkillIds);

    if (jobSkillsError) {
      localizedAlert(jobSkillsError.message);
      setIsLoading(false);
      return;
    }

    const recommendationsMap = new Map<string, RecommendedJob>();

    ((jobSkillsData || []) as JobSkillRow[]).forEach((row) => {
      const job = Array.isArray(row.jobs) ? row.jobs[0] ?? null : row.jobs;
      const skill = Array.isArray(row.skills)
        ? row.skills[0] ?? null
        : row.skills;

      if (!job || !skill) {
        return;
      }

      const existingJob = recommendationsMap.get(job.id);

      if (existingJob) {
        existingJob.matchedSkills.push(skill);
      } else {
        recommendationsMap.set(job.id, {
          ...job,
          matchedSkills: [skill],
        });
      }
    });

    const recommendations = Array.from(recommendationsMap.values()).sort(
      (a, b) => b.matchedSkills.length - a.matchedSkills.length
    );

    setRecommendedJobs(recommendations);
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p><LText text={"A carregar recomendações..."} /></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="text-sm text-neutral-500"><LText text={"Dashboard"} /></p>

          <h1 className="text-4xl font-bold tracking-tight">
            <LText text={"Vagas recomendadas"} /></h1>

          <p className="mt-3 max-w-2xl text-neutral-600">
            <LText text={"Recomendações geradas com base nas skills que adicionaste ao teu perfil."} /></p>
        </div>

        {studentSkills.length > 0 && (
          <section className="mb-8 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold"><LText text={"As tuas skills"} /></h2>

            <div className="mt-4 flex flex-wrap gap-3">
              {studentSkills.map((skill) => (
                <span
                  key={skill.id}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm"
                >
                  <LText text={skill.name} />
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6">
          {recommendedJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm"
            >
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
                  {job.matchedSkills.length} <LText text={" skill"} /><LText text={job.matchedSkills.length === 1 ? "" : "s"} /> <LText text={" em comum"} /></span>

                <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm">
                  <LText text={job.area} />
                </span>

                <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm">
                  <LText text={job.work_mode} />
                </span>

                {job.contract_type && (
                  <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm">
                    <LText text={job.contract_type} />
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-3xl font-bold">{job.title}</h2>

              <p className="mt-3 text-neutral-600">{job.location}</p>

              <div className="mt-5">
                <p className="text-sm font-medium text-neutral-500">
                  <LText text={"Skills correspondentes"} /></p>

                <div className="mt-3 flex flex-wrap gap-3">
                  {job.matchedSkills.map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-full border border-neutral-300 px-4 py-2 text-sm"
                    >
                      <LText text={skill.name} />
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-6 line-clamp-3 leading-relaxed text-neutral-700">
                {job.description}
              </p>

              <LElement as="a"
                href={`/vagas/${job.id}`}
                className="mt-7 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                <LText text={"Ver vaga"} /></LElement>
            </article>
          ))}

          {studentSkills.length === 0 && (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
              <p className="text-lg text-neutral-500">
                <LText text={"Ainda não tens skills no teu perfil."} /></p>

              <LElement as="a"
                href="/dashboard/perfil"
                className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                <LText text={"Adicionar skills"} /></LElement>
            </div>
          )}

          {studentSkills.length > 0 && recommendedJobs.length === 0 && (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
              <p className="text-lg text-neutral-500">
                <LText text={"Ainda não encontrámos vagas compatíveis com as tuas skills."} /></p>

              <LElement as="a"
                href="/vagas"
                className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                <LText text={"Ver todas as vagas"} /></LElement>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}