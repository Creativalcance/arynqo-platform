import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, requireUuid, type ApiActor } from "@/lib/api-auth";

export type NotificationEvent = {
  userId: string;
  title: string;
  message: string;
  relatedType: string;
  relatedId: string;
  relatedUrl: string;
  actionLabel: string;
  eventKey: string;
  channels: ("in_app" | "email")[];
};

// Client text, destinations and recipient IDs are deliberately ignored.
export async function resolveNotificationEvent(
  actor: ApiActor,
  admin: SupabaseClient,
  input: { relatedType?: unknown; relatedId?: unknown; relatedJobId?: unknown }
): Promise<NotificationEvent> {
  requireUuid(input.relatedId, "ID do evento");
  const relatedId = input.relatedId;
  const denied = () => { throw new ApiError(403, "Não tens acesso a este evento."); };
  const lookup = async (table: string, id: string, fields: string) => {
    const { data, error } = await admin.from(table).select(fields).eq("id", id).maybeSingle();
    if (error) throw new ApiError(503, "Não foi possível validar o evento.");
    if (!data) return denied();
    return data as unknown as Record<string, string>;
  };
  const event = (
    userId: string, title: string, message: string, relatedType: string,
    relatedUrl: string, actionLabel: string, state: string
  ): NotificationEvent => ({
    userId, title, message, relatedType, relatedId, relatedUrl, actionLabel,
    eventKey: `${relatedType}:${relatedId}:${userId}:${state}`,
    channels: ["in_app", "email"],
  });

  if (["application", "application_status"].includes(String(input.relatedType))) {
    const application = await lookup("applications", relatedId, "id,student_id,job_id,status");
    const student = await lookup("student_profiles", application.student_id, "id,user_id");
    const job = await lookup("jobs", application.job_id, "id,company_id,title");
    const company = await lookup("company_profiles", job.company_id, "id,user_id");
    if (actor.role === "student" && actor.id === student.user_id) {
      return event(company.user_id, "Nova candidatura recebida",
        `Recebeste uma nova candidatura para a vaga "${job.title}".`, "application",
        `/empresa/candidatos/${student.id}?jobId=${job.id}`, "Ver candidato", "created");
    }
    if (["company","admin"].includes(actor.role) && actor.id === company.user_id &&
        ["accepted", "rejected"].includes(application.status)) {
      const label = application.status === "accepted" ? "aceite" : "recusada";
      return event(student.user_id, `Candidatura ${label}`,
        `A tua candidatura à vaga "${job.title}" foi ${label}.`, "application",
        "/dashboard/candidaturas", "Ver candidaturas", application.status);
    }
    return denied();
  }

  if (["candidate_contact_request", "contact_request"].includes(String(input.relatedType))) {
    const contact = await lookup("candidate_contact_requests", relatedId, "id,student_id,job_id,company_id,status");
    const student = await lookup("student_profiles", contact.student_id, "id,user_id");
    const job = await lookup("jobs", contact.job_id, "id,company_id,title");
    const company = await lookup("company_profiles", contact.company_id, "id,user_id,company_name");
    if (job.company_id !== company.id) return denied();
    if (["company", "admin"].includes(actor.role) && actor.id === company.user_id && contact.status === "pending") {
      return event(student.user_id, "Pedido de contacto recebido",
        `A empresa ${company.company_name} quer contactar-te sobre a vaga "${job.title}".`,
        "candidate_contact_request", "/dashboard/notificacoes", "Responder ao pedido", "pending");
    }
    if (actor.role === "student" && actor.id === student.user_id &&
        ["accepted", "rejected"].includes(contact.status)) {
      const label = contact.status === "accepted" ? "aceite" : "recusado";
      return event(company.user_id, `Pedido de contacto ${label}`,
        `O candidato ${label === "aceite" ? "aceitou" : "recusou"} o pedido relativo à vaga "${job.title}".`,
        "candidate_contact_request",
        contact.status === "accepted" ? `/empresa/candidatos/${student.id}?jobId=${job.id}` : "/empresa/matches",
        "Ver pedido", contact.status);
    }
    return denied();
  }

  if (input.relatedType === "candidate_action") {
    requireUuid(input.relatedJobId, "ID da vaga");
    if (!["company","admin"].includes(actor.role)) return denied();
    const job = await lookup("jobs", input.relatedJobId, "id,company_id,title");
    const company = await lookup("company_profiles", job.company_id, "id,user_id,company_name");
    if (actor.id !== company.user_id) return denied();
    const { data: action, error } = await admin.from("company_candidate_actions")
      .select("id").eq("company_id", company.id).eq("student_id", relatedId)
      .eq("job_id", job.id).eq("action_type", "accepted").limit(1).maybeSingle();
    if (error) throw new ApiError(503, "Não foi possível validar o evento.");
    if (!action) return denied();
    const student = await lookup("student_profiles", relatedId, "id,user_id");
    const result = event(student.user_id, "Empresa interessada no teu perfil",
      `A empresa ${company.company_name} demonstrou interesse no teu perfil para a vaga "${job.title}".`,
      "candidate_action", "/dashboard/notificacoes", "Ver notificações", "accepted");
    result.eventKey = `candidate_action:${action.id}:${student.user_id}:accepted`;
    return result;
  }
  throw new ApiError(400, "Tipo de evento não suportado.");
}
