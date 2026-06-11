import { NextResponse } from "next/server";

type RequestBody = {
  websiteUrl: string;
};

function normalizeUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }

  return url;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);

  return [...new Set(matches || [])];
}

function extractPhones(text: string) {
  const matches = text.match(
    /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?[\d\s.-]{6,}/g
  );

  return [...new Set(matches || [])]
    .map((phone) => phone.trim())
    .filter((phone) => phone.length >= 9);
}

function extractTitle(html: string) {
  const match = html.match(/<title>(.*?)<\/title>/i);

  return match?.[1]?.trim() || "";
}

function extractMetaDescription(html: string) {
  const match =
    html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
    );

  return match?.[1]?.trim() || "";
}

function extractLogo(html: string, baseUrl: string) {
  const logoMatch =
    html.match(/<img[^>]+src=["']([^"']*logo[^"']*)["']/i) ||
    html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

  if (!logoMatch?.[1]) {
    return "";
  }

  try {
    return new URL(logoMatch[1], baseUrl).toString();
  } catch {
    return "";
  }
}

async function fetchPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: {
        revalidate: 0,
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    return {
      url,
      html,
      text: stripHtml(html),
      title: extractTitle(html),
      description: extractMetaDescription(html),
      logoUrl: extractLogo(html, url),
      emails: extractEmails(html),
      phones: extractPhones(html),
    };
  } catch {
    return null;
  }
}

function buildCandidateUrls(normalizedUrl: string) {
  const base = new URL(normalizedUrl);
  const origin = base.origin;

  return [
    normalizedUrl,
    `${origin}/contactos`,
    `${origin}/contacto`,
    `${origin}/contacts`,
    `${origin}/contact`,
    `${origin}/sobre`,
    `${origin}/sobre-nos`,
    `${origin}/about`,
    `${origin}/about-us`,
  ];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.websiteUrl) {
      return NextResponse.json(
        { error: "Website não fornecido." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const normalizedUrl = normalizeUrl(body.websiteUrl);
    const candidateUrls = buildCandidateUrls(normalizedUrl);

    const pages = (
      await Promise.all(candidateUrls.map((url) => fetchPage(url)))
    ).filter(Boolean);

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "Não foi possível aceder ao website." },
        { status: 400 }
      );
    }

    const allEmails = [...new Set(pages.flatMap((page) => page?.emails || []))];
    const allPhones = [...new Set(pages.flatMap((page) => page?.phones || []))];

    const detectedLogo =
      pages.find((page) => page?.logoUrl)?.logoUrl || "";

    const websiteContent = pages
      .map((page) => {
        return `
URL:
${page?.url || ""}

Título:
${page?.title || ""}

Meta description:
${page?.description || ""}

Conteúdo:
${(page?.text || "").slice(0, 6000)}
`;
      })
      .join("\n\n---\n\n")
      .slice(0, 24000);

    const prompt = `
Analisa os dados abaixo de um website empresarial e devolve APENAS JSON válido.

Website principal:
${normalizedUrl}

Emails encontrados:
${allEmails.join(", ")}

Telefones encontrados:
${allPhones.join(", ")}

Conteúdo recolhido de várias páginas:
${websiteContent}

Objetivo:
Extrair dados reais da empresa, incluindo morada se existir no website.

Regras:
- Responder apenas JSON.
- Não usar markdown.
- Não inventar dados.
- Se não souberes, usa string vazia.
- A morada deve ser retirada do website se existir.
- O campo "address" deve conter rua/avenida/lugar/número, se existir.
- O campo "postal_code" deve conter apenas o código postal, se existir.
- O campo "city" deve conter cidade/localidade, se existir.
- O campo "country" deve conter país, se existir.
- O campo "location" deve ser uma versão curta, por exemplo "Coimbra, Portugal".
- Escolhe o email e telefone mais institucionais, evitando emails pessoais sempre que possível.

Formato obrigatório:
{
  "company_name": "",
  "description": "",
  "contact_email": "",
  "contact_phone": "",
  "address": "",
  "postal_code": "",
  "city": "",
  "country": "",
  "location": "",
  "website_url": "",
  "logo_url": "",
  "industry": ""
}
`;

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
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

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error:
            aiData.error?.message ||
            "Erro ao analisar website com IA.",
        },
        { status: aiResponse.status }
      );
    }

    const rawText =
      aiData.output_text ||
      aiData.output?.[0]?.content?.[0]?.text ||
      "{}";

    let parsed;

    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "A IA devolveu um formato inválido.",
        },
        { status: 500 }
      );
    }

    parsed.website_url = normalizedUrl;

    if (!parsed.logo_url && detectedLogo) {
      parsed.logo_url = detectedLogo;
    }

    if (!parsed.contact_email && allEmails.length > 0) {
      parsed.contact_email = allEmails[0];
    }

    if (!parsed.contact_phone && allPhones.length > 0) {
      parsed.contact_phone = allPhones[0];
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro inesperado ao analisar website." },
      { status: 500 }
    );
  }
}