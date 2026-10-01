import { localeNames } from "@/lib/i18n/config";
import { requireActor, enforceApiLimit, apiErrorResponse } from "@/lib/api-auth";
import { NextResponse } from "next/server";

type RequestBody = {
  title?: string;
  description?: string;
  area?: string;
  location?: string;
  workMode?: string;
  contractType?: string;
};

export async function POST(request: Request) {
  try {
    const actor = await requireActor(request, ["company", "admin"]);
    await enforceApiLimit(actor, "ai", 10);
    const body = (await request.json()) as RequestBody;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OPENAI_API_KEY não configurada.",
        },
        {
          status: 500,
        }
      );
    }

    const prompt = `
És um especialista sénior em recrutamento, RH, talent acquisition e desenho de vagas.

Analisa a vaga abaixo e devolve APENAS JSON válido.

DADOS DA VAGA:

Título:
${body.title || ""}

Descrição atual:
${body.description || ""}

Área:
${body.area || ""}

Localização:
${body.location || ""}

Modelo de trabalho:
${body.workMode || ""}

Tipo de contrato:
${body.contractType || ""}

OBJETIVO:
Transformar esta vaga num briefing profissional de recrutamento, claro, estruturado e útil para matching inteligente.

REGRAS:
- Responder apenas JSON válido.
- Não usar markdown.
- Não inventar informação impossível.
- Escrever no idioma ${localeNames[actor.locale || "pt"]}. Manter as chaves JSON e os códigos de classificação inalterados.
- Ser profissional, claro e premium.
- As skills devem ser curtas e normalizadas.
- As perguntas de triagem devem ajudar a avaliar candidatos.
- Os critérios de avaliação devem ser objetivos.

FORMATO EXATO:
{
  "improved_description": "",
  "ai_summary": "",
  "required_skills": [],
  "preferred_skills": [],
  "seniority": "",
  "screening_questions": [],
  "evaluation_criteria": [],
  "candidate_pitch": "",
  "ai_recruiter_notes": ""
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || "Erro ao gerar análise IA da vaga.",
        },
        {
          status: response.status,
        }
      );
    }

    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "{}";

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "A IA devolveu JSON inválido.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    return NextResponse.json(
      {
        error: "Erro inesperado ao processar a vaga.",
      },
      {
        status: 500,
      }
    );
  }
}