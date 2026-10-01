import { localeNames } from "@/lib/i18n/config";
import { requireActor, enforceApiLimit, apiErrorResponse } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

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

type ParsedCVResponse = {
  headline: string;
  bio: string;
  main_role: string;
  seniority: string;
  work_model: string;
  expected_salary: string;
  preferred_regions: string;

  academic_education: string;
  professional_training: string;
  professional_experience: string;

  academic_education_items: AcademicEducationItem[];
  professional_training_items: ProfessionalTrainingItem[];
  professional_experience_items: ProfessionalExperienceItem[];

  spoken_languages: string;
  written_languages: string;
  languages: string;
  soft_skills: string;
  tools: string;
  career_goals: string;
  preferred_opportunity_type: string;
  ai_summary: string;
  ai_profile_score: number;
  ai_employability_score: number;
  role_title: string;
  role_family: string;
  skills_normalized: string[];
  tools_normalized: string[];
  soft_skills_normalized: string[];
  regions: string[];
  salary_min: number | null;
  salary_max: number | null;
  ai_match_keywords: string[];
  skills: string[];
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function createItemId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getFallbackResponse(): ParsedCVResponse {
  return {
    headline: "",
    bio: "",
    main_role: "",
    seniority: "",
    work_model: "",
    expected_salary: "",
    preferred_regions: "",

    academic_education: "",
    professional_training: "",
    professional_experience: "",

    academic_education_items: [],
    professional_training_items: [],
    professional_experience_items: [],

    spoken_languages: "",
    written_languages: "",
    languages: "",
    soft_skills: "",
    tools: "",
    career_goals: "",
    preferred_opportunity_type: "",
    ai_summary: "",
    ai_profile_score: 0,
    ai_employability_score: 0,
    role_title: "",
    role_family: "",
    skills_normalized: [],
    tools_normalized: [],
    soft_skills_normalized: [],
    regions: [],
    salary_min: null,
    salary_max: null,
    ai_match_keywords: [],
    skills: [],
  };
}

function sanitizeJsonText(text: string) {
  return text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeProfessionalExperienceItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    id:
      typeof item?.id === "string" && item.id
        ? item.id
        : createItemId(),
    role: typeof item?.role === "string" ? item.role : "",
    company: typeof item?.company === "string" ? item.company : "",
    start_date:
      typeof item?.start_date === "string" ? item.start_date : "",
    end_date: typeof item?.end_date === "string" ? item.end_date : "",
    description:
      typeof item?.description === "string" ? item.description : "",
  }));
}

function normalizeAcademicEducationItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    id:
      typeof item?.id === "string" && item.id
        ? item.id
        : createItemId(),
    degree: typeof item?.degree === "string" ? item.degree : "",
    institution:
      typeof item?.institution === "string" ? item.institution : "",
    start_date:
      typeof item?.start_date === "string" ? item.start_date : "",
    end_date: typeof item?.end_date === "string" ? item.end_date : "",
    description:
      typeof item?.description === "string" ? item.description : "",
  }));
}

function normalizeProfessionalTrainingItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    id:
      typeof item?.id === "string" && item.id
        ? item.id
        : createItemId(),
    title: typeof item?.title === "string" ? item.title : "",
    entity: typeof item?.entity === "string" ? item.entity : "",
    start_date:
      typeof item?.start_date === "string" ? item.start_date : "",
    end_date: typeof item?.end_date === "string" ? item.end_date : "",
    description:
      typeof item?.description === "string" ? item.description : "",
  }));
}

function normalizeParsedResponse(value: Partial<ParsedCVResponse>) {
  const fallback = getFallbackResponse();

  return {
    ...fallback,
    ...value,

    skills: Array.isArray(value.skills) ? value.skills : [],

    skills_normalized: Array.isArray(value.skills_normalized)
      ? value.skills_normalized
      : [],

    tools_normalized: Array.isArray(value.tools_normalized)
      ? value.tools_normalized
      : [],

    soft_skills_normalized: Array.isArray(value.soft_skills_normalized)
      ? value.soft_skills_normalized
      : [],

    regions: Array.isArray(value.regions) ? value.regions : [],

    ai_match_keywords: Array.isArray(value.ai_match_keywords)
      ? value.ai_match_keywords
      : [],

    academic_education_items: normalizeAcademicEducationItems(
      value.academic_education_items
    ),

    professional_training_items: normalizeProfessionalTrainingItems(
      value.professional_training_items
    ),

    professional_experience_items: normalizeProfessionalExperienceItems(
      value.professional_experience_items
    ),

    ai_profile_score:
      typeof value.ai_profile_score === "number"
        ? value.ai_profile_score
        : 0,

    ai_employability_score:
      typeof value.ai_employability_score === "number"
        ? value.ai_employability_score
        : 0,

    salary_min:
      typeof value.salary_min === "number" ? value.salary_min : null,

    salary_max:
      typeof value.salary_max === "number" ? value.salary_max : null,
  };
}

