import { localeNames } from "@/lib/i18n/config";
import { requireActor, enforceApiLimit, apiErrorResponse } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { scheduleAcademyEmails } from "@/lib/academy/email-after";

export const runtime = "nodejs";
export const maxDuration = 300;

type AcademyPostAIResponse = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  audience: "Candidatos" | "Empresas" | "Todos";
  reading_time: string;
  trend_topic: string;
  seo_title: string;
  seo_description: string;
};

type RequestBody = {
  topic?: string;
  category?: string;
  audience?: "Candidatos" | "Empresas" | "Todos";
  generateFromTrend?: boolean;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const trendTopics = [
  "Como criar um CV preparado para sistemas de recrutamento com IA",
  "Erros comuns em candidaturas online",
  "Como preparar uma entrevista de emprego em 2026",
  "Que skills digitais são mais valorizadas pelas empresas",
  "Como melhorar o perfil profissional antes de te candidatares",
  "Como escrever uma boa apresentação profissional",
  "Como responder a perguntas de triagem numa candidatura",
  "Como as empresas devem escrever vagas mais claras",
  "Como avaliar candidatos de forma mais objetiva",
  "O impacto da IA no recrutamento e no matching de talento",
];

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

function sanitizeJsonText(text: string) {
  return text
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getRandomTrendTopic() {
  return trendTopics[Math.floor(Math.random() * trendTopics.length)];
}

function normalizePost(
  value: Partial<AcademyPostAIResponse>,
  fallbackTopic: string,
  fallbackCategory: string,
  fallbackAudience: "Candidatos" | "Empresas" | "Todos"
): AcademyPostAIResponse {
  const title = value.title?.trim() || fallbackTopic;
  const slug = normalizeSlug(value.slug || title);

  return {
    title,
    slug,
    excerpt:
      value.excerpt?.trim() ||
      "Artigo prático da Arynqo Academy sobre carreira, candidaturas e recrutamento inteligente.",
    content: value.content?.trim() || "",
    category: value.category?.trim() || fallbackCategory,
    audience: value.audience || fallbackAudience,
    reading_time: value.reading_time?.trim() || "6 min",
    trend_topic: value.trend_topic?.trim() || fallbackTopic,
    seo_title: value.seo_title?.trim() || `${title} | Arynqo Academy`,
    seo_description:
      value.seo_description?.trim() ||
      "Guia prático da Arynqo Academy para melhorar candidaturas, perfis profissionais e processos de recrutamento.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request, ["admin"]);
    await enforceApiLimit(actor, "ai", 10);
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está configurada." },
        { status: 500 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;

    const topic =
      body.generateFromTrend || !body.topic?.trim()
        ? getRandomTrendTopic()
        : body.topic.trim();

    const category = body.category || "Carreira";
    const audience = body.audience || "Candidatos";

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
És editor sénior da Arynqo Academy, uma área editorial sobre carreira, candidaturas, CV, entrevistas, empregabilidade, matching inteligente e recrutamento.

Deves escrever no idioma ${localeNames[actor.locale || "pt"]}, com tom claro, profissional, útil e acessível.

Devolve APENAS JSON válido com esta estrutura:

{
  "title": string,
  "slug": string,
  "excerpt": string,
  "content": string,
  "category": string,
  "audience": "Candidatos" | "Empresas" | "Todos",
  "reading_time": string,
  "trend_topic": string,
  "seo_title": string,
  "seo_description": string
}

Regras:
- Não devolvas markdown fora do JSON.
- O campo content pode usar markdown simples.
- O artigo deve ter entre 900 e 1300 palavras.
- Usar títulos com "##".
- Usar listas com "-".
- Dar exemplos práticos.
- Evitar promessas exageradas.
- Evitar inventar estatísticas.
- O artigo deve ser útil para a Arynqo Academy.
- O slug deve estar em minúsculas, sem acentos, separado por hífen.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({
            topic,
            category,
            audience,
            objective:
              "Criar um artigo educativo, prático e otimizado para SEO para a Arynqo Academy.",
          }),
        },
      ],
    });

    const cleanText = sanitizeJsonText(
      response.choices[0].message.content || "{}"
    );

    const parsedData = JSON.parse(cleanText) as Partial<AcademyPostAIResponse>;

    const post = normalizePost(parsedData, topic, category, audience);

    if (!post.content) {
      return NextResponse.json(
        { error: "A IA não devolveu conteúdo suficiente para o artigo." },
        { status: 500 }
      );
    }

    const supabase = getAdminClient();

    const { data: existingPost } = await supabase
      .from("academy_posts")
      .select("id")
      .eq("slug", post.slug)
      .maybeSingle();

    const finalSlug = existingPost?.id
      ? `${post.slug}-${Date.now()}`
      : post.slug;

    const { data, error } = await supabase
      .from("academy_posts")
      .insert({
        title: post.title,
        slug: finalSlug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        audience: post.audience,
        reading_time: post.reading_time,
        featured: false,
        status: "draft",
        content_locale: actor.locale || "pt",
        source_type: body.generateFromTrend ? "trend_ai" : "ai",
        trend_topic: post.trend_topic,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        published_at: null,
      })
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        content,
        category,
        audience,
        reading_time,
        featured,
        status,
        source_type,
        trend_topic,
        seo_title,
        seo_description,
        published_at,
        created_at
      `
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Não foi possível guardar o artigo." },
        { status: 500 }
      );
    }

    scheduleAcademyEmails();
    return NextResponse.json({
      success: true,
      post: data,
    });
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error("Erro ao gerar artigo da Academia:", error);

    return NextResponse.json(
      {
        error: "Erro ao gerar artigo da Academia com IA.",
        details:
          error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
