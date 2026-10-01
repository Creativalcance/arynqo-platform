import { localeNames } from "@/lib/i18n/config";
import { requireActor, enforceApiLimit, requireOwnedJob, apiErrorResponse } from "@/lib/api-auth";
import { POST as generateMatches } from "@/app/api/ai/generate-matches/route";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type StructuredJobResponse = {
  role_title: string;
  role_family: string;
  specializations: string[];
  required_skills: string[];
  preferred_skills: string[];
  languages: string[];
  education_requirements: string;
  experience_requirements: string;
  regions: string[];
  salary_min: number | null;
  salary_max: number | null;
  ai_summary: string;
  ai_match_keywords: string[];
};

type StructureJobRequest = {
  jobId?: string;
  title?: string;
  description?: string;
  area?: string | null;
  specializations?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  location?: string | null;
  work_model?: string | null;
  opportunity_type?: string | null;
  seniority?: string | null;
  languages?: string[];
  salary_range?: string | null;
  education_requirements?: string | null;
  experience_requirements?: string | null;
  screening_questions?: string[];
  evaluation_criteria?: string[];
  candidate_pitch?: string | null;
  ai_summary?: string | null;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Credenciais Supabase admin em falta.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getFallback(): StructuredJobResponse {
  return {
    role_title: "",
    role_family: "",
    specializations: [],
    required_skills: [],
    preferred_skills: [],
    languages: [],
    education_requirements: "",
    experience_requirements: "",
    regions: [],
    salary_min: null,
    salary_max: null,
    ai_summary: "",
    ai_match_keywords: [],
  };
}

function sanitizeJsonText(text: string) {
  return text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function parseSalaryRange(value: string | null | undefined) {
  if (!value) {
    return {
      salary_min: null,
      salary_max: null,
    };
  }

  const numbers = value.match(/\d+(?:[.,]\d+)?/g);

  if (!numbers || numbers.length === 0) {
    return {
      salary_min: null,
      salary_max: null,
    };
  }

  const parsedNumbers = numbers
    .map((number) => Number(number.replace(",", ".")))
    .filter((number) => !Number.isNaN(number));

  if (parsedNumbers.length === 0) {
    return {
      salary_min: null,
      salary_max: null,
    };
  }

  if (parsedNumbers.length === 1) {
    return {
      salary_min: parsedNumbers[0],
      salary_max: parsedNumbers[0],
    };
  }

  return {
    salary_min: Math.min(...parsedNumbers),
    salary_max: Math.max(...parsedNumbers),
  };
}

function mergeArrays(primary: string[], fallback: string[]) {
  const values = [...primary, ...fallback]
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(
    new Map(values.map((item) => [item.toLowerCase(), item])).values()
  );
}

function normalizeResponse(
  value: Partial<StructuredJobResponse>,
  body: StructureJobRequest
): StructuredJobResponse {
  const fallbackSalary = parseSalaryRange(body.salary_range);

  return {
    role_title: normalizeString(value.role_title),
    role_family: normalizeString(value.role_family),
    specializations: mergeArrays(
      normalizeArray(value.specializations),
      body.specializations || []
    ),
    required_skills: mergeArrays(
      normalizeArray(value.required_skills),
      body.required_skills || []
    ),
    preferred_skills: mergeArrays(
      normalizeArray(value.preferred_skills),
      body.preferred_skills || []
    ),
    languages: mergeArrays(normalizeArray(value.languages), body.languages || []),
    education_requirements:
      normalizeString(value.education_requirements) ||
      normalizeString(body.education_requirements),
    experience_requirements:
      normalizeString(value.experience_requirements) ||
      normalizeString(body.experience_requirements),
    regions: mergeArrays(normalizeArray(value.regions), [
      body.location || "",
    ]),
    salary_min: normalizeNumber(value.salary_min) ?? fallbackSalary.salary_min,
    salary_max: normalizeNumber(value.salary_max) ?? fallbackSalary.salary_max,
    ai_summary:
      normalizeString(value.ai_summary) || normalizeString(body.ai_summary),
    ai_match_keywords: normalizeArray(value.ai_match_keywords),
  };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request, ["company", "admin"]);
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está configurada." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as StructureJobRequest;

    if (!body.jobId) {
      return NextResponse.json(
        { error: "ID da vaga em falta." },
        { status: 400 }
      );
    }

    await requireOwnedJob(actor, body.jobId);
    await enforceApiLimit(actor, "ai", 10);
    const fallback = getFallback();

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
És um especialista sénior em recrutamento, arquitetura de funções, talent intelligence e matching profissional.

Vais receber uma vaga e deves estruturar os seus dados para matching IA entre vaga e candidato.

Devolve APENAS JSON válido com estes campos:

{
  "role_title": string,
  "role_family": string,
  "specializations": string[],
  "required_skills": string[],
  "preferred_skills": string[],
  "languages": string[],
  "education_requirements": string,
  "experience_requirements": string,
  "regions": string[],
  "salary_min": number | null,
  "salary_max": number | null,
  "ai_summary": string,
  "ai_match_keywords": string[]
}

Regras:
- Usa o idioma ${localeNames[actor.locale || "pt"]}. Mantém as chaves JSON e os códigos de classificação inalterados.
- Não devolvas markdown.
- Não devolvas texto fora do JSON.
- "role_title" deve ser o nome normalizado da função.
- "role_family" deve ser uma família profissional curta, alinhada com a área da vaga.
- "specializations" deve conter áreas específicas relevantes para a função.
- "required_skills" deve conter competências obrigatórias para desempenhar a função.
- "preferred_skills" deve conter competências valorizadas, mas não obrigatórias.
- "languages" deve conter idiomas relevantes, se existirem.
- "education_requirements" deve resumir a formação necessária.
- "experience_requirements" deve resumir a experiência necessária.
- "regions" deve conter localizações, cidades, regiões ou países relevantes.
- "salary_min" e "salary_max" devem ser números quando for possível inferir salário.
- "ai_summary" deve ser um resumo curto, claro e útil para matching.
- "ai_match_keywords" deve conter palavras-chave úteis para comparar com perfis de candidatos.
- Não inventes requisitos exagerados.
- Se um campo não tiver informação suficiente, devolve array vazio, string vazia ou null.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({
            title: body.title,
            description: body.description,
            area: body.area,
            specializations: body.specializations,
            required_skills: body.required_skills,
            preferred_skills: body.preferred_skills,
            location: body.location,
            work_model: body.work_model,
            opportunity_type: body.opportunity_type,
            seniority: body.seniority,
            languages: body.languages,
            salary_range: body.salary_range,
            education_requirements: body.education_requirements,
            experience_requirements: body.experience_requirements,
            screening_questions: body.screening_questions,
            evaluation_criteria: body.evaluation_criteria,
            candidate_pitch: body.candidate_pitch,
            ai_summary: body.ai_summary,
          }),
        },
      ],
    });

    const cleanText = sanitizeJsonText(
      response.choices[0]?.message?.content || "{}"
    );

    let parsedResponse: Partial<StructuredJobResponse> = fallback;

    try {
      parsedResponse = JSON.parse(cleanText) as Partial<StructuredJobResponse>;
    } catch {
      parsedResponse = fallback;
    }

    const structuredJob = normalizeResponse(parsedResponse, body);

    const supabase = getAdminClient();

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        role_title: structuredJob.role_title,
        role_family: structuredJob.role_family,
        specializations: structuredJob.specializations,
        required_skills: structuredJob.required_skills,
        preferred_skills: structuredJob.preferred_skills,
        languages: structuredJob.languages,
        education_requirements: structuredJob.education_requirements,
        experience_requirements: structuredJob.experience_requirements,
        regions: structuredJob.regions,
        salary_min: structuredJob.salary_min,
        salary_max: structuredJob.salary_max,
        ai_summary: structuredJob.ai_summary,
        ai_match_keywords: structuredJob.ai_match_keywords,
      })
      .eq("id", body.jobId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Invoke the shared handler directly; do not construct a self-request from Host.
    const matchResponse = await generateMatches(new NextRequest(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("authorization") || "",
      },
      body: JSON.stringify({ jobId: body.jobId }),
    }));

    return NextResponse.json({
      success: true,
      job: structuredJob,
      matching_updated: matchResponse.ok,
    });
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error("Erro ao estruturar vaga:", error);

    return NextResponse.json(
      { error: "Erro ao estruturar vaga com IA." },
      { status: 500 }
    );
  }
}