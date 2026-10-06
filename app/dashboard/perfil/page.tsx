"use client";
import { SENIORITIES, WORK_MODELS } from "@/lib/matching-preferences";
import { MatchingFields, useMatchingPreferences } from "@/app/components/MatchingFields";
import { localizedAlert, localizedConfirm } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText, LElement, LocaleSelect } from "@/lib/i18n/client";


import { CountrySelect, LanguagePicker, TagPicker } from "@/app/components/ProfileFields";
import { splitTags } from "@/lib/profile-options";
import LinkedInImport from "@/app/components/LinkedInImport";
import type { LinkedInDraft } from "@/lib/linkedin-import";
import { CandidateCVButton } from "@/app/components/CandidateCVButton";
import { cvStorageLocation } from "@/lib/cv-storage";
import { hasWritingContent } from "@/lib/profile-writing";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type StudentProfile = {
  id: string;
  headline: string | null;
  country: string | null;
  location: string | null;
  bio: string | null;
  cv_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  professional_experience: string | null;
professional_experience_items: ProfessionalExperienceItem[] | null;

academic_education: string | null;
academic_education_items: AcademicEducationItem[] | null;

professional_training: string | null;
professional_training_items: ProfessionalTrainingItem[] | null;
  spoken_languages: string | null;
  written_languages: string | null;
  languages: string | null;
  soft_skills: string | null;
  tools: string | null;
  career_goals: string | null;
  preferred_opportunity_type: string | null;
  availability: string | null;
  desired_area: string | null;
  phone: string | null;
  main_role: string | null;
  seniority: string | null;
  work_model: string | null;
  expected_salary: string | null;
  preferred_regions: string | null;
  ai_summary: string | null;
  ai_profile_score: number | null;
  ai_employability_score: number | null;
avatar_url: string | null;
contact_visibility: "open" | "approval_required" | "closed" | null;

role_title: string | null;
role_family: string | null;

skills_normalized: string[] | null;
tools_normalized: string[] | null;
soft_skills_normalized: string[] | null;

regions: string[] | null;

salary_min: number | null;
salary_max: number | null;

ai_match_keywords: string[] | null;
talent_type: string | null;
};

type ProfessionalExperienceItem = {
  id: string;
  role: string;
  company: string;
  start_date: string;
  end_date: string;
  description: string;
};

type AcademicEducationItem = {
  id: string;
  degree: string;
  institution: string;
  start_date: string;
  end_date: string;
  description: string;
};

type ProfessionalTrainingItem = {
  id: string;
  title: string;
  entity: string;
  start_date: string;
  end_date: string;
  description: string;
};

type Skill = {
  id: string;
  name: string;
};

type StudentSkillRow = {
  skills: Skill | Skill[] | null;
};

type AIProfileResponse = {
  headline?: string;
  bio?: string;
  main_role?: string;
  seniority?: string;
  work_model?: string;
  expected_salary?: string;
  preferred_regions?: string;
  academic_education?: string;
  professional_training?: string;
  professional_experience?: string;
  spoken_languages?: string;
  written_languages?: string;
  languages?: string;
  soft_skills?: string;
  tools?: string;
  career_goals?: string;
  preferred_opportunity_type?: string;
  ai_summary?: string;
  ai_profile_score?: number;
  ai_employability_score?: number;
  professional_experience_items?: ProfessionalExperienceItem[];
academic_education_items?: AcademicEducationItem[];
professional_training_items?: ProfessionalTrainingItem[];

role_title?: string;
role_family?: string;

skills_normalized?: string[];
tools_normalized?: string[];
soft_skills_normalized?: string[];

regions?: string[];

salary_min?: number | null;
salary_max?: number | null;

ai_match_keywords?: string[];

skills?: string[];

error?: string;
};

type ProfileTab = "resumo" | "percurso" | "competencias" | "preferencias" | "ia";



const availabilityOptions = [
  "Imediata",
  "Até 15 dias",
  "Até 30 dias",
  "Até 60 dias",
  "A combinar",
];







const locationOptions = [
  "Aveiro",
  "Beja",
  "Braga",
  "Bragança",
  "Castelo Branco",
  "Coimbra",
  "Évora",
  "Faro",
  "Guarda",
  "Leiria",
  "Lisboa",
  "Portalegre",
  "Porto",
  "Santarém",
  "Setúbal",
  "Viana do Castelo",
  "Vila Real",
  "Viseu",
  "Açores",
  "Madeira",
  "Remoto",
  "Internacional",
];

const tabs: { id: ProfileTab; label: string; description: string }[] = [
  {
    id: "resumo",
    label: "Resumo",
    description: "Identidade, contacto e posicionamento profissional.",
  },
  {
    id: "percurso",
    label: "Percurso",
    description: "Formação académica, certificações e experiência.",
  },
  {
    id: "competencias",
    label: "Competências",
    description: "Skills, idiomas, ferramentas e soft skills.",
  },
  {
    id: "preferencias",
    label: "Preferências",
    description: "Objetivos, disponibilidade e tipo de oportunidade.",
  },
  {
    id: "ia",
    label: "Perfil IA",
    description: "Matching, senioridade, scores e resumo profissional.",
  },
];

function createItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PerfilEstudantePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("resumo");
  const [profileId, setProfileId] = useState("");
  const matching = useMatchingPreferences("candidate", profileId || null);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [desiredArea, setDesiredArea] = useState("");
  const [availability, setAvailability] = useState("");
  const [bio, setBio] = useState("");
  const [academicEducation, setAcademicEducation] = useState("");
  const [professionalTraining, setProfessionalTraining] = useState("");
  const [professionalExperience, setProfessionalExperience] = useState("");
  const [spokenLanguages, setSpokenLanguages] = useState("");
  const [writtenLanguages, setWrittenLanguages] = useState("");
  const [languages, setLanguages] = useState("");
  const [softSkills, setSoftSkills] = useState("");
  const [tools, setTools] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [preferredOpportunityType, setPreferredOpportunityType] = useState("");
  const [talentType, setTalentType] = useState("student");
  const [contactVisibility, setContactVisibility] = useState<
  "open" | "approval_required" | "closed"
