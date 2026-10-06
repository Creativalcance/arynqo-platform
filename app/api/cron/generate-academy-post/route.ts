import { NextRequest, NextResponse } from "next/server";
import { runAcademyAutomation } from "@/lib/academy/service";
import { scheduleAcademyEmails } from "@/lib/academy/email-after";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "CRON_SECRET não está configurado." },
      { status: 503 },
    );
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: "Pedido não autorizado." },
      { status: 401 },
    );
  try {
    const result = await runAcademyAutomation();
    scheduleAcademyEmails();
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível executar a automação da Academy." },
      { status: 503 },
    );
  }
}
