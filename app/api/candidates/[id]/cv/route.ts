import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireActor, requireUuid } from "@/lib/api-auth";
import { cvStorageLocation } from "@/lib/cv-storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    requireUuid(id, "ID do candidato");
    // Use caller RLS for both the profile and Storage. No service-role bypass.
    const { data: student, error } = await actor.client.from("student_profiles")
      .select("user_id,cv_url").eq("id", id).maybeSingle();
    if (error || !student) throw new ApiError(403, "Não tens acesso a este currículo.");
    if (!student.cv_url) throw new ApiError(404, "Currículo indisponível.");
    let location;
    try { location = cvStorageLocation(student.cv_url, student.user_id, process.env.NEXT_PUBLIC_SUPABASE_URL!); }
    catch { throw new ApiError(422, "Este currículo precisa de ser carregado novamente pelo candidato."); }
    const { data: file, error: downloadError } = await actor.client.storage.from(location.bucket).download(location.path);
    if (downloadError || !file) throw new ApiError(404, "Não foi possível obter o currículo.");
    if (file.size > 10485760) throw new ApiError(422, "O currículo excede o limite de tamanho.");
    const extension = location.path.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
    return new Response(file, { headers: {
      "Content-Type": extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="curriculo.${extension}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return apiErrorResponse(error) || NextResponse.json({ error: "Não foi possível obter o currículo." }, { status: 500 });
  }
}
