import { NextResponse } from "next/server";

type RequestBody = {
  companyName?: string;
  websiteUrl?: string;
  currentDescription?: string;
  location?: string;
  mode: "description" | "contacts";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500 }
      );
    }

    const prompt =
      body.mode === "description"
        ? `
Cria uma descrição institucional profissional para uma empresa na plataforma ARYNQO.

Dados disponíveis:
Nome: ${body.companyName || "Não indicado"}
Website: ${body.websiteUrl || "Não indicado"}
Localização: ${body.location || "Não indicada"}
Descrição atual: ${body.currentDescription || "Não indicada"}

Regras:
- Escrever em português de Portugal.
- Tom profissional, moderno e credível.
- Não inventar dados concretos que não foram fornecidos.
- Não usar emojis.
- Máximo 900 caracteres.
- Texto corrido, sem bullets.
`
        : `
Com base nos dados abaixo, propõe uma estrutura limpa para contactos e morada da empresa.

Dados disponíveis:
Nome: ${body.companyName || "Não indicado"}
Website: ${body.websiteUrl || "Não indicado"}
Localização: ${body.location || "Não indicada"}

Regras:
- Responder apenas em JSON válido.
- Não inventar email ou telefone se não existirem dados.
- Usar campos vazios quando não houver informação.
- Campos obrigatórios:
{
  "contact_email": "",
  "contact_phone": "",
  "address": "",
  "postal_code": "",
  "city": "",
  "country": ""
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
        { error: data.error?.message || "Erro ao gerar conteúdo com IA." },
        { status: response.status }
      );
    }

    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "Erro inesperado ao gerar conteúdo." },
      { status: 500 }
    );
  }
}