import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type ImprovedProfileResponse = {
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

function getFallbackResponse(): ImprovedProfileResponse {
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

function normalizeResponse(value: Partial<ImprovedProfileResponse>) {
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
    ai_profile_score:
      typeof value.ai_profile_score === "number" ? value.ai_profile_score : 0,
    ai_employability_score:
      typeof value.ai_employability_score === "number"
        ? value.ai_employability_score
        : 0,
    salary_min: typeof value.salary_min === "number" ? value.salary_min : null,
    salary_max: typeof value.salary_max === "number" ? value.salary_max : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está configurada." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
És um especialista sénior em recrutamento, carreira, CV writing, talent intelligence e matching profissional.

Vais receber os dados atuais de um candidato.
Deves melhorar TODOS os campos e devolver APENAS JSON válido.

O JSON deve ter exatamente estes campos:
{
  "headline": string,
  "bio": string,
  "main_role": string,
  "seniority": string,
  "work_model": string,
  "expected_salary": string,
  "preferred_regions": string,
  "academic_education": string,
  "professional_training": string,
  "professional_experience": string,
  "spoken_languages": string,
  "written_languages": string,
  "languages": string,
  "soft_skills": string,
  "tools": string,
  "career_goals": string,
  "preferred_opportunity_type": string,
  "ai_summary": string,
  "ai_profile_score": number,
  "ai_employability_score": number,
  "role_title": string,
  "role_family": string,
  "skills_normalized": string[],
  "tools_normalized": string[],
  "soft_skills_normalized": string[],
  "regions": string[],
  "salary_min": number | null,
  "salary_max": number | null,
  "ai_match_keywords": string[],
  "skills": string[]
}

Regras:
- Usa português de Portugal.
- Não devolvas markdown.
- Não inventes empresas, cursos ou datas específicas se não existirem.
- Podes melhorar redação, clareza, estrutura e posicionamento.
- Preenche campos vazios com inferência prudente.
- "role_family" deve ser uma área profissional curta.
- "skills_normalized", "tools_normalized", "soft_skills_normalized" e "ai_match_keywords" devem ser listas limpas para matching.
- "seniority" deve ser: Estudante, Júnior, Pleno, Sénior ou Direção.
- "work_model" deve ser: presential, hybrid ou remote.
- "ai_profile_score" avalia completude do perfil de 0 a 100.
- "ai_employability_score" avalia atratividade profissional de 0 a 100.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ],
    });

    const cleanText = sanitizeJsonText(response.choices[0].message.content || "{}");
    const parsed = normalizeResponse(JSON.parse(cleanText));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Erro ao melhorar perfil:", error);

    return NextResponse.json(
      { error: "Erro ao melhorar perfil com IA." },
      { status: 500 }
    );
  }
}