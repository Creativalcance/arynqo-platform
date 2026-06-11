import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      jobId?: string;
      studentId?: string;
    };

    if (!body.jobId && !body.studentId) {
      return NextResponse.json(
        {
          error:
            "É necessário indicar jobId ou studentId para recalcular matches.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(`${request.nextUrl.origin}/api/ai/generate-matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: body.jobId,
        studentId: body.studentId,
      }),
    });

    const rawText = await response.text();

    let data: {
      success?: boolean;
      matches_generated?: number;
      error?: string;
    } = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      return NextResponse.json(
        {
          error: "A API de matching devolveu uma resposta inválida.",
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data.error || "Erro ao recalcular matches.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      matches_generated: data.matches_generated || 0,
    });
  } catch (error) {
    console.error("Erro ao recalcular matches:", error);

    return NextResponse.json(
      {
        error: "Erro ao recalcular matches.",
      },
      { status: 500 }
    );
  }
}