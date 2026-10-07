"use client";

import { useAsyncResource } from "./useAsyncResource";
import { supabase } from "@/lib/supabase";

export type AppJobCompany = {
  company_name: string | null;
  logo_url: string | null;
  location: string | null;
  industry: string | null;
  company_type: string | null;
  company_size: string | null;
};

export type AppJobCard = {
  id: string;
  title: string;
  company: string;
  companyProfile: AppJobCompany | null;
  area: string | null;
  location: string;
  model: "Híbrido" | "Presencial" | "Remoto" | "Outro";
  rawWorkModel: string | null;
  type: string;
  seniority: string | null;
  score: number;
  salary: string;
  description: string;
  candidatePitch: string | null;
  aiSummary: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  specializations: string[];
  skills: string[];
  languages: string[];
  educationRequirements: string | null;
  experienceRequirements: string | null;
  createdAt: string | null;
  hasAIMatch: boolean;
};

type RawCompanyProfile = {
  company_name: string | null;
  logo_url: string | null;
  location: string | null;
  industry: string | null;
  company_type: string | null;
  company_size: string | null;
};

type RawJob = {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  specializations: string[] | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
  location: string | null;
  work_model: string | null;
  work_mode: string | null;
  opportunity_type: string | null;
  contract_type: string | null;
  seniority: string | null;
  languages: string[] | null;
  salary_range: string | null;
  salary_min: number | null;
  salary_max: number | null;
  education_requirements: string | null;
  experience_requirements: string | null;
  candidate_pitch: string | null;
  ai_summary: string | null;
  is_active: boolean | null;
  created_at: string | null;
  company_profiles: RawCompanyProfile | RawCompanyProfile[] | null;
};

type RawAIMatch = {
  job_id: string;
  match_score: number | null;
};

type UseAppJobsResult = {
  jobs: AppJobCard[];
  isLoading: boolean;
  errorMessage: string | null;
  reloadJobs: () => Promise<void>;
};

function normalizeStringArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeCompany(
  companyProfiles: RawCompanyProfile | RawCompanyProfile[] | null,
): RawCompanyProfile | null {
  if (Array.isArray(companyProfiles)) {
    return companyProfiles[0] ?? null;
  }

  return companyProfiles;
}

function normalizeWorkModel(
  workModel: string | null | undefined,
  workMode: string | null | undefined,
): AppJobCard["model"] {
  const value = (workModel || workMode || "").trim().toLowerCase();

  if (!value) {
    return "Outro";
  }

  if (value === "remote" || value === "remoto" || value.includes("remote")) {
    return "Remoto";
  }

  if (
    value === "hybrid" ||
    value === "híbrido" ||
    value === "hibrido" ||
    value.includes("hybrid")
  ) {
    return "Híbrido";
  }

  if (
    value === "presential" ||
    value === "presencial" ||
    value.includes("presential")
  ) {
    return "Presencial";
  }

  return "Outro";
}

function getWorkModelLabel(
  workModel: string | null | undefined,
  workMode: string | null | undefined,
) {
  if (workModel) {
    return workModel;
  }

  if (workMode === "remote") {
    return "Remoto";
  }

  if (workMode === "hybrid") {
    return "Híbrido";
  }

  if (workMode === "presential") {
    return "Presencial";
  }

  return workMode || null;
}

function getSalaryLabel(job: RawJob) {
  if (job.salary_range) {
    return job.salary_range;
  }

  if (job.salary_min && job.salary_max) {
    return `${job.salary_min}€ - ${job.salary_max}€`;
  }

  if (job.salary_min) {
    return `A partir de ${job.salary_min}€`;
  }

  if (job.salary_max) {
    return `Até ${job.salary_max}€`;
  }

  return "A definir";
}

function mapRawJobToAppJob(
  job: RawJob,
  aiMatchByJobId: Map<string, RawAIMatch>,
): AppJobCard {
  const companyProfile = normalizeCompany(job.company_profiles);

  const requiredSkills = normalizeStringArray(job.required_skills);
  const preferredSkills = normalizeStringArray(job.preferred_skills);
  const specializations = normalizeStringArray(job.specializations);
  const languages = normalizeStringArray(job.languages);

  const skills = Array.from(
    new Set([...requiredSkills, ...preferredSkills, ...specializations]),
  );

  const match = aiMatchByJobId.get(job.id);
  const score =
    typeof match?.match_score === "number" && Number.isFinite(match.match_score)
      ? Math.round(match.match_score)
      : 0;

  return {
    id: job.id,
    title: job.title,
    company: companyProfile?.company_name || "Empresa não identificada",
    companyProfile,
    area: job.area,
    location: job.location || "Localização a definir",
    model: normalizeWorkModel(job.work_model, job.work_mode),
    rawWorkModel: getWorkModelLabel(job.work_model, job.work_mode),
    type: job.opportunity_type || job.contract_type || "Tipo a definir",
    seniority: job.seniority,
    score,
    salary: getSalaryLabel(job),
    description: job.description || "Sem descrição disponível.",
    candidatePitch: job.candidate_pitch,
    aiSummary: job.ai_summary,
    requiredSkills,
    preferredSkills,
    specializations,
    skills,
    languages,
    educationRequirements: job.education_requirements,
    experienceRequirements: job.experience_requirements,
    createdAt: job.created_at,
    hasAIMatch: Boolean(match),
  };
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

const emptyJobs: AppJobCard[] = [];

async function loadJobs(): Promise<AppJobCard[]> {


    const studentId = await getCurrentStudentProfileId();

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select(
        `
        id,
        title,
        description,
        area,
        specializations,
        required_skills,
        preferred_skills,
        location,
        work_model,
        work_mode,
        opportunity_type,
        contract_type,
        seniority,
        languages,
        salary_range,
        salary_min,
        salary_max,
        education_requirements,
        experience_requirements,
        candidate_pitch,
        ai_summary,
        is_active,
        created_at,
        company_profiles (
          company_name,
          logo_url,
          location,
          industry,
          company_type,
          company_size
        )
      `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error(jobsError);
      throw new Error("Não foi possível carregar as vagas do Supabase.");
    }

    const rawJobs = (jobsData || []) as RawJob[];
    const jobIds = rawJobs.map((job) => job.id);

    let aiMatchByJobId = new Map<string, RawAIMatch>();

    if (studentId && jobIds.length > 0) {
      const { data: matchesData, error: matchesError } = await supabase
        .from("ai_matches")
        .select("job_id, match_score")
        .eq("student_id", studentId)
        .in("job_id", jobIds);

      if (matchesError) {
        console.error(matchesError);
      }

      if (!matchesError && matchesData) {
        aiMatchByJobId = new Map(
          (matchesData as RawAIMatch[]).map((match) => [match.job_id, match]),
        );
      }
    }

    return rawJobs.map((job) => mapRawJobToAppJob(job, aiMatchByJobId));
}

export function useAppJobs(): UseAppJobsResult {
  const { data, isLoading, errorMessage, reload } = useAsyncResource(loadJobs, emptyJobs, "Não foi possível carregar as vagas do Supabase.");
  return { jobs: data, isLoading, errorMessage, reloadJobs: reload };
}