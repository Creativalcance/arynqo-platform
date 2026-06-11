import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

const weeklyTopics = [
  {
    topic: "Como criar um CV preparado para sistemas de recrutamento com IA",
    category: "CV e Perfil",
    audience: "Candidatos" as const,
  },
  {
    topic: "Erros comuns em candidaturas online e como evitá-los",
    category: "Candidaturas",
    audience: "Candidatos" as const,
  },
  {
    topic: "Como preparar uma entrevista de emprego com perguntas práticas",
    category: "Entrevistas",
    audience: "Candidatos" as const,
  },
  {
    topic: "Que skills digitais são mais valorizadas pelas empresas",
    category: "Skills",
    audience: "Candidatos" as const,
  },
  {
    topic: "Como melhorar o perfil profissional antes de enviar candidaturas",
    category: "CV e Perfil",
    audience: "Candidatos" as const,
  },
  {
    topic: "Como responder a perguntas de triagem numa candidatura",
    category: "Candidaturas",
    audience: "Candidatos" as const,
  },
  {
    topic: "Como as empresas devem escrever vagas mais claras e atrativas",
    category: "Empresas e Recrutamento",
    audience: "Empresas" as const,
  },
  {
    topic: "Como avaliar candidatos de forma mais objetiva",
    category: "Empresas e Recrutamento",
    audience: "Empresas" as const,
  },
  {
    topic: "O impacto da IA no recrutamento e no matching de talento",
    category: "IA e Matching",
    audience: "Todos" as const,
  },
  {
    topic: "Como encontrar o primeiro emprego depois da formação",
    category: "Primeiro Emprego",
    audience: "Candidatos" as const,
  },
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

function getWeeklyTopic() {
  const currentWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const index = currentWeek % weeklyTopics.length;

  return weeklyTopics[index];
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

export async function GET(request: NextRequest) {
  try {
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET não está configurado." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Pedido não autorizado." },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não está configurada." },
        { status: 500 }
      );
    }

    const supabase = getAdminClient();
    const weeklyTopic = getWeeklyTopic();

    const currentWeekKey = new Date().toISOString().slice(0, 10);

    const { data: existingDraft } = await supabase
      .from("academy_posts")
      .select("id, title, created_at")
      .eq("source_type", "trend_ai")
      .gte(
        "created_at",
        new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
      )
      .maybeSingle();

    if (existingDraft) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Já existe um artigo automático gerado nos últimos 7 dias.",
        existing_post: existingDraft,
      });
    }

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

Deves escrever em português de Portugal, com tom claro, profissional, útil e acessível.

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
- Evitar linguagem demasiado genérica.
- O artigo deve ser útil para a Arynqo Academy.
- O slug deve estar em minúsculas, sem acentos, separado por hífen.
          `.trim(),
        },
        {
          role: "user",
          content: JSON.stringify({
            week: currentWeekKey,
            topic: weeklyTopic.topic,
            category: weeklyTopic.category,
            audience: weeklyTopic.audience,
            objective:
              "Criar um artigo semanal educativo, prático e otimizado para SEO para a Arynqo Academy. O artigo deve ficar como rascunho para revisão humana.",
          }),
        },
      ],
    });

    const cleanText = sanitizeJsonText(
      response.choices[0].message.content || "{}"
    );

    const parsedData = JSON.parse(cleanText) as Partial<AcademyPostAIResponse>;

    const post = normalizePost(
      parsedData,
      weeklyTopic.topic,
      weeklyTopic.category,
      weeklyTopic.audience
    );

    if (!post.content) {
      return NextResponse.json(
        { error: "A IA não devolveu conteúdo suficiente para o artigo." },
        { status: 500 }
      );
    }

    const { data: existingSlug } = await supabase
      .from("academy_posts")
      .select("id")
      .eq("slug", post.slug)
      .maybeSingle();

    const finalSlug = existingSlug?.id
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
        source_type: "trend_ai",
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
        category,
        audience,
        reading_time,
        status,
        source_type,
        trend_topic,
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

    return NextResponse.json({
      success: true,
      skipped: false,
      post: data,
    });
  } catch (error) {
    console.error("Erro no cron da Academia:", error);

    return NextResponse.json(
      {
        error: "Erro ao gerar artigo semanal da Academia.",
        details:
          error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}