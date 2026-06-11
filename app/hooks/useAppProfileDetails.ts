"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppProfile } from "./useAppProfile";

export type AppStudentProfileDetails = {
  id: string;
  headline: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  cv_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  phone: string | null;
  desired_area: string | null;
  availability: string | null;
  talent_type: string | null;
  contact_visibility: "open" | "approval_required" | "closed" | null;
  main_role: string | null;
  role_title: string | null;
  role_family: string | null;
  seniority: string | null;
  work_model: string | null;
  expected_salary: string | null;
  preferred_regions: string | null;
  preferred_opportunity_type: string | null;
  academic_education: string | null;
  professional_training: string | null;
  professional_experience: string | null;
  spoken_languages: string | null;
  written_languages: string | null;
  languages: string | null;
  soft_skills: string | null;
  tools: string | null;
  career_goals: string | null;
  ai_summary: string | null;
  ai_profile_score: number | null;
  ai_employability_score: number | null;
  skills_normalized: string[] | null;
  tools_normalized: string[] | null;
  soft_skills_normalized: string[] | null;
  regions: string[] | null;
  ai_match_keywords: string[] | null;
};

export type AppCompanyProfileDetails = {
  id: string;
  company_name: string;
  description: string | null;
  location: string | null;
  website_url: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  company_type: string | null;
  company_size: string | null;
};

type UseAppProfileDetailsResult = {
  studentProfile: AppStudentProfileDetails | null;
  companyProfile: AppCompanyProfileDetails | null;
  isLoadingDetails: boolean;
  errorMessage: string | null;
  reloadDetails: () => Promise<void>;
};

function getCompletedFields(values: Array<unknown>) {
  return values.filter((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return Boolean(value);
  }).length;
}

export function getStudentProfileCompletion(
  profile: AppStudentProfileDetails | null,
) {
  if (!profile) {
    return 0;
  }

  const fields = [
    profile.headline,
    profile.location,
    profile.bio,
    profile.avatar_url,
    profile.cv_url,
    profile.linkedin_url,
    profile.portfolio_url,
    profile.phone,
    profile.desired_area,
    profile.availability,
    profile.talent_type,
    profile.contact_visibility,
    profile.main_role,
    profile.role_title,
    profile.role_family,
    profile.seniority,
    profile.work_model,
    profile.expected_salary,
    profile.preferred_regions,
    profile.preferred_opportunity_type,
    profile.academic_education,
    profile.professional_training,
    profile.professional_experience,
    profile.spoken_languages,
    profile.written_languages,
    profile.languages,
    profile.soft_skills,
    profile.tools,
    profile.career_goals,
    profile.ai_summary,
    profile.skills_normalized,
    profile.tools_normalized,
    profile.soft_skills_normalized,
    profile.regions,
    profile.ai_match_keywords,
  ];

  return Math.round((getCompletedFields(fields) / fields.length) * 100);
}

export function getCompanyProfileCompletion(
  profile: AppCompanyProfileDetails | null,
) {
  if (!profile) {
    return 0;
  }

  const fields = [
    profile.company_name,
    profile.description,
    profile.location,
    profile.website_url,
    profile.logo_url,
    profile.contact_email,
    profile.contact_phone,
    profile.address,
    profile.postal_code,
    profile.city,
    profile.country,
    profile.industry,
    profile.company_type,
    profile.company_size,
  ];

  return Math.round((getCompletedFields(fields) / fields.length) * 100);
}

export function useAppProfileDetails(): UseAppProfileDetailsResult {
  const { hasSession, appMode } = useAppProfile();

  const [studentProfile, setStudentProfile] =
    useState<AppStudentProfileDetails | null>(null);

  const [companyProfile, setCompanyProfile] =
    useState<AppCompanyProfileDetails | null>(null);

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadDetails() {
    setIsLoadingDetails(true);
    setErrorMessage(null);
    setStudentProfile(null);
    setCompanyProfile(null);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session || !hasSession) {
      setIsLoadingDetails(false);
      return;
    }

    const userId = sessionData.session.user.id;

    if (appMode === "company") {
      const { data, error } = await supabase
        .from("company_profiles")
        .select(
          `
          id,
          company_name,
          description,
          location,
          website_url,
          logo_url,
          contact_email,
          contact_phone,
          address,
          postal_code,
          city,
          country,
          industry,
          company_type,
          company_size
        `,
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        setErrorMessage("Não foi possível carregar o perfil da empresa.");
        setIsLoadingDetails(false);
        return;
      }

      setCompanyProfile((data as AppCompanyProfileDetails) || null);
      setIsLoadingDetails(false);
      return;
    }

    const { data, error } = await supabase
      .from("student_profiles")
      .select(
        `
        id,
        headline,
        location,
        bio,
        avatar_url,
        cv_url,
        linkedin_url,
        portfolio_url,
        phone,
        desired_area,
        availability,
        talent_type,
        contact_visibility,
        main_role,
        role_title,
        role_family,
        seniority,
        work_model,
        expected_salary,
        preferred_regions,
        preferred_opportunity_type,
        academic_education,
        professional_training,
        professional_experience,
        spoken_languages,
        written_languages,
        languages,
        soft_skills,
        tools,
        career_goals,
        ai_summary,
        ai_profile_score,
        ai_employability_score,
        skills_normalized,
        tools_normalized,
        soft_skills_normalized,
        regions,
        ai_match_keywords
      `,
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      setErrorMessage("Não foi possível carregar o perfil profissional.");
      setIsLoadingDetails(false);
      return;
    }

    setStudentProfile((data as AppStudentProfileDetails) || null);
    setIsLoadingDetails(false);
  }

  useEffect(() => {
    loadDetails();
  }, [hasSession, appMode]);

  return {
    studentProfile,
    companyProfile,
    isLoadingDetails,
    errorMessage,
    reloadDetails: loadDetails,
  };
}