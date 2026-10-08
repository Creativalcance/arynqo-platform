import { apiErrorResponse } from "@/lib/api-auth";
import { draft, scan } from "@/lib/social-radar/service";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ error: "Tarefa não configurada." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    // Alternate discovery and drafting so every execution stays within its deadline.
    const kind = Math.floor(Date.now() / 300000) % 2 === 0 ? "scan" : "draft";
    return Response.json(
      { kind, result: await (kind === "scan" ? scan() : draft()) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return (
      apiErrorResponse(error) ||
      Response.json({ error: "Falha no Radar." }, { status: 503 })
    );
  }
}