>("approval_required");
  const [cvUrl, setCvUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [mainRole, setMainRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [preferredRegions, setPreferredRegions] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [, setRoleTitle] = useState("");
const [, setRoleFamily] = useState("");
const [professionalExperienceItems, setProfessionalExperienceItems] =
  useState<ProfessionalExperienceItem[]>([]);

const [academicEducationItems, setAcademicEducationItems] = useState<
  AcademicEducationItem[]
>([]);

const [professionalTrainingItems, setProfessionalTrainingItems] = useState<
  ProfessionalTrainingItem[]
>([]);

const [skillsNormalized, setSkillsNormalized] = useState<string[]>([]);
const [toolsNormalized, setToolsNormalized] = useState<string[]>([]);
const [softSkillsNormalized, setSoftSkillsNormalized] = useState<string[]>([]);

const [regions, setRegions] = useState<string[]>([]);

const [salaryMin, setSalaryMin] = useState<number | null>(null);
const [salaryMax, setSalaryMax] = useState<number | null>(null);

const [aiMatchKeywords, setAiMatchKeywords] = useState<string[]>([]);
  const [aiProfileScore, setAiProfileScore] = useState(0);
  const [aiEmployabilityScore, setAiEmployabilityScore] = useState(0);
  const [pendingLinkedInSkills, setPendingLinkedInSkills] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isGeneratingAIProfile, setIsGeneratingAIProfile] = useState(false);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const textareaClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";


  function applyLinkedInDraft(data: LinkedInDraft) {
    if (data.headline) setHeadline(data.headline);
    if (data.bio) setBio(data.bio);
    if (data.professional_experience_items) {
      setProfessionalExperienceItems(data.professional_experience_items);
      setProfessionalExperience(professionalExperienceItemsToText(data.professional_experience_items));
    }
    if (data.academic_education_items) {
      setAcademicEducationItems(data.academic_education_items);
      setAcademicEducation(academicEducationItemsToText(data.academic_education_items));
    }
    if (data.professional_training_items) {
      setProfessionalTrainingItems(data.professional_training_items);
      setProfessionalTraining(professionalTrainingItemsToText(data.professional_training_items));
    }
    if (data.languages) setLanguages(data.languages);
    if (data.tools) setTools(data.tools);
    if (data.soft_skills) setSoftSkills(data.soft_skills);
    if (data.skills) setPendingLinkedInSkills(current => uniqueArray([...current, ...data.skills!]).filter(value => !skills.some(skill => skill.name.toLowerCase() === value.toLowerCase())));
  }

  function getNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  function applyAIData(data: AIProfileResponse) {
  setHeadline(data.headline || "");
  setBio(data.bio || "");
  setMainRole(data.main_role || "");
  setSeniority(data.seniority || "");
  setWorkModel(data.work_model || "");
  setExpectedSalary(data.expected_salary || "");
  setPreferredRegions(data.preferred_regions || "");
  setAcademicEducation(data.academic_education || "");
  setProfessionalTraining(data.professional_training || "");
  setProfessionalExperience(data.professional_experience || "");
  setAcademicEducationItems(
  normalizeAcademicEducationItems(data.academic_education_items)
);

setProfessionalTrainingItems(
  normalizeProfessionalTrainingItems(data.professional_training_items)
);

setProfessionalExperienceItems(
  normalizeProfessionalExperienceItems(data.professional_experience_items)
);
  setSpokenLanguages(data.spoken_languages || "");
  setWrittenLanguages(data.written_languages || "");
  setLanguages(data.languages || "");
  setSoftSkills(data.soft_skills || "");
  setTools(data.tools || "");
  setCareerGoals(data.career_goals || "");
  setPreferredOpportunityType(data.preferred_opportunity_type || "");
  setAiSummary(data.ai_summary || "");
  setAiProfileScore(getNumber(data.ai_profile_score));
  setAiEmployabilityScore(getNumber(data.ai_employability_score));

  setRoleTitle(data.role_title || "");
  setRoleFamily(data.role_family || "");

  setSkillsNormalized(
    Array.isArray(data.skills_normalized)
      ? data.skills_normalized
      : []
  );

  setToolsNormalized(
    Array.isArray(data.tools_normalized)
      ? data.tools_normalized
      : []
  );

  setSoftSkillsNormalized(
    Array.isArray(data.soft_skills_normalized)
      ? data.soft_skills_normalized
      : []
  );

  setRegions(
    Array.isArray(data.regions)
      ? data.regions
      : []
  );

  setSalaryMin(
    typeof data.salary_min === "number"
      ? data.salary_min
      : null
  );

  setSalaryMax(
    typeof data.salary_max === "number"
      ? data.salary_max
      : null
  );

  setAiMatchKeywords(
    Array.isArray(data.ai_match_keywords)
      ? data.ai_match_keywords
      : []
  );
}

  function getAIProfileUpdatePayload(data: AIProfileResponse) {
  return {
    headline: data.headline || "",
    bio: data.bio || "",
    main_role: data.main_role || "",
    seniority: data.seniority || "",
    work_model: data.work_model || "",
    expected_salary: data.expected_salary || "",
    preferred_regions: data.preferred_regions || "",
    academic_education: data.academic_education || "",
    professional_training: data.professional_training || "",
    professional_experience: data.professional_experience || "",
    academic_education_items: normalizeAcademicEducationItems(
  data.academic_education_items
),

professional_training_items: normalizeProfessionalTrainingItems(
  data.professional_training_items
),

professional_experience_items: normalizeProfessionalExperienceItems(
  data.professional_experience_items
),

    spoken_languages: data.spoken_languages || "",
    written_languages: data.written_languages || "",
    languages: data.languages || "",
    soft_skills: data.soft_skills || "",
    tools: data.tools || "",
    career_goals: data.career_goals || "",
    preferred_opportunity_type:
      data.preferred_opportunity_type || "",
    ai_summary: data.ai_summary || "",
    ai_profile_score: getNumber(data.ai_profile_score),
    ai_employability_score: getNumber(
      data.ai_employability_score
    ),

    role_title: data.role_title || "",
    role_family: data.role_family || "",

    skills_normalized: Array.isArray(
      data.skills_normalized
    )
      ? data.skills_normalized
      : [],

    tools_normalized: Array.isArray(
      data.tools_normalized
    )
      ? data.tools_normalized
      : [],

    soft_skills_normalized: Array.isArray(
      data.soft_skills_normalized
    )
      ? data.soft_skills_normalized
      : [],

    regions: Array.isArray(data.regions)
      ? data.regions
      : [],

    salary_min:
      typeof data.salary_min === "number"
        ? data.salary_min
        : null,

    salary_max:
      typeof data.salary_max === "number"
        ? data.salary_max
        : null,

    ai_match_keywords: Array.isArray(
      data.ai_match_keywords
    )
      ? data.ai_match_keywords
      : [],
  };
}

function splitTextToArray(value: string) {
  return value
    .split(/[,;\n|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSalaryRange(value: string) {
  const numbers = value.match(/\d+(?:[.,]\d+)?/g);

  if (!numbers || numbers.length === 0) {
    return {
      min: null,
      max: null,
    };
  }

  const parsedNumbers = numbers
    .map((number) => Number(number.replace(",", ".")))
    .filter((number) => !Number.isNaN(number));

  if (parsedNumbers.length === 0) {
    return {
      min: null,
      max: null,
    };
  }

  if (parsedNumbers.length === 1) {
    return {
      min: parsedNumbers[0],
      max: parsedNumbers[0],
    };
  }

  return {
    min: Math.min(...parsedNumbers),
    max: Math.max(...parsedNumbers),
  };
}

function uniqueArray(values: string[]) {
  return Array.from(
    new Map(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => [value.toLowerCase(), value])
    ).values()
  );
}


function normalizeProfessionalExperienceItems(
  items: ProfessionalExperienceItem[] | null | undefined
) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || createItemId(),
        role: item.role || "",
        company: item.company || "",
        start_date: item.start_date || "",
        end_date: item.end_date || "",
        description: item.description || "",
      }))
    : [];
}

function normalizeAcademicEducationItems(
  items: AcademicEducationItem[] | null | undefined
) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || createItemId(),
        degree: item.degree || "",
        institution: item.institution || "",
        start_date: item.start_date || "",
        end_date: item.end_date || "",
        description: item.description || "",
      }))
    : [];
}

function normalizeProfessionalTrainingItems(
  items: ProfessionalTrainingItem[] | null | undefined
) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: item.id || createItemId(),
        title: item.title || "",
        entity: item.entity || "",
        start_date: item.start_date || "",
        end_date: item.end_date || "",
        description: item.description || "",
      }))
    : [];
}

