type MatchCategory =
  | "recommended"
  | "possible"
  | "low_compatibility"
  | "not_relevant";

export type StudentProfile = {
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
  student_skills?: Array<{ skills: { name: string } | Array<{ name: string }> | null }> | null;
};

export type Job = {
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

function normalize(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/_/g, " ")
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

const aliases: Record<string, string> = {
  "js": "javascript", "ts": "typescript", "react.js": "react", "reactjs": "react",
  "node.js": "nodejs", "node js": "nodejs", "recursos humanos": "recursos humanos",
  "project management": "gestao de projetos", "gestao de projectos": "gestao de projetos",
  "customer service": "atendimento ao cliente", "welding": "soldadura",
  "english": "ingles", "portuguese": "portugues", "french": "frances", "spanish": "espanhol",
};
function canonical(value: string) { const n = normalize(value); return aliases[n] || n; }
function evidenceMatches(candidate: string, requirement: string) {
  const c = canonical(candidate), r = canonical(requirement);
  if (!c || !r) return false;
  if (c === r) return true;
  // Whole phrases only: C is not CNC, Java is not JavaScript, and C++ is not C#.
  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escape(r)}($|[^a-z0-9+#])`).test(c);
}
function scoreOverlap(candidateValues: string[], jobValues: string[]) {
  const requirements = unique(jobValues.map(canonical));
  if (!requirements.length || !candidateValues.length) return 0;
  return Math.round(requirements.filter(r => candidateValues.some(c => evidenceMatches(c, r))).length / requirements.length * 100);
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
  if (!value || /anual|annual|ano|year|hora|hour|usd|gbp|\$|£/i.test(value)) return null;
  const clean = value.replace(/(\d)[. ](?=\d{3}(?:\D|$))/g, "$1");
  const values = (clean.match(/\d+(?:[.,]\d+)?/g) || []).map(v => Number(v.replace(",", ".")));
  return values.length ? Math.max(...values) : null;
}

function inferRoleFamily(values: Array<string | null | undefined>) {
  const families = [
    { family: "financeiro", keywords: ["financeiro", "financeira", "contabilidade", "contabilista", "financial", "accountant"] },
    { family: "saude", keywords: ["saude", "enfermagem", "enfermeiro", "medico", "fisioterapia"] },
    { family: "hotelaria", keywords: ["hotelaria", "hotel", "rececionista", "restauracao", "cozinheiro"] },
    { family: "educacao", keywords: ["educacao", "professor", "docente", "ensino"] },
    { family: "juridico", keywords: ["juridico", "advogado", "solicitador", "direito"] },
    { family: "design", keywords: ["design", "designer", "ux", "ui"] },
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
        if (evidenceMatches(text, normalize(keyword))) {
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

// Versioned deterministic evidence score. It is not a hiring probability.
export const MATCHING_VERSION = "evidence-v2";
export function calculateMatch(student: StudentProfile, job: Job): MatchResult {
  const declaredSkills = (student.student_skills || []).flatMap(row => Array.isArray(row.skills) ? row.skills.map(skill => skill.name) : row.skills ? [row.skills.name] : []);
  const studentSkills = unique([...normalizeArray(declaredSkills), ...normalizeArray(student.skills_normalized), ...normalizeArray(student.tools_normalized),
    ...normalizeArray(student.soft_skills_normalized), ...normalizeList([student.tools, student.soft_skills])]);
  const required = normalizeArray(job.required_skills), preferred = normalizeArray(job.preferred_skills), specializations = normalizeArray(job.specializations);
  const missingSkills = required.filter(r => !studentSkills.some(c => evidenceMatches(c, r)));
  const matchingSkills = unique([...required, ...preferred, ...specializations]).filter(r => studentSkills.some(c => evidenceMatches(c, r)));
  const parts = [{ requirements: required, weight: .6 }, { requirements: preferred, weight: .25 }, { requirements: specializations, weight: .15 }].filter(p => p.requirements.length);
  const skillsKnown = studentSkills.length > 0 && parts.length > 0;
  const skillsScore = skillsKnown ? Math.round(parts.reduce((sum, p) => sum + scoreOverlap(studentSkills, p.requirements) * p.weight, 0) / parts.reduce((sum, p) => sum + p.weight, 0)) : 0;
  const candidateFamily = inferRoleFamily([student.role_family, student.role_title, student.desired_area, student.headline]);
  const jobFamily = inferRoleFamily([job.role_family, job.role_title, job.title, job.area]);
  const sameFamily = !!candidateFamily && candidateFamily === jobFamily;
  const familyCompatible = areRoleFamiliesCompatible(candidateFamily, jobFamily);
  const candidateRoles = normalizeList([student.role_title, student.headline, student.desired_area]);
  const jobRole = normalize(job.role_title || job.title);
  const exactRole = candidateRoles.some(c => evidenceMatches(c, jobRole));
  const roleKnown = !!(candidateFamily && jobFamily) || (!!candidateRoles.length && !!jobRole);
  const roleScore = exactRole ? 100 : sameFamily ? 80 : familyCompatible ? 55 : 0;
  const seniorityKnown = !!student.seniority && !!job.seniority;
  const seniorityScore = seniorityKnown ? getSeniorityScore(student, job) : 0;
  const candidateRegions = unique([...normalizeArray(student.regions), ...normalizeList([student.location, student.preferred_regions])]);
  const jobRegions = unique([...normalizeArray(job.regions), ...normalizeList([job.location])]);
  const candidateModel = convertLegacyWorkMode(student.work_model), jobModel = convertLegacyWorkMode(job.work_model || job.work_mode);
  const remoteAligned = candidateModel === "remoto" && jobModel === "remoto";
  const locationKnown = remoteAligned || (candidateRegions.length > 0 && jobRegions.length > 0);
  const locationScore = remoteAligned ? 100 : locationKnown ? scoreOverlap(candidateRegions, jobRegions) : 0;
  const modelKnown = !!candidateModel && !!jobModel;
  const workModelScore = !modelKnown ? 0 : candidateModel === jobModel ? 100 : candidateModel === "hibrido" || jobModel === "hibrido" ? 75 : 0;
  const candidateSalary = student.salary_min || parseSalary(student.expected_salary);
  const jobSalary = job.salary_max || parseSalary(job.salary_range);
  const salaryKnown = !!candidateSalary && !!jobSalary;
  const salaryScore = salaryKnown ? getSalaryScore(student, job) : 0;
  const candidateLanguages = normalizeList([student.languages, student.spoken_languages, student.written_languages]);
  const jobLanguages = normalizeArray(job.languages);
  const languageKnown = candidateLanguages.length > 0 && jobLanguages.length > 0;
  const languageScore = languageKnown ? scoreOverlap(candidateLanguages, jobLanguages) : 0;
  const candidateEducation = normalizeList([student.academic_education, student.professional_experience]);
  const jobEducation = normalizeList([job.education_requirements, job.experience_requirements]);
  const educationKnown = candidateEducation.length > 0 && jobEducation.length > 0;
  const educationScore = educationKnown ? scoreOverlap(candidateEducation, jobEducation) : 0;
  const educationLanguageScore = Math.round((languageKnown ? languageScore * .45 : 0) + (educationKnown ? educationScore * .55 : 0));
  const opportunityKnown = !!student.preferred_opportunity_type && !!(job.opportunity_type || job.contract_type);
  const opportunityTypeScore = opportunityKnown && normalize(student.preferred_opportunity_type) === normalize(job.opportunity_type || job.contract_type) ? 100 : 0;
  const talentKnown = !!student.talent_type && !!(job.seniority || job.opportunity_type || job.contract_type);
  const criteria = [
    { label: "competências", score: skillsScore, weight: 35, known: skillsKnown },
    { label: "função", score: roleScore, weight: 25, known: roleKnown },
    { label: "senioridade", score: seniorityScore, weight: 8, known: seniorityKnown },
    { label: "localização", score: locationScore, weight: 7, known: locationKnown },
    { label: "modelo de trabalho", score: workModelScore, weight: 6, known: modelKnown },
    { label: "salário", score: salaryScore, weight: 5, known: salaryKnown },
    { label: "idiomas", score: languageScore, weight: 2.7, known: languageKnown },
    { label: "formação/experiência", score: educationScore, weight: 3.3, known: educationKnown },
    { label: "tipo de oportunidade", score: opportunityTypeScore, weight: 5, known: opportunityKnown },
    { label: "percurso profissional", score: talentKnown ? getTalentTypeScore(student, job) : 0, weight: 3, known: talentKnown },
  ];
  const availableWeight = criteria.filter(c => c.known).reduce((sum, c) => sum + c.weight, 0);
  const coverage = Math.round(availableWeight);
  const weighted = criteria.filter(c => c.known).reduce((sum, c) => sum + c.score * c.weight, 0);
  let matchScore = availableWeight ? Math.round(weighted / availableWeight) : 0;
  const insufficient = availableWeight < 70 || !skillsKnown || !roleKnown || !candidateFamily || !jobFamily || !required.length;
  const languageGap = jobLanguages.length > 0 && (!languageKnown || languageScore < 100);
  const reviewRequired = insufficient || missingSkills.length > 0 || languageGap || !sameFamily;
  const clearlyUnrelated = !!candidateFamily && !!jobFamily && !familyCompatible && skillsScore < 50 && !exactRole;
  if (clearlyUnrelated) matchScore = 0;
  else if (reviewRequired) matchScore = Math.min(matchScore, 64);
  if (skillsKnown && required.length && scoreOverlap(studentSkills, required) === 0) matchScore = Math.min(matchScore, 49);
  const matchCategory: MatchCategory = clearlyUnrelated ? "not_relevant" : matchScore >= 65 ? "recommended" : matchScore >= 50 ? "possible" : "low_compatibility";
  const gaps = criteria.filter(c => !c.known).map(c => `Informação insuficiente para avaliar ${c.label}.`);
  if (missingSkills.length) gaps.push(`Competências obrigatórias ainda não evidenciadas: ${missingSkills.join(", ")}.`);
  if (languageGap) gaps.push("Confirmar os idiomas exigidos pela vaga; a presença de um idioma não comprova o nível de fluência.");
  if (!sameFamily) gaps.push("Confirmar a adequação da função e as competências transferíveis com um recrutador.");
  const strengths = [];
  if (matchingSkills.length) strengths.push(`Competências coincidentes: ${matchingSkills.join(", ")}.`);
  if (sameFamily) strengths.push("Família profissional alinhada com a vaga.");
  const aiRecommendations = [reviewRequired ? "Requer validação humana antes de recomendar." : "Validar competências e experiência numa entrevista; esta pontuação não prevê o sucesso da contratação."];
  const aiReason = `Índice de compatibilidade: ${matchScore}/100. Cobertura de informação: ${coverage}/100. Método ${MATCHING_VERSION}. ${reviewRequired ? "Resultado limitado por dados em falta ou requisitos por confirmar." : "Resultado suportado pelos critérios disponíveis."} Não é uma probabilidade de contratação.`;
  return { matchScore, skillsScore, roleScore, seniorityScore, locationScore, workModelScore, salaryScore, educationLanguageScore, opportunityTypeScore,
    matchCategory, isRelevant: !clearlyUnrelated, strengths, gaps, aiReason, matchingSkills, missingSkills, aiRecommendations };
}
