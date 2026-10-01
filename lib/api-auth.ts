import { normalizeLocale, type Locale } from "@/lib/i18n/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type Role = "student" | "company" | "admin";
export type ApiActor = { id: string; role: Role; client: SupabaseClient; locale?: Locale };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function enforceApiLimit(actor: ApiActor, operation: string, limit: number, seconds = 900) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(503, "Serviço temporariamente indisponível.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.rpc("consume_api_limit", {
    p_user_id: actor.id, p_operation: operation, p_limit: limit, p_seconds: seconds,
  });
  if (error?.code === "P0001") throw new ApiError(429, "Atingiste o limite de pedidos. Tenta novamente mais tarde.");
  if (error) throw new ApiError(503, "Não foi possível verificar o limite de utilização.");
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

// Validate the token with Auth; never trust browser state or user_metadata roles.
export async function requireActor(request: Request, roles?: Role[]): Promise<ApiActor> {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  if (!match) throw new ApiError(401, "Inicia sessão para continuar.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiError(503, "Autenticação indisponível.");
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user || data.user.is_anonymous) {
    throw new ApiError(401, "Sessão inválida ou expirada.");
  }
  const { data: profile, error: profileError } = await client
    .from("profiles").select("role, locale").eq("id", data.user.id).single();
  if (profileError || !profile || !["student", "company", "admin"].includes(profile.role)) {
    throw new ApiError(403, "Conta sem permissões para esta operação.");
  }
  if (roles && !roles.includes(profile.role)) {
    throw new ApiError(403, "Não tens permissões para esta operação.");
  }
  return { id: data.user.id, role: profile.role as Role, client, locale: normalizeLocale(profile.locale) };
}

export function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, `${label} inválido.`);
  }
}

export async function requireOwnedJob(actor: ApiActor, jobId: unknown) {
  requireUuid(jobId, "ID da vaga");
  if (actor.role === "admin") return;
  if (actor.role !== "company") throw new ApiError(403, "Operação reservada a empresas.");
  const { data: company, error: companyError } = await actor.client
    .from("company_profiles").select("id").eq("user_id", actor.id).single();
  if (companyError || !company) throw new ApiError(403, "Perfil empresarial indisponível.");
  const { data: job, error } = await actor.client.from("jobs")
    .select("id").eq("id", jobId).eq("company_id", company.id).maybeSingle();
  if (error || !job) throw new ApiError(403, "Não tens acesso a esta vaga.");
}

export async function authorizeMatchScope(actor: ApiActor, body: { studentId?: string; jobId?: string }) {
  if (body.studentId !== undefined) requireUuid(body.studentId, "ID do candidato");
  if (body.jobId !== undefined) requireUuid(body.jobId, "ID da vaga");
  if (!body.studentId && !body.jobId) throw new ApiError(400, "Indica uma vaga ou um candidato.");
  if (actor.role === "admin") return body;
  if (actor.role === "company") {
    await requireOwnedJob(actor, body.jobId);
    return body;
  }
  const { data: student, error } = await actor.client.from("student_profiles")
    .select("id").eq("user_id", actor.id).single();
  if (error || !student || (body.studentId && student.id !== body.studentId)) {
    throw new ApiError(403, "Não tens acesso a este perfil.");
  }
  // Even a job-only request from a candidate must remain scoped to that candidate.
  return { ...body, studentId: student.id as string };
}
