import { processAcademyEmails } from "@/lib/academy/email-worker";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Tarefa não configurada." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const result = await processAcademyEmails();
    return Response.json(result, { status: result.configured ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Falha no processamento dos emails da Academy." }, { status: 503 }); }
}