function professionalExperienceItemsToText(items: ProfessionalExperienceItem[]) {
  return items
    .map((item) => {
      const period =
        item.start_date || item.end_date
          ? `(${item.start_date || "?"}–${item.end_date || "?"})`
          : "";

      return [
        item.role,
        item.company ? `na ${item.company}` : "",
        period,
        item.description ? `, ${item.description}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    })
    .filter(Boolean)
    .join("; ");
}

function academicEducationItemsToText(items: AcademicEducationItem[]) {
  return items
    .map((item) => {
      const period =
        item.start_date || item.end_date
          ? `(${item.start_date || "?"}–${item.end_date || "?"})`
          : "";

      return [
        item.degree,
        item.institution ? `pela ${item.institution}` : "",
        period,
        item.description ? `, ${item.description}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    })
    .filter(Boolean)
    .join("; ");
}

function professionalTrainingItemsToText(items: ProfessionalTrainingItem[]) {
  return items
    .map((item) => {
      const period =
        item.start_date || item.end_date
          ? `(${item.start_date || "?"}–${item.end_date || "?"})`
          : "";

      return [
        item.title,
        item.entity ? `pela ${item.entity}` : "",
        period,
        item.description ? `, ${item.description}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    })
    .filter(Boolean)
    .join("; ");
}

function addProfessionalExperienceItem() {
  setProfessionalExperienceItems((current) => [
    ...current,
    {
      id: createItemId(),
      role: "",
      company: "",
      start_date: "",
      end_date: "",
      description: "",
    },
  ]);
}

function updateProfessionalExperienceItem(
  id: string,
  field: keyof ProfessionalExperienceItem,
  value: string
) {
  setProfessionalExperienceItems((current) =>
    current.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: value,
          }
        : item
    )
  );
}

function removeProfessionalExperienceItem(id: string) {
  setProfessionalExperienceItems((current) =>
    current.filter((item) => item.id !== id)
  );
}

function addAcademicEducationItem() {
  setAcademicEducationItems((current) => [
    ...current,
    {
      id: createItemId(),
      degree: "",
      institution: "",
      start_date: "",
      end_date: "",
      description: "",
    },
  ]);
}

function updateAcademicEducationItem(
  id: string,
  field: keyof AcademicEducationItem,
  value: string
) {
  setAcademicEducationItems((current) =>
    current.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: value,
          }
        : item
    )
  );
}

function removeAcademicEducationItem(id: string) {
  setAcademicEducationItems((current) =>
    current.filter((item) => item.id !== id)
  );
}

function addProfessionalTrainingItem() {
  setProfessionalTrainingItems((current) => [
    ...current,
    {
      id: createItemId(),
      title: "",
      entity: "",
      start_date: "",
      end_date: "",
      description: "",
    },
  ]);
}

function updateProfessionalTrainingItem(
  id: string,
  field: keyof ProfessionalTrainingItem,
  value: string
) {
  setProfessionalTrainingItems((current) =>
    current.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: value,
          }
        : item
    )
  );
}

function removeProfessionalTrainingItem(id: string) {
  setProfessionalTrainingItems((current) =>
    current.filter((item) => item.id !== id)
  );
}

function getSelectedPreferredRegions() {
  return splitTextToArray(preferredRegions);
}

function togglePreferredRegion(region: string) {
  const currentRegions = getSelectedPreferredRegions();

  const nextRegions = currentRegions.includes(region)
    ? currentRegions.filter((currentRegion) => currentRegion !== region)
    : [...currentRegions, region];

  setPreferredRegions(uniqueArray(nextRegions).join(", "));
}

function removePreferredRegion(region: string) {
  const nextRegions = getSelectedPreferredRegions().filter(
    (currentRegion) => currentRegion !== region
  );

  setPreferredRegions(nextRegions.join(", "));
}

function buildManualMatchingData() {
  const salary = parseSalaryRange(expectedSalary);

  const manualSkills = uniqueArray([
    ...skills.map((skill) => skill.name),
    ...pendingLinkedInSkills,
    ...splitTextToArray(tools),
    ...splitTextToArray(softSkills),
  ]);

  const manualTools = uniqueArray(splitTextToArray(tools));
  const manualSoftSkills = uniqueArray(splitTextToArray(softSkills));
  const manualRegions = uniqueArray([
    location,
    ...splitTextToArray(preferredRegions),
  ]);

  const manualKeywords = uniqueArray([
    headline,
    mainRole,
    desiredArea,
    seniority,
    workModel,
    preferredOpportunityType,
    talentType,
    ...manualSkills,
    ...manualTools,
    ...manualSoftSkills,
    ...manualRegions,
    ...splitTextToArray(languages),
    ...splitTextToArray(spokenLanguages),
    ...splitTextToArray(writtenLanguages),
    ...splitTextToArray(careerGoals),
  ]);

  return {
    role_title: mainRole.trim() || headline.trim(),
    role_family: desiredArea,
    skills_normalized: manualSkills,
    tools_normalized: manualTools,
    soft_skills_normalized: manualSoftSkills,
    regions: manualRegions,
    salary_min: salary.min,
    salary_max: salary.max,
    ai_match_keywords: manualKeywords,
  };
}

  function getCurrentProfilePayload() {
  const manualMatchingData = buildManualMatchingData();

  return {
    name,
    headline,
    phone,
    location,
    desired_area: desiredArea,
    availability,
    bio,
    academic_education:
  academicEducationItems.length > 0
    ? academicEducationItemsToText(academicEducationItems)
    : academicEducation,

professional_training:
  professionalTrainingItems.length > 0
    ? professionalTrainingItemsToText(professionalTrainingItems)
    : professionalTraining,

professional_experience:
  professionalExperienceItems.length > 0
    ? professionalExperienceItemsToText(professionalExperienceItems)
    : professionalExperience,

academic_education_items: academicEducationItems,
professional_training_items: professionalTrainingItems,
professional_experience_items: professionalExperienceItems,

    spoken_languages: spokenLanguages,
    written_languages: writtenLanguages,
    languages,
    soft_skills: softSkills,
    tools,
    career_goals: careerGoals,
    preferred_opportunity_type: preferredOpportunityType,
    talent_type: talentType,
    linkedin_url: linkedinUrl,
    portfolio_url: portfolioUrl,
    main_role: mainRole,
    seniority,
    work_model: workModel,
    expected_salary: expectedSalary,
    preferred_regions: preferredRegions,
    ai_summary: aiSummary,
    ai_profile_score: aiProfileScore,
    ai_employability_score: aiEmployabilityScore,
    skills: skills.map((skill) => skill.name),
    ...manualMatchingData,
  };
}

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.assign(browserLocalizedPath("/login"));
      return;
    }

    const userId = sessionData.session.user.id;

    const { data: publicProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    if (publicProfile) {
      setName(publicProfile.name || "");
    }

    const { data: studentProfile, error } = await supabase
      .from("student_profiles")
      .select(
  `
  id,
  headline,
  country,
  location,
  bio,
  cv_url,
  avatar_url,
  linkedin_url,
  portfolio_url,
  academic_education,
academic_education_items,
professional_training,
professional_training_items,
professional_experience,
professional_experience_items,
  spoken_languages,
  written_languages,
  languages,
  soft_skills,
  tools,
  career_goals,
  preferred_opportunity_type,
  talent_type,
  contact_visibility,
  availability,
  desired_area,
  phone,
  main_role,
  seniority,
  work_model,
  expected_salary,
  preferred_regions,
  ai_summary,
  ai_profile_score,
  ai_employability_score,
  role_title,
  role_family,
  skills_normalized,
  tools_normalized,
  soft_skills_normalized,
  regions,
  salary_min,
  salary_max,
  ai_match_keywords
`
)
      .eq("user_id", userId)
      .single();

    if (error || !studentProfile) {
      localizedAlert("Apenas estudantes podem editar este perfil.");
      window.location.assign(browserLocalizedPath("/dashboard"));
      return;
    }

    const profile = studentProfile as StudentProfile;

    setProfileId(profile.id);
    setHeadline(profile.headline || "");
    setPhone(profile.phone || "");
    setCountry(profile.country || "");
    setLocation(profile.location || "");
    setDesiredArea(profile.desired_area || "");
    setAvailability(profile.availability || "");
    setBio(profile.bio || "");
    setAcademicEducation(profile.academic_education || "");
    setProfessionalTraining(profile.professional_training || "");
    setProfessionalExperience(profile.professional_experience || "");
    setSpokenLanguages(profile.spoken_languages || "");
    setWrittenLanguages(profile.written_languages || "");
    setLanguages(profile.languages || "");
    setSoftSkills(profile.soft_skills || "");
    setTools(profile.tools || "");
    setCareerGoals(profile.career_goals || "");
    setPreferredOpportunityType(profile.preferred_opportunity_type || "");
    setTalentType(profile.talent_type || "student");
    setContactVisibility(profile.contact_visibility || "approval_required");
    setCvUrl(profile.cv_url || "");
    setAvatarUrl(profile.avatar_url || "");
    setLinkedinUrl(profile.linkedin_url || "");
    setPortfolioUrl(profile.portfolio_url || "");
    setMainRole(profile.main_role || "");
    setSeniority(profile.seniority || "");
    setWorkModel(profile.work_model || "");
    setExpectedSalary(profile.expected_salary || "");
    setPreferredRegions(profile.preferred_regions || "");
    setAiSummary(profile.ai_summary || "");
    setAiProfileScore(profile.ai_profile_score || 0);
    setAiEmployabilityScore(profile.ai_employability_score || 0);
    setRoleTitle(profile.role_title || "");
setRoleFamily(profile.role_family || "");
setSkillsNormalized(profile.skills_normalized || []);
setToolsNormalized(profile.tools_normalized || []);
setSoftSkillsNormalized(profile.soft_skills_normalized || []);
setRegions(profile.regions || []);
setSalaryMin(profile.salary_min || null);
setSalaryMax(profile.salary_max || null);
setAiMatchKeywords(profile.ai_match_keywords || []);
setAcademicEducationItems(
  normalizeAcademicEducationItems(profile.academic_education_items)
);

setProfessionalTrainingItems(
  normalizeProfessionalTrainingItems(profile.professional_training_items)
);

setProfessionalExperienceItems(
  normalizeProfessionalExperienceItems(profile.professional_experience_items)
);

    await loadStudentSkills(profile.id);
    setIsLoading(false);
  }

  async function loadStudentSkills(studentId: string) {
    const { data, error } = await supabase
      .from("student_skills")
      .select(
        `
        skills (
          id,
          name
        )
      `
      )
      .eq("student_id", studentId);

    if (error) {
      console.error(error);
      return;
    }

    const normalizedSkills = ((data || []) as StudentSkillRow[])
      .map((row) =>
        Array.isArray(row.skills) ? row.skills[0] ?? null : row.skills
      )
      .filter((skill): skill is Skill => Boolean(skill));

    setSkills(normalizedSkills);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadProfile(); });
    return () => { active = false; };
  }, []);
  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (savingProfile || isUploadingCV || isGeneratingAIProfile) return;
  setSavingProfile(true);
  try {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    window.location.assign(browserLocalizedPath("/login"));
    return;
  }

  const userId = sessionData.session.user.id;
  for (const skill of pendingLinkedInSkills) await upsertSkill(skill);
  if (pendingLinkedInSkills.length) await loadStudentSkills(profileId);
  const manualMatchingData = buildManualMatchingData();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", userId);

  if (profileError) {
    localizedAlert(profileError.message);
    return;
  }

  const { error: studentError } = await supabase
    .from("student_profiles")
    .update({
      headline,
      phone,
      country,
      location,
      desired_area: desiredArea,
      availability,
      bio,
      academic_education:
  academicEducationItems.length > 0
    ? academicEducationItemsToText(academicEducationItems)
    : academicEducation,

professional_training:
  professionalTrainingItems.length > 0
    ? professionalTrainingItemsToText(professionalTrainingItems)
    : professionalTraining,

professional_experience:
  professionalExperienceItems.length > 0
    ? professionalExperienceItemsToText(professionalExperienceItems)
    : professionalExperience,

academic_education_items: academicEducationItems,
professional_training_items: professionalTrainingItems,
professional_experience_items: professionalExperienceItems,

      spoken_languages: spokenLanguages,
      written_languages: writtenLanguages,
      languages,
      soft_skills: softSkills,
      tools,
      career_goals: careerGoals,
      preferred_opportunity_type: preferredOpportunityType,
      talent_type: talentType,
      contact_visibility: contactVisibility,
      cv_url: cvUrl,
      avatar_url: avatarUrl,
      linkedin_url: linkedinUrl,
      portfolio_url: portfolioUrl,
      main_role: mainRole,
      seniority,
      work_model: workModel,
      expected_salary: expectedSalary,
      preferred_regions: preferredRegions,
      ai_summary: aiSummary,
      ai_profile_score: aiProfileScore,
      ai_employability_score: aiEmployabilityScore,
      ...manualMatchingData,
      ...(matching.ready ? {matching_preferences: matching.value} : {}),
    })
    .eq("id", profileId)
    .eq("user_id", userId);

  if (studentError) {
    localizedAlert(studentError.message);
    return;
  }

  setRoleTitle(manualMatchingData.role_title || "");
  setRoleFamily(manualMatchingData.role_family || "");
  setSkillsNormalized(manualMatchingData.skills_normalized);
  setToolsNormalized(manualMatchingData.tools_normalized);
  setSoftSkillsNormalized(manualMatchingData.soft_skills_normalized);
  setRegions(manualMatchingData.regions);
  setSalaryMin(manualMatchingData.salary_min);
  setSalaryMax(manualMatchingData.salary_max);
  setAiMatchKeywords(manualMatchingData.ai_match_keywords);

  await regenerateMatches(profileId);

  setPendingLinkedInSkills([]);
  localizedAlert("Perfil atualizado e matches recalculados com sucesso.");
  } catch { localizedAlert("Não foi possível guardar o perfil. Tenta novamente."); }
  finally { setSavingProfile(false); }
}

  async function handleRemoveSkill(skillId: string) {
    const { error } = await supabase
      .from("student_skills")
      .delete()
      .eq("student_id", profileId)
      .eq("skill_id", skillId);

    if (error) {
      throw new Error(error.message);
    }

    setSkills((currentSkills) =>
      currentSkills.filter((skill) => skill.id !== skillId)
    );
  }

  async function upsertSkill(skillName: string) {
    const normalized = skillName.trim();

    if (!normalized) {
      return;
    }

    const alreadyExists = skills.some(
      (skill) => skill.name.toLowerCase() === normalized.toLowerCase()
    );

    if (alreadyExists) {
      return;
    }

    let skillId = "";

    const { data: existingSkill } = await supabase
      .from("skills")
      .select("id")
      .ilike("name", normalized)
      .maybeSingle();

    if (existingSkill?.id) {
      skillId = existingSkill.id;
    } else {
      const { data: createdSkill, error: createSkillError } = await supabase
        .from("skills")
        .insert({ name: normalized })
        .select("id")
        .single();

      if (createSkillError || !createdSkill?.id) {
        throw new Error(createSkillError?.message || "Não foi possível adicionar a competência.");
      }

      skillId = createdSkill.id;
    }

    const { error: linkSkillError } = await supabase
      .from("student_skills")
      .insert({
        student_id: profileId,
        skill_id: skillId,
      });

    if (linkSkillError) {
      throw new Error(linkSkillError.message);
    }
  }

  async function removeCV() {
    if (!cvUrl || !profileId || isUploadingCV) return;
    setIsUploadingCV(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Inicia sessão para continuar.");
      const old = cvStorageLocation(cvUrl, data.user.id, process.env.NEXT_PUBLIC_SUPABASE_URL!);
      const { error } = await supabase.storage.from(old.bucket).remove([old.path]);
      if (error) throw new Error("Não foi possível eliminar o currículo.");
      const { error: updateError } = await supabase.from("student_profiles").update({ cv_url: null })
        .eq("id", profileId).eq("user_id", data.user.id).select("id").single();
      if (updateError) throw new Error("O ficheiro foi eliminado, mas não foi possível atualizar o perfil. Tenta novamente.");
      setCvUrl("");
    } catch (error) { localizedAlert(error instanceof Error ? error.message : "Não foi possível eliminar o currículo."); }
    finally { setIsUploadingCV(false); }
  }

  async function handleCVUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || isUploadingCV || isGeneratingAIProfile || savingProfile) {
      return;
    }

    if (file.size === 0 || file.size > 10485760 || !/\.(pdf|docx)$/i.test(file.name)
      || !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      localizedAlert("Seleciona um PDF ou DOCX com até 10 MB."); return;
    }
    setIsUploadingCV(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        window.location.assign(browserLocalizedPath("/login"));
        return;
      }

      const fileExtension = file.name.split(".").pop() || "pdf";
      const safeFileName = file.name
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-");

      const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("student-cvs")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        localizedAlert(uploadError.message);
        setIsUploadingCV(false);
        return;
      }

      const previousCV = cvUrl;
      const { error: saveCVError } = await supabase.from("student_profiles")
        .update({ cv_url: filePath }).eq("id", profileId).eq("user_id", user.id).select("id").single();
      if (saveCVError) {
        await supabase.storage.from("student-cvs").remove([filePath]);
        throw new Error("Não foi possível guardar o currículo.");
      }
      setCvUrl(filePath);
      if (previousCV) {
        try {
          const old = cvStorageLocation(previousCV, user.id, process.env.NEXT_PUBLIC_SUPABASE_URL!);
          const { error: removeError } = await supabase.storage.from(old.bucket).remove([old.path]);
          if (removeError) localizedAlert("O novo currículo foi guardado, mas não foi possível eliminar o ficheiro anterior.");
        } catch { /* Legacy external references are never fetched or deleted. */ }
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await authenticatedFetch("/api/ai/parse-cv", {
        method: "POST",
        body: formData,
      });

      const aiData = (await response.json()) as AIProfileResponse;

      if (!response.ok) {
        localizedAlert("O currículo foi guardado. " + (aiData.error || "Não foi possível preencher o perfil automaticamente."));
        setIsUploadingCV(false);
        return;
      }

      applyAIData(aiData);

      const { error: updateProfileError } = await supabase
        .from("student_profiles")
        .update({
          cv_url: filePath,
          ...getAIProfileUpdatePayload(aiData),
        })
        .eq("id", profileId)
        .eq("user_id", user.id);

      if (updateProfileError) {
        localizedAlert(updateProfileError.message);
        setIsUploadingCV(false);
        return;
      }

      if (Array.isArray(aiData.skills)) {
        for (const skillName of aiData.skills) {
          await upsertSkill(skillName);
        }

        await loadStudentSkills(profileId);
      }

      await regenerateMatches(profileId);
      localizedAlert("CV importado. Revê os dados preenchidos e completa a informação em falta.");
    } catch (error) {
      console.error(error);
      localizedAlert("Erro ao processar CV.");
    }

    setIsUploadingCV(false);
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    window.location.assign(browserLocalizedPath("/login"));
    return;
  }

  const fileExtension = file.name.split(".").pop() || "jpg";

  const filePath = `${user.id}/${Date.now()}-avatar.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("student-avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    localizedAlert(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("student-avatars")
    .getPublicUrl(filePath);

  const publicUrl = data.publicUrl;

  setAvatarUrl(publicUrl);

  const { error: updateError } = await supabase
    .from("student_profiles")
    .update({
      avatar_url: publicUrl,
    })
    .eq("id", profileId);

  if (updateError) {
    localizedAlert(updateError.message);
    return;
  }

  localizedAlert("Foto atualizada com sucesso.");
}

async function regenerateMatches(studentId: string) {
  try {
    await authenticatedFetch("/api/ai/generate-matches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        studentId,
      }),
    });
  } catch (error) {
    console.error("Erro ao gerar matches:", error);
  }
}
  const canImproveWriting = hasWritingContent({ headline, bio, career_goals: careerGoals, ai_summary: aiSummary });

  async function handleGenerateAIProfile() {
    if (!canImproveWriting || isUploadingCV || isGeneratingAIProfile || savingProfile) return;
    if (!localizedConfirm("Apenas será melhorada a escrita; não será alterada a informação. A IA não deve acrescentar factos nem preencher campos vazios. Poderás rever a proposta antes de a aplicar.")) return;
    setIsGeneratingAIProfile(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        window.location.assign(browserLocalizedPath("/login"));
        return;
      }

      const response = await authenticatedFetch("/api/ai/student-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getCurrentProfilePayload()),
      });

      const aiData = (await response.json()) as AIProfileResponse;

      if (!response.ok) {
        localizedAlert(aiData.error || "Não foi possível melhorar perfil com IA.");
        setIsGeneratingAIProfile(false);
        return;
      }

      const draft = [
        ["Título profissional", aiData.headline], ["Apresentação", aiData.bio],
        ["Objetivos de carreira", aiData.career_goals], ["Resumo profissional", aiData.ai_summary],
      ].map(([label, text]) => `${label}:\n${text || "(sem alterações)"}`).join("\n\n");
      if (localizedConfirm(`Revê a proposta de escrita antes de aplicar. Confirma que todos os factos estão corretos.\n\n${draft}\n\nAplicar ao formulário?`)) {
        setHeadline(aiData.headline || headline);
        setBio(aiData.bio || bio);
        setCareerGoals(aiData.career_goals || careerGoals);
        setAiSummary(aiData.ai_summary || aiSummary);
        localizedAlert("Proposta aplicada ao formulário. Revê os textos e guarda o perfil para confirmar.");
      }
    } catch (error) {
      console.error(error);
      localizedAlert("Erro ao melhorar perfil com IA.");
    }

    setIsGeneratingAIProfile(false);
  }

  function splitProfileItems(value: string) {
  return value
    .split(/;|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getExperienceItems() {
  return splitProfileItems(professionalExperience);
}

function getAcademicItems() {
  return splitProfileItems(academicEducation);
}

function getTrainingItems() {
  return splitProfileItems(professionalTraining);
}

  const completedFields = useMemo(() => {
    return [
      name,
      headline,
      phone,
      location,
      desiredArea,
      availability,
      bio,
      academicEducation,
      professionalTraining,
      professionalExperience,
      spokenLanguages,
      writtenLanguages,
      languages,
      softSkills,
      tools,
      careerGoals,
      preferredOpportunityType,
      cvUrl,
      linkedinUrl,
      portfolioUrl,
      mainRole,
      seniority,
      workModel,
      expectedSalary,
      preferredRegions,
      aiSummary,
    ].filter(Boolean).length;
  }, [
    name,
    headline,
    phone,
    location,
    desiredArea,
    availability,
    bio,
    academicEducation,
    professionalTraining,
    professionalExperience,
    spokenLanguages,
    writtenLanguages,
    languages,
    softSkills,
    tools,
    careerGoals,
    preferredOpportunityType,
    cvUrl,
    linkedinUrl,
    portfolioUrl,
    mainRole,
    seniority,
    workModel,
    expectedSalary,
    preferredRegions,
    aiSummary,
  ]);

  const profileCompletion = Math.round((completedFields / 26) * 100);

  const currentTab = tabs.find((tab) => tab.id === activeTab);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="rounded-[32px] border border-white/70 bg-white/80 px-8 py-6 shadow-[0_24px_80px_rgba(7,17,31,0.08)] backdrop-blur">
          <p className="text-sm font-medium text-[#07111F]">
            <LText text={"A carregar perfil..."} /></p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <LocaleSelect className="mx-auto mb-6 max-w-7xl" />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 overflow-hidden rounded-[32px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-10 md:py-12">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-32 h-40 w-40 rounded-full bg-[#4BB3FD]/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  <LText text={"Perfil ARYNQO"} /></p>

                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  <LText text={"O teu perfil profissional."} /></h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  <LText text={"Organiza o teu percurso por etapas, sem confusão visual, e transforma o teu CV em dados úteis para matching."} /></p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white/70">
                      <LText text={"Perfil completo"} /></p>
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-white">
                      {profileCompletion}%
                    </p>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#1683FF] transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs text-white/50"><LText text={"Score"} /></p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {aiProfileScore}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs text-white/50"><LText text={"Empregabilidade"} /></p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {aiEmployabilityScore}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">{matching.ready ? <MatchingFields opportunity={preferredOpportunityType} onOpportunityChange={setPreferredOpportunityType} kind="candidate" value={matching.value} onChange={v => { matching.setValue(v); setDesiredArea(v.area); setSeniority(SENIORITIES[v.levels[0] as keyof typeof SENIORITIES] || ""); setWorkModel(WORK_MODELS[v.models[0] as keyof typeof WORK_MODELS] || ""); }} disabled={savingProfile || isUploadingCV || isGeneratingAIProfile} /> : <p role="status"><LText text={matching.error || "A carregar..."} /></p>}</div>
        <form onSubmit={handleSave} className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-6">
            <div className="relative flex flex-col items-center text-center">
  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07111F] to-[#1683FF] text-4xl font-semibold text-white shadow-[0_20px_60px_rgba(22,131,255,0.25)]">
    {avatarUrl ? (
      <LElement as="img"
        src={avatarUrl}
        alt={name || "Foto de perfil"}
        className="h-full w-full object-cover"
      />
    ) : (
      name ? name.charAt(0).toUpperCase() : "A"
    )}
  </div>

  <label className="mt-4 cursor-pointer rounded-full border border-[#DDE3EA] bg-white px-4 py-2 text-xs font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]">
    <LText text={"Alterar foto"} /><input
      type="file"
      accept="image/*"
      onChange={handleAvatarUpload}
      className="hidden"
    />
  </label>

  <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-[#07111F]">
    {name || <LText text="O teu nome" />}
  </h2>

  <p className="mt-2 text-sm leading-6 text-slate-500">
    {headline || <LText text="Título profissional" />}
  </p>
</div>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-4 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                        isActive
                          ? "bg-[#07111F] text-white shadow-lg"
                          : "bg-white text-slate-600 hover:bg-[#F7F9FC] hover:text-[#07111F]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">
                        <LText text={tab.label} />
                      </span>
                      <span
                        className={`mt-1 block text-xs leading-5 ${
                          isActive ? "text-white/60" : "text-slate-400"
                        }`}
                      >
                        <LText text={tab.description} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                <LText text={"Preencher o perfil com o CV"} /></h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                <LText text={"Carrega o teu CV em PDF ou DOCX (até 10 MB). A plataforma guarda o ficheiro e preenche automaticamente os campos com a informação que conseguir identificar. Os dados importados podem substituir informação existente. Revê o resultado e completa o que faltar; o CV pode não conter todos os dados do perfil."} /></p>

              <label className="mt-5 flex cursor-pointer items-center justify-center rounded-2xl bg-[#1683FF] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#07111F]">
                <LText text={isUploadingCV ? "A importar CV..." : "Carregar CV e preencher o perfil"} />

                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                  disabled={isUploadingCV || isGeneratingAIProfile || savingProfile}
                />
              </label>

              <LinkedInImport disabled={isUploadingCV || isGeneratingAIProfile || savingProfile} onApply={applyLinkedInDraft} occupied={{
                headline: !!headline, bio: !!bio, professional_experience_items: !!professionalExperience || !!professionalExperienceItems.length,
                academic_education_items: !!academicEducation || !!academicEducationItems.length,
                professional_training_items: !!professionalTraining || !!professionalTrainingItems.length,
                skills: !!skills.length || !!pendingLinkedInSkills.length, languages: !!languages, tools: !!tools, soft_skills: !!softSkills,
              }} />

              <button
                type="button"
                onClick={handleGenerateAIProfile}
                disabled={!canImproveWriting || isUploadingCV || isGeneratingAIProfile || savingProfile}
                className="mt-3 w-full rounded-2xl bg-[#07111F] px-5 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LText text={isGeneratingAIProfile
                  ? "A melhorar perfil..."
                  : "Melhorar a escrita com IA"} />
              </button>
              {!canImproveWriting && <p className="mt-3 text-xs leading-5 text-slate-600"><LText text="Preenche primeiro os textos do perfil que pretendes rever." /></p>}
              <p className="mt-3 text-xs leading-5 text-slate-500"><LText text={"Depois de preencheres o perfil, podes rever a escrita do título profissional, da apresentação, dos objetivos de carreira e do resumo profissional. Só os textos preenchidos serão revistos. Confirma a proposta antes de a aplicar e guarda o perfil."} /></p>
            </section>

            <button
              type="submit"
              disabled={savingProfile || isUploadingCV || isGeneratingAIProfile}
              className="w-full rounded-full bg-[#1683FF] px-8 py-4 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(22,131,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#07111F]"
            >
              <LText text={"Guardar perfil"} /></button>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={currentTab?.label} />
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                <LText text={currentTab?.description} />
              </h2>
            </section>

            {activeTab === "resumo" && (
              <div className="grid gap-6">
                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Identidade"} /></h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <LText text={"Dados base para contacto e identificação do candidato."} /></p>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold"><LText text={"Nome"} /></label>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"Telefone"} /></label>
                      <LElement as="input"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Ex: 912 345 678"
                        className={inputClass}
                      />
                    </div>
                    <div>
  <label className="text-sm font-semibold">
    <LText text={"Perfil de talento"} /></label>

  <select
    value={talentType}
    onChange={(event) => setTalentType(event.target.value)}
    className={inputClass}
  >
    <option value="student"><LText text={"Estudante"} /></option>
    <option value="graduate"><LText text={"Recém-licenciado"} /></option>
    <option value="professional"><LText text={"Profissional"} /></option>
    <option value="career_change"><LText text={"Em transição de carreira"} /></option>
  </select>
</div>

                    <div><label className="text-sm font-semibold"><LText text={"País"} /></label><CountrySelect value={country} onChange={setCountry} /></div>
                    <div>
  <label className="text-sm font-semibold">
    <LText text={"Localização"} /></label>

  <select
    value={location}
    onChange={(event) => setLocation(event.target.value)}
    className={inputClass}
  >
    <option value=""><LText text={"Selecionar localização"} /></option>

    {locationOptions.map((option) => (
      <option key={option} value={option}>
        <LText text={option} />
      </option>
    ))}
  </select>
</div>

                    <div>
                      <label className="text-sm font-semibold">
                        <LText text={"Disponibilidade"} /></label>
                      <select
                        value={availability}
                        onChange={(event) =>
                          setAvailability(event.target.value)
                        }
                        className={inputClass}
                      >
                        <option value=""><LText text={"Selecionar"} /></option>
                        {availabilityOptions.map((option) => (
                          <option key={option} value={option}>
                            <LText text={option} />
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Posicionamento profissional"} /></h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <LText text={"Informação curta e clara para a primeira leitura por parte das empresas."} /></p>

                  <div className="mt-6 grid gap-5">
                    <div>
                      <label className="text-sm font-semibold">
                        <LText text={"Título profissional"} /></label>
                      <LElement as="input"
                        value={headline}
                        onChange={(event) => setHeadline(event.target.value)}
                        placeholder="Ex: Estudante de Gestão com interesse em Marketing"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"Bio"} /></label>
                      <LElement as="textarea"
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        rows={6}
                        placeholder="Apresentação profissional curta e orientada para empresas."
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "percurso" && (
  <div className="grid gap-6">
    <section className="overflow-hidden rounded-[32px] border border-[#DDE3EA] bg-white shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
      <div className="border-b border-[#DDE3EA] bg-gradient-to-br from-[#07111F] to-[#10233D] px-6 py-8 text-white md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4BB3FD]">
          <LText text={"Matriz profissional"} /></p>

        <h3 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
          <LText text={"Constrói o teu CV."} /></h3>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/65">
          <LText text={"Adiciona experiência, formação académica e certificações em blocos editáveis. Esta informação é essencial para empresas, matching e recomendações com IA."} /></p>
      </div>

      <div className="grid gap-6 p-6 md:p-8">
        <EditableExperienceSection
          items={professionalExperienceItems}
          onAdd={addProfessionalExperienceItem}
          onUpdate={updateProfessionalExperienceItem}
          onRemove={removeProfessionalExperienceItem}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <EditableAcademicSection
            items={academicEducationItems}
            onAdd={addAcademicEducationItem}
            onUpdate={updateAcademicEducationItem}
            onRemove={removeAcademicEducationItem}
          />

          <EditableTrainingSection
            items={professionalTrainingItems}
            onAdd={addProfessionalTrainingItem}
            onUpdate={updateProfessionalTrainingItem}
            onRemove={removeProfessionalTrainingItem}
          />
        </section>

        <section className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
            <LText text={"Pré-visualização"} /></p>

          <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
            <LText text={"Como a empresa vai ver o teu percurso"} /></h4>

          <div className="mt-6 grid gap-6">
            <StructuredExperienceTimeline
              items={professionalExperienceItems}
              empty="Ainda não adicionaste experiência profissional."
            />

            <StructuredEducationTimeline
              title="Formação académica"
              subtitle="Percurso académico"
              items={academicEducationItems}
              empty="Ainda não adicionaste formação académica."
            />

            <StructuredTrainingTimeline
              title="Formação profissional / Certificações"
              subtitle="Certificações e formação complementar"
              items={professionalTrainingItems}
              empty="Ainda não adicionaste formação profissional ou certificações."
            />
          </div>
        </section>
      </div>
    </section>
  </div>
)}

            {activeTab === "competencias" && (
              <div className="grid gap-6">
                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Skills técnicas"} /></h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <LText text={"Competências usadas no matching com vagas e empresas."} /></p>

                  <TagPicker value={uniqueArray([...skills.map(skill => skill.name), ...pendingLinkedInSkills])} onChange={async values => {
                    setPendingLinkedInSkills(current => current.filter(value => values.includes(value)));
                    for (const skill of skills) if (!values.includes(skill.name)) await handleRemoveSkill(skill.id);
                    for (const value of values) if (!skills.some(skill => skill.name === value) && !pendingLinkedInSkills.includes(value)) await upsertSkill(value);
                    const { error } = await supabase.from("student_profiles").update({skills_normalized: values}).eq("id", profileId);
                    await loadStudentSkills(profileId);
                    if (error) throw new Error("As competências foram alteradas, mas não foi possível atualizar a compatibilidade. Guarda o perfil para tentar novamente.");
                    await regenerateMatches(profileId);
                  }} label="Competências técnicas" />
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                    <h3 className="text-xl font-semibold tracking-[-0.04em]">
                      <LText text={"Idiomas falados"} /></h3>

                    <LanguagePicker value={splitTags(spokenLanguages)} onChange={values => setSpokenLanguages(values.join(", "))} label="idiomas falados" />
                  </div>

                  <div className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                    <h3 className="text-xl font-semibold tracking-[-0.04em]">
                      <LText text={"Idiomas escritos"} /></h3>

                    <LanguagePicker value={splitTags(writtenLanguages)} onChange={values => setWrittenLanguages(values.join(", "))} label="idiomas escritos" />
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Resumo de idiomas"} /></h3>

                  <LanguagePicker value={splitTags(languages)} onChange={values => setLanguages(values.join(", "))} label="idiomas" />
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                    <h3 className="text-xl font-semibold tracking-[-0.04em]">
                      <LText text={"Soft skills"} /></h3>

                    <TagPicker value={splitTags(softSkills)} onChange={values => setSoftSkills(values.join(", "))} label="Competências comportamentais" />
                  </div>

                  <div className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                    <h3 className="text-xl font-semibold tracking-[-0.04em]">
                      <LText text={"Ferramentas e software"} /></h3>

                    <TagPicker value={splitTags(tools)} onChange={values => setTools(values.join(", "))} label="Ferramentas e software" />
                  </div>
                </section>
              </div>
            )}

            {activeTab === "preferencias" && (
              <div className="grid gap-6">
                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
  <h3 className="text-xl font-semibold tracking-[-0.04em]">
    <LText text={"Privacidade e contacto profissional"} /></h3>

  <p className="mt-2 text-sm leading-6 text-slate-500">
    <LText text={"Define como as empresas podem aceder ao teu perfil quando ainda não te candidataste a uma vaga. Se te candidatares, a empresa dessa vaga poderá contactar-te diretamente."} /></p>

  <div className="mt-6 grid gap-4">
    <label
      className={`cursor-pointer rounded-[24px] border p-5 transition ${
        contactVisibility === "open"
          ? "border-[#1683FF] bg-[#1683FF]/5"
          : "border-[#DDE3EA] bg-white hover:border-[#1683FF]/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="radio"
          name="contact_visibility"
          value="open"
          checked={contactVisibility === "open"}
          onChange={() => setContactVisibility("open")}
          className="mt-1"
        />

        <div>
          <p className="text-sm font-semibold text-[#07111F]">
            <LText text={"Disponível para pedidos de empresas"} /></p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            <LText text={"As empresas podem consultar a minha síntese profissional e enviar pedidos. A minha identidade só é revelada depois de aceitar um pedido ou de me candidatar a uma vaga da empresa."} /></p>
        </div>
      </div>
    </label>

    <label
      className={`cursor-pointer rounded-[24px] border p-5 transition ${
        contactVisibility === "approval_required"
          ? "border-[#1683FF] bg-[#1683FF]/5"
          : "border-[#DDE3EA] bg-white hover:border-[#1683FF]/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="radio"
          name="contact_visibility"
          value="approval_required"
          checked={contactVisibility === "approval_required"}
          onChange={() => setContactVisibility("approval_required")}
          className="mt-1"
        />

        <div>
          <p className="text-sm font-semibold text-[#07111F]">
            <LText text={"Pedir autorização primeiro"} /></p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            <LText text={"Empresas podem pedir autorização para ver o meu perfil completo. Eu decido se aceito ou recuso cada pedido."} /></p>
        </div>
      </div>
    </label>

    <label
      className={`cursor-pointer rounded-[24px] border p-5 transition ${
        contactVisibility === "closed"
          ? "border-[#1683FF] bg-[#1683FF]/5"
          : "border-[#DDE3EA] bg-white hover:border-[#1683FF]/50"
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="radio"
          name="contact_visibility"
          value="closed"
          checked={contactVisibility === "closed"}
          onChange={() => setContactVisibility("closed")}
          className="mt-1"
        />

        <div>
          <p className="text-sm font-semibold text-[#07111F]">
            <LText text={"Perfil fechado"} /></p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            <LText text={"Só quero ser contactado por empresas quando eu próprio me candidatar a uma vaga."} /></p>
        </div>
      </div>
    </label>
  </div>
</section>
                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Disponibilidade e condições"} /></h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <LText text={"Define aquilo que procuras para melhorar o matching."} /></p>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    



                    

                    <div>
                      <label className="text-sm font-semibold">
                        <LText text={"Expectativa salarial"} /></label>
                      <LElement as="input"
                        value={expectedSalary}
                        onChange={(event) =>
                          setExpectedSalary(event.target.value)
                        }
                        placeholder="Ex: 1200€ líquidos"
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
  <label className="text-sm font-semibold">
    <LText text={"Regiões preferidas"} /></label>

  <p className="mt-2 text-xs leading-5 text-slate-500">
    <LText text={"Seleciona uma ou várias regiões onde pretendes receber oportunidades."} /></p>

  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {locationOptions.map((region) => {
      const isSelected = getSelectedPreferredRegions().includes(region);

      return (
        <button
          key={region}
          type="button"
          onClick={() => togglePreferredRegion(region)}
          className={
            isSelected
              ? "rounded-2xl border border-[#1683FF] bg-[#1683FF]/10 px-4 py-3 text-left text-sm font-semibold text-[#1683FF] transition hover:bg-[#1683FF]/15"
              : "rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-left text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]"
          }
        >
          <LText text={region} />
        </button>
      );
    })}
  </div>

  {getSelectedPreferredRegions().length > 0 && (
    <div className="mt-5 flex flex-wrap gap-2">
      {getSelectedPreferredRegions().map((region) => (
        <span
          key={region}
          className="inline-flex items-center gap-2 rounded-full bg-[#1683FF]/10 px-4 py-2 text-xs font-semibold text-[#1683FF]"
        >
          <LText text={region} />

          <button
            type="button"
            onClick={() => removePreferredRegion(region)}
            className="text-[#1683FF]/60 transition hover:text-[#1683FF]"
          >
            <LText text={"×"} /></button>
        </span>
      ))}
    </div>
  )}

  {getSelectedPreferredRegions().length === 0 && (
    <p className="mt-4 text-sm text-slate-400">
      <LText text={"Ainda não selecionaste regiões preferidas."} /></p>
  )}
</div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Objetivos de carreira"} /></h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <LText text={"Ajuda a IA a perceber a tua direção profissional."} /></p>

                  <textarea
                    value={careerGoals}
                    onChange={(event) => setCareerGoals(event.target.value)}
                    rows={7}
                    className={textareaClass}
                  />
                </section>
              </div>
            )}

            {activeTab === "ia" && (
              <div className="grid gap-6">
                <section className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                    <h3 className="text-xl font-semibold tracking-[-0.04em]">
                      <LText text={"Score do perfil"} /></h3>

                    <p className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-[#1683FF]">
                      {aiProfileScore}
                    </p>
                  </div>

                  <div className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                    <h3 className="text-xl font-semibold tracking-[-0.04em]">
                      <LText text={"Empregabilidade"} /></h3>

                    <p className="mt-3 text-5xl font-semibold tracking-[-0.06em] text-[#1683FF]">
                      {aiEmployabilityScore}
                    </p>
                  </div>
                </section>



                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Resumo profissional"} /></h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    <LText text={"Este texto será usado para apresentar o candidato às empresas e melhorar o matching."} /></p>

                  <textarea
                    value={aiSummary}
                    onChange={(event) => setAiSummary(event.target.value)}
                    rows={9}
                    className={textareaClass}
                  />
                </section>

                <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.04em]">
                    <LText text={"Documentos e presença digital"} /></h3>

                  <div className="mt-6 grid gap-5">
                    <div>
                      <p className="text-sm font-semibold"><LText text={"Currículo"} /></p>
                      <p className="mt-2 text-sm text-slate-500"><LText text={cvUrl ? "Currículo guardado em armazenamento privado." : "Ainda não carregaste um currículo."} /></p>
                      {cvUrl && <div className="mt-3 flex gap-3"><CandidateCVButton studentId={profileId} className="text-sm font-semibold text-blue-700" /><button type="button" disabled={isUploadingCV || isGeneratingAIProfile || savingProfile} onClick={removeCV} className="text-sm font-semibold text-red-700"><LText text={"Eliminar currículo"} /></button></div>}

                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"LinkedIn"} /></label>
                      <LElement as="input"
                        value={linkedinUrl}
                        onChange={(event) => setLinkedinUrl(event.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold"><LText text={"Portfólio"} /></label>
                      <LElement as="input"
                        value={portfolioUrl}
                        onChange={(event) =>
                          setPortfolioUrl(event.target.value)
                        }
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function ExperienceTimeline({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
          <LText text={"Experiência profissional"} /></p>

        <p className="mt-3 text-sm leading-6 text-slate-400"><LText text={empty} /></p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#1683FF]/20 bg-[#1683FF]/5 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
            <LText text={"Experiência profissional"} /></p>

          <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
            <LText text={"Cronologia de carreira"} /></h4>
        </div>

        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#1683FF] shadow-sm">
          {items.length} <LText text={items.length === 1 ? "experiência" : "experiências"} />
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-[17px] top-2 h-[calc(100%-16px)] w-px bg-[#1683FF]/25" />

        <div className="grid gap-5">
          {items.map((item, index) => {
            const parsed = parseCareerLine(item);

            return (
              <article key={`${item}-${index}`} className="relative pl-12">
                <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1683FF] text-xs font-bold text-white shadow-[0_10px_30px_rgba(22,131,255,0.25)]">
                  {index + 1}
                </div>

                <div className="rounded-[24px] border border-[#DDE3EA] bg-white p-5 shadow-sm">
                  <p className="mb-2 inline-flex rounded-full bg-[#07111F] px-3 py-1 text-[11px] font-semibold text-white">
  <LText text={parsed.period || "Data não indicada"} />
</p>

                  <h5 className="text-lg font-semibold tracking-[-0.03em] text-[#07111F]">
                    {parsed.title}
                  </h5>

                  {parsed.description && (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {parsed.description}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EducationTimeline({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle: string;
  items: string[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
          <LText text={title} />
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-400"><LText text={empty} /></p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#DDE3EA] bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
            <LText text={title} />
          </p>

          <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
            <LText text={subtitle} />
          </h4>
        </div>

        <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-[#1683FF]">
          {items.length} <LText text={items.length === 1 ? "registo" : "registos"} />
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-[17px] top-2 h-[calc(100%-16px)] w-px bg-[#1683FF]/20" />

        <div className="grid gap-5">
          {items.map((item, index) => {
            const parsed = parseEducationLine(item);

            return (
              <article key={`${item}-${index}`} className="relative pl-12">
                <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1683FF] shadow-sm ring-1 ring-[#1683FF]/25">
                  {index + 1}
                </div>

                <div className="rounded-[24px] border border-[#DDE3EA] bg-[#F7F9FC] p-5">
                  {parsed.period && (
                    <p className="mb-2 inline-flex rounded-full bg-[#07111F] px-3 py-1 text-[11px] font-semibold text-white">
                      <LText text={parsed.period} />
                    </p>
                  )}

                  <h5 className="text-lg font-semibold tracking-[-0.03em] text-[#07111F]">
                    {parsed.title}
                  </h5>

                  {parsed.institution && (
                    <p className="mt-2 text-sm font-semibold text-[#1683FF]">
                      <LText text={parsed.institution} />
                    </p>
                  )}

                  {parsed.description && (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {parsed.description}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function parseEducationLine(value: string) {
  const trimmedValue = value.trim();

  const parenthesesPeriodMatch = trimmedValue.match(/\(([^)]+)\)/);
  const endPeriodMatch = trimmedValue.match(
    /(.*?)(?:\s[-–—]\s)(\d{4}(?:\s?[-–—]\s?\d{4}| presente| atual)?)$/i
  );
  const startPeriodMatch = trimmedValue.match(
    /^(\d{4}(?:\s?[-–—]\s?\d{4}| presente| atual)?)(?:\s[-–—]\s)(.*)$/i
  );

  let period = "";
  let cleanValue = trimmedValue;

  if (parenthesesPeriodMatch) {
    period = parenthesesPeriodMatch[1];
    cleanValue = trimmedValue.replace(/\([^)]*\)/, "").trim();
  } else if (startPeriodMatch) {
    period = startPeriodMatch[1];
    cleanValue = startPeriodMatch[2].trim();
  } else if (endPeriodMatch) {
    period = endPeriodMatch[2];
    cleanValue = endPeriodMatch[1].trim();
  }

  const byInstitution = cleanValue
    .split(/\spela\s|\spelo\s|\sna\s|\sno\s|\sem\s/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (byInstitution.length >= 2) {
    return {
      period,
      title: byInstitution[0],
      institution: byInstitution.slice(1).join(" "),
      description: "",
    };
  }

  const parts = cleanValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    period,
    title: parts[0] || cleanValue,
    institution: "",
    description: parts.slice(1).join(", "),
  };
}

function parseCareerLine(value: string) {
  const periodMatch = value.match(/\(([^)]+)\)/);
  const period = periodMatch?.[1] || "";

  const cleanValue = value.replace(/\([^)]*\)/, "").trim();

  const parts = cleanValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    period,
    title: parts[0] || value,
    description: parts.slice(1).join(", "),
  };
}

function EditableExperienceSection({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: ProfessionalExperienceItem[];
  onAdd: () => void;
  onUpdate: (
    id: string,
    field: keyof ProfessionalExperienceItem,
    value: string
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-[#DDE3EA] bg-[#F7F9FC] p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="inline-flex rounded-full bg-[#1683FF]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1683FF]">
            <LText text={"Experiência"} /></p>

          <h4 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
            <LText text={"Experiência profissional"} /></h4>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            <LText text={"Adiciona cada experiência separadamente para criar uma cronologia clara e fácil de ler."} /></p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
        >
          <LText text={"+ Adicionar experiência"} /></button>
      </div>

      <div className="mt-6 grid gap-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-[24px] border border-[#DDE3EA] bg-white p-5"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-[#07111F]">
                <LText text={"Experiência "} />{index + 1}
              </p>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-xs font-semibold text-red-500 hover:text-red-600"
              >
                <LText text={"Remover"} /></button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SmallInput
                label="Cargo"
                value={item.role}
                onChange={(value) => onUpdate(item.id, "role", value)}
                placeholder="Ex: Diretor de Marketing"
              />

              <SmallInput
                label="Empresa"
                value={item.company}
                onChange={(value) => onUpdate(item.id, "company", value)}
                placeholder="Ex: Motofil SA"
              />

              <SmallInput
                label="Data início"
                value={item.start_date}
                onChange={(value) => onUpdate(item.id, "start_date", value)}
                placeholder="Ex: 2024"
              />

              <SmallInput
                label="Data fim"
                value={item.end_date}
                onChange={(value) => onUpdate(item.id, "end_date", value)}
                placeholder="Ex: Presente"
              />
            </div>

            <SmallTextarea
              label="Descrição / responsabilidades"
              value={item.description}
              onChange={(value) => onUpdate(item.id, "description", value)}
              placeholder="Ex: Liderança da estratégia global, comunicação, campanhas digitais e desenvolvimento de negócio."
            />
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-[#DDE3EA] bg-white p-8 text-center">
            <p className="text-sm text-slate-500">
              <LText text={"Ainda não adicionaste experiências. Clica em “Adicionar experiência”."} /></p>
          </div>
        )}
      </div>
    </section>
  );
}

function EditableAcademicSection({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: AcademicEducationItem[];
  onAdd: () => void;
  onUpdate: (
    id: string,
    field: keyof AcademicEducationItem,
    value: string
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="inline-flex rounded-full bg-[#1683FF]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1683FF]">
            <LText text={"Formação"} /></p>

          <h4 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
            <LText text={"Formação académica"} /></h4>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
        >
          <LText text={"+ Adicionar"} /></button>
      </div>

      <div className="mt-6 grid gap-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-[24px] border border-[#DDE3EA] bg-[#F7F9FC] p-5"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-[#07111F]">
                <LText text={"Formação "} />{index + 1}
              </p>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-xs font-semibold text-red-500 hover:text-red-600"
              >
                <LText text={"Remover"} /></button>
            </div>

            <SmallInput
              label="Grau / Curso"
              value={item.degree}
              onChange={(value) => onUpdate(item.id, "degree", value)}
              placeholder="Ex: MBA em Marketing"
            />

            <SmallInput
              label="Instituição"
              value={item.institution}
              onChange={(value) => onUpdate(item.id, "institution", value)}
              placeholder="Ex: Universidade de Coimbra"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <SmallInput
                label="Data início"
                value={item.start_date}
                onChange={(value) => onUpdate(item.id, "start_date", value)}
                placeholder="Ex: 2018"
              />

              <SmallInput
                label="Data fim"
                value={item.end_date}
                onChange={(value) => onUpdate(item.id, "end_date", value)}
                placeholder="Ex: 2019"
              />
            </div>

            <SmallTextarea
              label="Descrição opcional"
              value={item.description}
              onChange={(value) => onUpdate(item.id, "description", value)}
              placeholder="Áreas principais, projeto final, especialização..."
            />
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-8 text-center">
            <p className="text-sm text-slate-500">
              <LText text={"Ainda não adicionaste formação académica."} /></p>
          </div>
        )}
      </div>
    </section>
  );
}

function EditableTrainingSection({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: ProfessionalTrainingItem[];
  onAdd: () => void;
  onUpdate: (
    id: string,
    field: keyof ProfessionalTrainingItem,
    value: string
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-[28px] border border-[#DDE3EA] bg-white p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="inline-flex rounded-full bg-[#1683FF]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1683FF]">
            <LText text={"Certificações"} /></p>

          <h4 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
            <LText text={"Formação profissional"} /></h4>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
        >
          <LText text={"+ Adicionar"} /></button>
      </div>

      <div className="mt-6 grid gap-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-[24px] border border-[#DDE3EA] bg-[#F7F9FC] p-5"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-[#07111F]">
                <LText text={"Certificação "} />{index + 1}
              </p>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-xs font-semibold text-red-500 hover:text-red-600"
              >
                <LText text={"Remover"} /></button>
            </div>

            <SmallInput
              label="Formação / Certificação"
              value={item.title}
              onChange={(value) => onUpdate(item.id, "title", value)}
              placeholder="Ex: Certificado de Competências Pedagógicas"
            />

            <SmallInput
              label="Entidade"
              value={item.entity}
              onChange={(value) => onUpdate(item.id, "entity", value)}
              placeholder="Ex: IEFP"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <SmallInput
                label="Data início"
                value={item.start_date}
                onChange={(value) => onUpdate(item.id, "start_date", value)}
                placeholder="Ex: 2020"
              />

              <SmallInput
                label="Data fim"
                value={item.end_date}
                onChange={(value) => onUpdate(item.id, "end_date", value)}
                placeholder="Ex: 2020"
              />
            </div>

            <SmallTextarea
              label="Descrição opcional"
              value={item.description}
              onChange={(value) => onUpdate(item.id, "description", value)}
              placeholder="Conteúdos principais, competências adquiridas..."
            />
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-[24px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-8 text-center">
            <p className="text-sm text-slate-500">
              <LText text={"Ainda não adicionaste formação profissional ou certificações."} /></p>
          </div>
        )}
      </div>
    </section>
  );
}

function StructuredExperienceTimeline({
  items,
  empty,
}: {
  items: ProfessionalExperienceItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyPreview title="Experiência profissional" empty={empty} />;
  }

  return (
    <section className="rounded-[28px] border border-[#1683FF]/20 bg-[#1683FF]/5 p-6">
      <PreviewHeader
        title="Experiência profissional"
        subtitle="Cronologia de carreira"
        count={items.length}
      />

      <TimelineWrapper>
        {items.map((item, index) => (
          <TimelineItem key={item.id} index={index}>
            <PreviewCard
              period={`${item.start_date || "?"} — ${
                item.end_date || "?"
              }`}
              title={item.role || "Cargo não indicado"}
              subtitle={item.company}
              description={item.description}
            />
          </TimelineItem>
        ))}
      </TimelineWrapper>
    </section>
  );
}

function StructuredEducationTimeline({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle: string;
  items: AcademicEducationItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyPreview title={title} empty={empty} />;
  }

  return (
    <section className="rounded-[28px] border border-[#DDE3EA] bg-white p-6">
      <PreviewHeader title={title} subtitle={subtitle} count={items.length} />

      <TimelineWrapper>
        {items.map((item, index) => (
          <TimelineItem key={item.id} index={index}>
            <PreviewCard
              period={`${item.start_date || "?"} — ${
                item.end_date || "?"
              }`}
              title={item.degree || "Curso não indicado"}
              subtitle={item.institution}
              description={item.description}
            />
          </TimelineItem>
        ))}
      </TimelineWrapper>
    </section>
  );
}

function StructuredTrainingTimeline({
  title,
  subtitle,
  items,
  empty,
}: {
  title: string;
  subtitle: string;
  items: ProfessionalTrainingItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <EmptyPreview title={title} empty={empty} />;
  }

  return (
    <section className="rounded-[28px] border border-[#DDE3EA] bg-white p-6">
      <PreviewHeader title={title} subtitle={subtitle} count={items.length} />

      <TimelineWrapper>
        {items.map((item, index) => (
          <TimelineItem key={item.id} index={index}>
            <PreviewCard
              period={`${item.start_date || "?"} — ${
                item.end_date || "?"
              }`}
              title={item.title || "Formação não indicada"}
              subtitle={item.entity}
              description={item.description}
            />
          </TimelineItem>
        ))}
      </TimelineWrapper>
    </section>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        <LText text={label} />
      </label>

      <LElement as="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
      />
    </div>
  );
}

function SmallTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-2">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        <LText text={label} />
      </label>

      <LElement as="textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm leading-6 text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
      />
    </div>
  );
}

function EmptyPreview({ title, empty }: { title: string; empty: string }) {
  return (
    <section className="rounded-[28px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
        <LText text={title} />
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-400"><LText text={empty} /></p>
    </section>
  );
}

function PreviewHeader({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
          <LText text={title} />
        </p>

        <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#07111F]">
          <LText text={subtitle} />
        </h4>
      </div>

      <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#1683FF] shadow-sm">
        {count} <LText text={count === 1 ? "registo" : "registos"} />
      </span>
    </div>
  );
}

function TimelineWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute left-[17px] top-2 h-[calc(100%-16px)] w-px bg-[#1683FF]/20" />

      <div className="grid gap-5">{children}</div>
    </div>
  );
}

function TimelineItem({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <article className="relative pl-12">
      <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1683FF] text-xs font-bold text-white shadow-[0_10px_30px_rgba(22,131,255,0.25)]">
        {index + 1}
      </div>

      {children}
    </article>
  );
}

function PreviewCard({
  period,
  title,
  subtitle,
  description,
}: {
  period: string;
  title: string;
  subtitle?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#DDE3EA] bg-white p-5 shadow-sm">
      <p className="mb-2 inline-flex rounded-full bg-[#07111F] px-3 py-1 text-[11px] font-semibold text-white">
        <LText text={period} />
      </p>

      <h5 className="text-lg font-semibold tracking-[-0.03em] text-[#07111F]">
        <LText text={title} />
      </h5>

      {subtitle && (
        <p className="mt-2 text-sm font-semibold text-[#1683FF]">
          <LText text={subtitle} />
        </p>
      )}

      {description && (
        <p className="mt-3 text-sm leading-7 text-slate-600">
          <LText text={description} />
        </p>
      )}
    </div>
  );
}