export async function POST(request: NextRequest) {
  let uploadedFileId = "";

  try {
    const actor = await requireActor(request, ["student", "admin"]);
    await enforceApiLimit(actor, "ai", 10);
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está configurada." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Ficheiro não encontrado." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "O currículo deve ter entre 1 byte e 10 MB." }, { status: 400 });
    }

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const isAllowed = allowedExtensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Formato não suportado. Usa PDF, DOC ou DOCX." },
        { status: 400 }
      );
    }

    const uploadedFile = await openai.files.create({
      file,
      purpose: "assistants",
    });

    uploadedFileId = uploadedFile.id;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `
És um especialista sénior em recrutamento, análise curricular, carreira, estruturação de CV e matching profissional.

Analisa o CV recebido e devolve APENAS JSON válido.

O JSON deve ter exatamente esta estrutura:

{
  "headline": "",
  "bio": "",
  "main_role": "",
  "seniority": "",
  "work_model": "",
  "expected_salary": "",
  "preferred_regions": "",

  "academic_education": "",
  "professional_training": "",
  "professional_experience": "",

  "academic_education_items": [
    {
      "id": "",
      "degree": "",
      "institution": "",
      "start_date": "",
      "end_date": "",
      "description": ""
    }
  ],

  "professional_training_items": [
    {
      "id": "",
      "title": "",
      "entity": "",
      "start_date": "",
      "end_date": "",
      "description": ""
    }
  ],

  "professional_experience_items": [
    {
      "id": "",
      "role": "",
      "company": "",
      "start_date": "",
      "end_date": "",
      "description": ""
    }
  ],

  "spoken_languages": "",
  "written_languages": "",
  "languages": "",
  "soft_skills": "",
  "tools": "",
  "career_goals": "",
  "preferred_opportunity_type": "",
  "ai_summary": "",
  "ai_profile_score": 0,
  "ai_employability_score": 0,
  "role_title": "",
  "role_family": "",
  "skills_normalized": [],
  "tools_normalized": [],
  "soft_skills_normalized": [],
  "regions": [],
  "salary_min": null,
  "salary_max": null,
  "ai_match_keywords": [],
  "skills": []
}

Regras gerais:
- Usa o idioma ${localeNames[actor.locale || "pt"]}. Mantém as chaves JSON e os códigos de classificação inalterados.
- Não devolvas markdown.
- Não devolvas texto fora do JSON.
- Preenche todos os campos.
- Se algum dado não existir, deixa string vazia, array vazio ou null.
- Não inventes empresas, instituições, datas ou cargos.
- Podes inferir apenas campos de perfil geral com prudência: headline, role_family, skills, tools, soft_skills e resumo.
- "seniority" deve ser: Estudante, Júnior, Pleno, Sénior ou Direção.
- "work_model" deve ser: Presencial, Híbrido, Remoto ou vazio.
- "preferred_opportunity_type" deve ser: Full-time, Part-time, Trabalho temporário, Estágio Curricular, Estágio Profissional, Freelance, Prestação de serviços, Trainee Program ou vazio.
- "role_family" deve ser uma área profissional curta, por exemplo: Marketing, Engenharia, Recursos Humanos, Software Development, Gestão, Finanças, Indústria, Logística.
- "skills_normalized", "tools_normalized", "soft_skills_normalized" e "ai_match_keywords" devem ser listas curtas, limpas e úteis para matching.
- "regions" deve conter regiões/localizações identificadas no CV ou pretendidas, se existirem.
- "salary_min" e "salary_max" devem ser números quando for possível inferir; caso contrário, null.

Regras para academic_education_items:
- Cada grau, curso, licenciatura, mestrado, MBA, pós-graduação académica ou formação académica deve ser um objeto separado.
- "degree" deve conter o curso/grau.
- "institution" deve conter a escola/universidade/instituição.
- "start_date" e "end_date" devem usar formatos curtos, por exemplo "2018", "2021" ou "".
- Se apenas houver um ano, coloca esse ano em "end_date" e deixa "start_date" vazio.
- Mantém também o campo antigo "academic_education" em texto corrido para compatibilidade.

Regras para professional_training_items:
- Cada certificação, curso, workshop, formação executiva, formação profissional ou competência pedagógica deve ser um objeto separado.
- "title" deve conter o nome da formação/certificação.
- "entity" deve conter a entidade formadora, se existir.
- "start_date" e "end_date" devem usar formatos curtos.
- Mantém também o campo antigo "professional_training" em texto corrido para compatibilidade.

Regras para professional_experience_items:
- Cada experiência profissional deve ser um objeto separado.
- "role" deve conter o cargo/função.
- "company" deve conter a empresa/organização.
- "start_date" e "end_date" devem usar formatos curtos, por exemplo "2024", "2022", "Presente" ou "".
- "description" deve resumir responsabilidades, resultados, áreas de atuação e impacto, sem repetir o cargo e a empresa.
- Mantém também o campo antigo "professional_experience" em texto corrido para compatibilidade.
              `.trim(),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analisa este CV e devolve o perfil completo normalizado e estruturado para matching.",
            },
            {
              type: "input_file",
              file_id: uploadedFile.id,
            },
          ],
        },
      ],
    });

    const cleanText = sanitizeJsonText(response.output_text || "{}");
    const parsed = normalizeParsedResponse(JSON.parse(cleanText));

    await openai.files.delete(uploadedFile.id);

    return NextResponse.json(parsed);
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error("Erro ao analisar CV:", error);

    if (uploadedFileId) {
      await openai.files.delete(uploadedFileId).catch(() => null);
    }

    return NextResponse.json(
      { error: "Erro ao analisar CV." },
      { status: 500 }
    );
  }
}