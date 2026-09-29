import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Retire the legacy destructive GET. Existing matches must never be erased by navigation.
export async function GET() {
  return NextResponse.json(
    { error: "Este endpoint foi descontinuado. Usa a geração autenticada de matches." },
    { status: 410 }
  );
}
