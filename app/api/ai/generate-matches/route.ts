import { requireActor, enforceApiLimit, authorizeMatchScope, apiErrorResponse } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type MatchCategory =
  | "recommended"
  | "possible"
  | "low_compatibility"
  | "not_relevant";

type StudentProfile = {
  id: string;
  user_id: string;
  headline: string | null;
  desired_area: string | null;
  location: string | null;
  seniority: string | null;
  work_model: string | null;
  expected_salary: string | null;
  preferred_regions: string | null;
  academic_education: string | null;
  professional_experience: string | null;
  languages: string | null;
  spoken_languages: string | null;
  written_languages: string | null;
  tools: string | null;
  soft_skills: string | null;
  career_goals: string | null;
  preferred_opportunity_type: string | null;
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

type Job = {
  id: string;
  title: string;
  description: string;
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
  role_title: string | null;
  role_family: string | null;
  regions: string[] | null;
  ai_match_keywords: string[] | null;
};

type MatchResult = {
  matchScore: number;
  skillsScore: number;
  roleScore: number;
  seniorityScore: number;
  locationScore: number;
  workModelScore: number;
  salaryScore: number;
  educationLanguageScore: number;
  opportunityTypeScore: number;
  matchCategory: MatchCategory;
  isRelevant: boolean;
  strengths: string[];
  gaps: string[];
  aiReason: string;
  matchingSkills: string[];
  missingSkills: string[];
  aiRecommendations: string[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalize(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeList(values: Array<string | null | undefined>) {
  return values
    .flatMap((value) => {
      if (!value) {
        return [];
      }

      return value
        .split(/[,;\n|]/)
        .map((item) => normalize(item))
        .filter(Boolean);
    })
    .filter((value) => value.length > 0);
}

function normalizeArray(values: string[] | null | undefined) {
  return (values || []).map((value) => normalize(value)).filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreOverlap(candidateValues: string[], jobValues: string[]) {
  const normalizedCandidateValues = unique(candidateValues);
  const normalizedJobValues = unique(jobValues);

  if (normalizedJobValues.length === 0) {
    return 60;
  }

  if (normalizedCandidateValues.length === 0) {
    return 20;
  }

  const matches = normalizedJobValues.filter((jobValue) =>
    normalizedCandidateValues.some(
      (candidateValue) =>
        candidateValue === jobValue ||
        candidateValue.includes(jobValue) ||
        jobValue.includes(candidateValue)
    )
  );

  return Math.round((matches.length / normalizedJobValues.length) * 100);
}

function textIncludesAny(text: string, values: string[]) {
  const normalizedText = normalize(text);

  return values.some((value) => {
    const normalizedValue = normalize(value);

    return (
      normalizedValue.length > 0 &&
      (normalizedText.includes(normalizedValue) ||
        normalizedValue.includes(normalizedText))
    );
  });
}

function convertLegacyWorkMode(value: string | null | undefined) {
  const normalizedValue = normalize(value);

  if (normalizedValue === "remote" || normalizedValue === "remoto") {
    return "remoto";
  }

  if (normalizedValue === "presential" || normalizedValue === "presencial") {
    return "presencial";
  }

  if (normalizedValue === "hybrid" || normalizedValue === "hibrido") {
    return "hibrido";
  }

  return normalizedValue;
}

function parseSalary(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const numbers = value.match(/\d+(?:[.,]\d+)?/g);

  if (!numbers || numbers.length === 0) {
    return null;
  }

  const parsedNumbers = numbers
    .map((number) => Number(number.replace(",", ".")))
    .filter((number) => !Number.isNaN(number));

  if (parsedNumbers.length === 0) {
    return null;
  }

  return Math.max(...parsedNumbers);
}

function inferRoleFamily(values: Array<string | null | undefined>) {
  const families = [
    {
      family: "marketing",
      keywords: [
        "marketing",
        "comunicacao",
        "comunicação",
        "publicidade",
        "branding",
        "social media",
        "conteudo",
        "conteúdo",
        "seo",
        "campanhas",
        "head of marketing",
        "diretor de marketing",
        "director de marketing",
        "marketing manager",
        "gestor de marketing",
      ],
    },
    {
      family: "recursos_humanos",
      keywords: [
        "recursos humanos",
        "rh",
        "talento",
        "recrutamento",
        "selecao",
        "seleção",
        "people",
        "formacao",
        "formação",
        "desenvolvimento de talentos",
        "gestao de pessoas",
        "gestão de pessoas",
      ],
    },
    {
      family: "industrial",
      keywords: [
        "industria",
        "indústria",
        "producao",
        "produção",
        "operador fabril",
        "operador industrial",
        "operacional",
        "manutencao",
        "manutenção",
        "qualidade",
        "maquina",
        "máquina",
        "cnc",
        "torneiro",
        "torneiro mecanico",
        "torneiro mecânico",
        "fresador",
        "maquinador",
        "maquinagem",
        "metalomecanica",
        "metalomecânica",
        "serralheiro",
        "soldador",
        "mecanico industrial",
        "mecânico industrial",
        "tecnico mecanico",
        "técnico mecânico",
        "desenho tecnico",
        "desenho técnico",
        "leitura de desenho",
      ],
    },
    {
      family: "transportes",
      keywords: [
        "transportes",
        "transporte",
        "motorista",
        "condutor",
        "pesados",
        "ligeiros",
        "camiao",
        "camião",
        "carta c",
        "carta ce",
        "tacografo",
        "tacógrafo",
        "distribuicao",
        "distribuição",
        "entregas",
        "rota",
        "rotas",
        "internacional",
      ],
    },
    {
      family: "construcao",
      keywords: [
        "construcao",
        "construção",
        "obra",
        "obras",
        "pedreiro",
        "servente",
        "carpinteiro",
        "pintor",
        "canalizador",
        "eletricista",
        "alvenaria",
        "cofragem",
      ],
    },
    {
      family: "tecnologia",
      keywords: [
        "software",
        "programador",
        "developer",
        "frontend",
        "backend",
        "fullstack",
        "dados",
        "data",
        "informatica",
        "informática",
        "tecnologia",
        "react",
        "typescript",
        "javascript",
      ],
    },
    {
      family: "comercial",
      keywords: [
        "comercial",
        "vendas",
        "sales",
        "business development",
        "gestor de conta",
        "account manager",
      ],
    },
    {
      family: "logistica",
      keywords: [
        "logistica",
        "logística",
        "armazem",
        "armazém",
        "operador de armazem",
        "operador de armazém",
        "supply chain",
        "stocks",
        "inventario",
        "inventário",
      ],
    },
  ];

  const scores = new Map<string, number>();

  values.forEach((value, index) => {
    const text = normalize(value);
    if (!text) return;

    const weight = index <= 2 ? 10 : index <= 5 ? 5 : 1;

    families.forEach((family) => {
      family.keywords.forEach((keyword) => {
        if (text.includes(normalize(keyword))) {
          scores.set(
            family.family,
            (scores.get(family.family) || 0) + weight
          );
        }
      });
    });
  });

  const bestMatch = Array.from(scores.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return bestMatch?.[0] || "";
}

function areRoleFamiliesCompatible(
  candidateFamily: string,
  jobFamily: string
) {
  if (!candidateFamily || !jobFamily) {
    return false;
  }

  if (candidateFamily === jobFamily) {
    return true;
  }

  const compatibilityMap: Record<string, string[]> = {
    industrial: ["logistica"],
    transportes: ["logistica"],
    logistica: ["transportes", "industrial"],
    construcao: ["industrial"],
    marketing: ["design", "comercial"],
    recursos_humanos: ["educacao"],
    tecnologia: ["design"],
    comercial: ["marketing"],
    financeiro: [],
    saude: [],
    hotelaria: [],
    educacao: ["recursos_humanos"],
    juridico: [],
    design: ["marketing", "tecnologia"],
  };

  return (compatibilityMap[jobFamily] || []).includes(candidateFamily);
}

function getSalaryScore(student: StudentProfile, job: Job) {
  const studentSalary =
    student.salary_min || parseSalary(student.expected_salary);

  const jobSalaryMax = job.salary_max || parseSalary(job.salary_range);

  if (!studentSalary || !jobSalaryMax) {
    return 60;
  }

  if (studentSalary <= jobSalaryMax) {
    return 100;
  }

  const difference = studentSalary - jobSalaryMax;
  const differenceRatio = difference / jobSalaryMax;

  if (differenceRatio <= 0.15) {
    return 75;
  }

  if (differenceRatio <= 0.3) {
    return 50;
  }

  return 25;
}

function getTalentTypeScore(student: StudentProfile, job: Job) {
  const talentType = normalize(student.talent_type);
  const seniority = normalize(job.seniority);
  const opportunityType = normalize(job.opportunity_type || job.contract_type);
  const title = normalize(job.title);
  const area = normalize(job.area);

  const jobText = `${seniority} ${opportunityType} ${title} ${area}`;

  if (!talentType) {
    return 60;
  }

  if (talentType === "student") {
    if (
      jobText.includes("estagio") ||
      jobText.includes("curricular") ||
      jobText.includes("trainee") ||
      jobText.includes("junior") ||
      jobText.includes("programa graduados")
    ) {
      return 100;
    }

    if (
      jobText.includes("senior") ||
      jobText.includes("direcao") ||
      jobText.includes("gestao")
    ) {
      return 25;
    }

    return 60;
  }

  if (talentType === "graduate") {
    if (
      jobText.includes("junior") ||
      jobText.includes("graduate") ||
      jobText.includes("trainee") ||
      jobText.includes("estagio profissional") ||
      jobText.includes("programa graduados")
    ) {
      return 100;
    }

    if (jobText.includes("senior") || jobText.includes("direcao")) {
      return 35;
    }

    return 70;
  }

  if (talentType === "professional") {
    if (
      jobText.includes("mid") ||
      jobText.includes("senior") ||
      jobText.includes("especialista") ||
      jobText.includes("coordenacao") ||
      jobText.includes("gestao") ||
      jobText.includes("direcao")
    ) {
      return 100;
    }

    if (jobText.includes("estagio curricular") || jobText.includes("trainee")) {
      return 30;
    }

    return 80;
  }

  return 60;
}

function getSeniorityScore(student: StudentProfile, job: Job) {
  const studentSeniority = normalize(student.seniority);
  const jobSeniority = normalize(job.seniority);

  if (!studentSeniority || !jobSeniority) {
    return 60;
  }

  if (studentSeniority === jobSeniority) {
    return 100;
  }

  const juniorValues = ["estagio", "junior", "júnior", "trainee", "operacional"];
  const midValues = ["mid", "mid level", "mid-level", "pleno"];
  const seniorValues = [
    "senior",
    "sénior",
    "especialista",
    "coordenacao",
    "gestao",
    "direcao",
  ];

  const bothJunior =
    juniorValues.some((value) => studentSeniority.includes(normalize(value))) &&
    juniorValues.some((value) => jobSeniority.includes(normalize(value)));

  const bothMid =
    midValues.some((value) => studentSeniority.includes(normalize(value))) &&
    midValues.some((value) => jobSeniority.includes(normalize(value)));

  const bothSenior =
    seniorValues.some((value) => studentSeniority.includes(normalize(value))) &&
    seniorValues.some((value) => jobSeniority.includes(normalize(value)));

  if (bothJunior || bothMid || bothSenior) {
    return 85;
  }

  return 35;
}

function getMatchCategory(
  matchScore: number,
  isRelevant: boolean
): MatchCategory {
  if (!isRelevant) {
    return "not_relevant";
  }

  if (matchScore >= 65) {
    return "recommended";
  }

  if (matchScore >= 50) {
    return "possible";
  }

  return "low_compatibility";
}

function buildNotRelevantMatch(
  candidateFamily: string,
  jobFamily: string
): MatchResult {
  return {
    matchScore: 0,
    skillsScore: 0,
    roleScore: 0,
    seniorityScore: 0,
    locationScore: 0,
    workModelScore: 0,
    salaryScore: 0,
    educationLanguageScore: 0,
    opportunityTypeScore: 0,
    matchCategory: "not_relevant",
    isRelevant: false,
    strengths: [],
    gaps: [
      "Perfil excluído por incompatibilidade de família profissional.",
      "A área profissional do candidato não é relevante para esta vaga.",
    ],
    aiReason: `Perfil não relevante para esta vaga. A família profissional do candidato é "${
      candidateFamily || "não identificada"
    }" e a família profissional da vaga é "${
      jobFamily || "não identificada"
    }".`,
    matchingSkills: [],
    missingSkills: [],
    aiRecommendations: [
      "Não apresentar este perfil como candidato recomendado para esta vaga.",
    ],
  };
}

function calculateMatch(student: StudentProfile, job: Job): MatchResult {
  const candidateFamily = inferRoleFamily([
    student.role_family,
    student.role_title,
    student.desired_area,
    student.headline,
    student.career_goals,
    ...(student.ai_match_keywords || []),
  ]);

  const jobFamily = inferRoleFamily([
  job.role_family,
  job.role_title,
  job.title,
  ...(job.required_skills || []),
  ...(job.specializations || []),
  ...(job.ai_match_keywords || []),
  job.description,
  job.area,
]);

  const familiesCompatible = areRoleFamiliesCompatible(
    candidateFamily,
    jobFamily
  );

  if (!familiesCompatible) {
    return buildNotRelevantMatch(candidateFamily, jobFamily);
  }

  const studentSkills = unique([
    ...normalizeArray(student.skills_normalized),
    ...normalizeArray(student.tools_normalized),
    ...normalizeArray(student.soft_skills_normalized),
    ...normalizeArray(student.ai_match_keywords),
    ...normalizeList([
      student.headline,
      student.desired_area,
      student.tools,
      student.soft_skills,
      student.career_goals,
      student.professional_experience,
    ]),
  ]);

  const jobRequiredSkills = normalizeArray(job.required_skills);
  const jobPreferredSkills = normalizeArray(job.preferred_skills);
  const jobSpecializations = normalizeArray(job.specializations);
  const jobKeywords = normalizeArray(job.ai_match_keywords);

  const jobSkills = unique([
    ...jobRequiredSkills,
    ...jobPreferredSkills,
    ...jobSpecializations,
    ...jobKeywords,
  ]);

  const matchingSkills = jobSkills.filter((skill) =>
    studentSkills.some(
      (studentSkill) =>
        studentSkill === skill ||
        studentSkill.includes(skill) ||
        skill.includes(studentSkill)
    )
  );

  const missingSkills = jobRequiredSkills.filter(
    (skill) =>
      !studentSkills.some(
        (studentSkill) =>
          studentSkill === skill ||
          studentSkill.includes(skill) ||
          skill.includes(studentSkill)
      )
  );

  const requiredSkillsScore = scoreOverlap(studentSkills, jobRequiredSkills);
  const preferredSkillsScore = scoreOverlap(studentSkills, jobPreferredSkills);
  const specializationsScore = scoreOverlap(studentSkills, jobSpecializations);

  const skillsScore = Math.round(
    requiredSkillsScore * 0.6 +
      preferredSkillsScore * 0.25 +
      specializationsScore * 0.15
  );

  const studentRoleValues = unique([
    ...normalizeList([
      student.role_title,
      student.role_family,
      student.headline,
      student.desired_area,
      student.career_goals,
    ]),
  ]);

  const jobRoleValues = unique([
    ...normalizeList([
      job.role_title,
      job.role_family,
      job.title,
      job.area,
      job.description,
      job.ai_summary,
      job.candidate_pitch,
    ]),
    ...jobSpecializations,
  ]);

  const roleScore =
    scoreOverlap(studentRoleValues, jobRoleValues) ||
    (textIncludesAny(studentRoleValues.join(" "), jobRoleValues) ? 80 : 35);

  const seniorityScore = getSeniorityScore(student, job);

  const studentRegions = unique([
    ...normalizeArray(student.regions),
    ...normalizeList([student.location, student.preferred_regions]),
  ]);

  const jobRegions = unique([
    ...normalizeArray(job.regions),
    ...normalizeList([job.location]),
  ]);

  const jobWorkModel = convertLegacyWorkMode(job.work_model || job.work_mode);
  const studentWorkModel = convertLegacyWorkMode(student.work_model);

  const locationScore =
    scoreOverlap(studentRegions, jobRegions) ||
    (studentWorkModel === "remoto" || jobWorkModel === "remoto" ? 85 : 45);

  const workModelScore =
    studentWorkModel && jobWorkModel && studentWorkModel === jobWorkModel
      ? 100
      : !jobWorkModel || !studentWorkModel
        ? 60
        : jobWorkModel === "hibrido" || studentWorkModel === "hibrido"
          ? 75
          : 35;

  const salaryScore = getSalaryScore(student, job);

  const studentLanguages = unique([
    ...normalizeList([
      student.languages,
      student.spoken_languages,
      student.written_languages,
    ]),
  ]);

  const jobLanguages = normalizeArray(job.languages);

  const languageScore = scoreOverlap(studentLanguages, jobLanguages);

  const educationScore = scoreOverlap(
    normalizeList([
      student.academic_education,
      student.professional_experience,
    ]),
    normalizeList([
      job.education_requirements,
      job.experience_requirements,
    ])
  );

  const educationLanguageScore = Math.round(
    languageScore * 0.45 + educationScore * 0.55
  );

  const opportunityTypeScore =
    normalize(student.preferred_opportunity_type) &&
    normalize(job.opportunity_type || job.contract_type) &&
    normalize(student.preferred_opportunity_type) ===
      normalize(job.opportunity_type || job.contract_type)
      ? 100
      : !student.preferred_opportunity_type ||
          !(job.opportunity_type || job.contract_type)
        ? 60
        : 40;

  const talentTypeScore = getTalentTypeScore(student, job);

  const matchScore = Math.round(
    skillsScore * 0.35 +
      roleScore * 0.25 +
      seniorityScore * 0.08 +
      locationScore * 0.07 +
      workModelScore * 0.06 +
      salaryScore * 0.05 +
      educationLanguageScore * 0.06 +
      opportunityTypeScore * 0.05 +
      talentTypeScore * 0.03
  );

  const matchCategory = getMatchCategory(matchScore, true);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const aiRecommendations: string[] = [];

  if (matchScore < 50) {
    gaps.push("Compatibilidade global baixa para esta vaga.");
    aiRecommendations.push(
      "Este perfil deve ser analisado apenas como candidato secundário, não como match recomendado."
    );
  }

  if (skillsScore >= 75) {
    strengths.push(
      "Boa compatibilidade entre competências do candidato e requisitos da vaga."
    );
  } else if (skillsScore >= 50) {
    strengths.push("Compatibilidade parcial nas competências principais.");
    gaps.push("Algumas competências obrigatórias podem precisar de validação.");
  } else {
    gaps.push(
      "As competências do candidato parecem pouco alinhadas com os requisitos principais."
    );
  }

  if (roleScore >= 75) {
    strengths.push(
      "Área profissional e orientação de carreira alinhadas com a vaga."
    );
  } else {
    gaps.push(
      "A área profissional ou objetivo de carreira não está totalmente alinhado com esta oportunidade."
    );
  }

  if (missingSkills.length > 0) {
    aiRecommendations.push(
      `Validar ou reforçar competências em ${missingSkills
        .slice(0, 3)
        .join(", ")}.`
    );
  }

  if (matchingSkills.length > 0) {
    aiRecommendations.push(
      `Explorar na entrevista a experiência do candidato em ${matchingSkills
        .slice(0, 3)
        .join(", ")}.`
    );
  }

  const aiReason = `Match de ${matchScore}%. A compatibilidade foi calculada apenas depois de validar compatibilidade profissional entre a família da vaga e a família do candidato.`;

  return {
    matchScore,
    skillsScore,
    roleScore,
    seniorityScore,
    locationScore,
    workModelScore,
    salaryScore,
    educationLanguageScore,
    opportunityTypeScore,
    matchCategory,
    isRelevant: true,
    strengths,
    gaps,
    aiReason,
    matchingSkills,
    missingSkills,
    aiRecommendations,
  };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const requestedScope = (await request.json().catch(() => ({}))) as {
      studentId?: string;
      jobId?: string;
    };

    const body = await authorizeMatchScope(actor, requestedScope);
    await enforceApiLimit(actor, "matching", 30, 60);
    const supabase = getAdminClient();

    let studentsQuery = supabase.from("student_profiles").select(`
      id,
      user_id,
      headline,
      desired_area,
      location,
      seniority,
      work_model,
      expected_salary,
      preferred_regions,
      academic_education,
      professional_experience,
      languages,
      spoken_languages,
      written_languages,
      tools,
      soft_skills,
      career_goals,
      preferred_opportunity_type,
      role_title,
      role_family,
      skills_normalized,
      tools_normalized,
      soft_skills_normalized,
      regions,
      salary_min,
      salary_max,
      ai_match_keywords,
      talent_type
    `);

    if (body.studentId) {
      studentsQuery = studentsQuery.eq("id", body.studentId);
    }

    let jobsQuery = supabase
      .from("jobs")
      .select(`
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
        role_title,
        role_family,
        regions,
        ai_match_keywords
      `)
      .eq("is_active", true);

    if (body.jobId) {
      jobsQuery = jobsQuery.eq("id", body.jobId);
    }

    const [
      { data: students, error: studentsError },
      { data: jobs, error: jobsError },
    ] = await Promise.all([studentsQuery, jobsQuery]);

    if (studentsError) {
      return NextResponse.json(
        { error: studentsError.message },
        { status: 500 }
      );
    }

    if (jobsError) {
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    const matches = [];

    for (const student of (students || []) as StudentProfile[]) {
      for (const job of (jobs || []) as Job[]) {
        const result = calculateMatch(student, job);

        matches.push({
          student_id: student.id,
          job_id: job.id,
          match_score: result.matchScore,
          skills_score: result.skillsScore,
          role_score: result.roleScore,
          seniority_score: result.seniorityScore,
          location_score: result.locationScore,
          work_model_score: result.workModelScore,
          salary_score: result.salaryScore,
          education_language_score: result.educationLanguageScore,
          opportunity_type_score: result.opportunityTypeScore,
          match_category: result.matchCategory,
          is_relevant: result.isRelevant,
          strengths: result.strengths,
          gaps: result.gaps,
          matching_skills: result.matchingSkills,
          missing_skills: result.missingSkills,
          ai_recommendations: result.aiRecommendations,
          ai_reason: result.aiReason,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (matches.length > 0) {
      const { error: upsertError } = await supabase
        .from("ai_matches")
        .upsert(matches, {
          onConflict: "student_id,job_id",
        });

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      matches_generated: matches.length,
    });
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error("Erro ao gerar matches:", error);

    return NextResponse.json(
      {
        error: "Erro ao gerar matches.",
        details:
          error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}