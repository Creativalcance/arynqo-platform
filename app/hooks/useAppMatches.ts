"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppMatchItem = {
  id: string;
  jobId: string;
  studentId: string;
  title: string;
  company: string;
  description: string;
  score: number;
  reason: string;
  strengths: string[];
  gaps: string[];
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  matchCategory: string | null;
  isRelevant: boolean | null;
  scores: {
    skills: number | null;
    role: number | null;
    seniority: number | null;
    location: number | null;
    workModel: number | null;
    salary: number | null;
    educationLanguage: number | null;
    opportunityType: number | null;
  };
};

type RawCompanyProfile = {
  company_name: string | null;
};

type RawJob = {
  id: string;
  title: string | null;
  description: string | null;
  area: string | null;
  company_profiles: RawCompanyProfile | RawCompanyProfile[] | null;
};

type RawAIMatch = {
  id: string;
  student_id: string;
  job_id: string;
  match_score: number | null;
  skills_score: number | null;
  role_score: number | null;
  seniority_score: number | null;
  location_score: number | null;
  work_model_score: number | null;
  salary_score: number | null;
  education_language_score: number | null;
  opportunity_type_score: number | null;
  match_category: string | null;
  is_relevant: boolean | null;
  strengths: string[] | null;
  gaps: string[] | null;
  matching_skills: string[] | null;
  missing_skills: string[] | null;
  ai_recommendations: string[] | null;
  ai_reason: string | null;
  jobs: RawJob | RawJob[] | null;
};

type UseAppMatchesResult = {
  matches: AppMatchItem[];
  isLoading: boolean;
  errorMessage: string | null;
  reloadMatches: () => Promise<void>;
};

function normalizeStringArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeJob(job: RawJob | RawJob[] | null): RawJob | null {
  if (Array.isArray(job)) {
    return job[0] ?? null;
  }

  return job;
}

function normalizeCompany(
  companyProfiles: RawCompanyProfile | RawCompanyProfile[] | null | undefined,
): RawCompanyProfile | null {
  if (Array.isArray(companyProfiles)) {
    return companyProfiles[0] ?? null;
  }

  return companyProfiles ?? null;
}

function normalizeScore(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  return 0;
}

function mapRawMatchToAppMatch(match: RawAIMatch): AppMatchItem {
  const job = normalizeJob(match.jobs);
  const company = normalizeCompany(job?.company_profiles);

  return {
    id: match.id,
    jobId: match.job_id,
    studentId: match.student_id,
    title: job?.title || "Vaga sem título",
    company: company?.company_name || "Empresa não identificada",
    description:
      job?.description ||
      "Match calculado pela IA com base no perfil profissional e nos requisitos da vaga.",
    score: normalizeScore(match.match_score),
    reason:
      match.ai_reason ||
      "A compatibilidade foi calculada pela ARYNQO com base nos dados reais do perfil e da vaga.",
    strengths: normalizeStringArray(match.strengths),
    gaps: normalizeStringArray(match.gaps),
    matchingSkills: normalizeStringArray(match.matching_skills),
    missingSkills: normalizeStringArray(match.missing_skills),
    recommendations: normalizeStringArray(match.ai_recommendations),
    matchCategory: match.match_category,
    isRelevant: match.is_relevant,
    scores: {
      skills: match.skills_score,
      role: match.role_score,
      seniority: match.seniority_score,
      location: match.location_score,
      workModel: match.work_model_score,
      salary: match.salary_score,
      educationLanguage: match.education_language_score,
      opportunityType: match.opportunity_type_score,
    },
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

export function useAppMatches(): UseAppMatchesResult {
  const [matches, setMatches] = useState<AppMatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadMatches() {
    setIsLoading(true);
    setErrorMessage(null);

    const studentId = await getCurrentStudentProfileId();

    if (!studentId) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("ai_matches")
      .select(
        `
        id,
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
        match_category,
        is_relevant,
        strengths,
        gaps,
        matching_skills,
        missing_skills,
        ai_recommendations,
        ai_reason,
        jobs (
          id,
          title,
          description,
          area,
          company_profiles (
            company_name
          )
        )
      `,
      )
      .eq("student_id", studentId)
      .order("match_score", { ascending: false })
      .limit(30);

    if (error) {
      console.error(error);
      setMatches([]);
      setErrorMessage("Não foi possível carregar os matches IA do Supabase.");
      setIsLoading(false);
      return;
    }

    setMatches(((data || []) as RawAIMatch[]).map(mapRawMatchToAppMatch));
    setIsLoading(false);
  }

  useEffect(() => {
    loadMatches();
  }, []);

  return {
    matches,
    isLoading,
    errorMessage,
    reloadMatches: loadMatches,
  };
}