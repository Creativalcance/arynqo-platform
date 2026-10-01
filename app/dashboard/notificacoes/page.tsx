"use client";

import { createNotification } from "@/lib/create-notification";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean | null;
  created_at: string;
  related_type: string | null;
  related_id: string | null;
  related_url: string | null;
  action_label: string | null;
  email_status: "pending" | "sent" | "failed" | "disabled" | null;
  push_status: "pending" | "sent" | "failed" | "disabled" | null;
};

type RequestStatus = "pending" | "accepted" | "rejected";

type StudentProfile = {
  id: string;
  user_id: string;
};

type CompanyProfile = {
  id: string;
  user_id: string;
  company_name: string | null;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  industry: string | null;
  company_type: string | null;
  company_size: string | null;
};

type Job = {
  id: string;
  title: string;
  area: string | null;
  location: string | null;
  work_model: string | null;
  work_mode: string | null;
  opportunity_type: string | null;
  contract_type: string | null;
  seniority: string | null;
};

type ContactRequestRow = {
  id: string;
  company_id: string;
  student_id: string;
  job_id: string;
  status: RequestStatus;
  message: string | null;
  created_at: string;
  company_profiles: CompanyProfile | CompanyProfile[] | null;
  jobs: Job | Job[] | null;
};

type ContactRequest = {
  id: string;
  company_id: string;
  student_id: string;
  job_id: string;
  status: RequestStatus;
  message: string | null;
  created_at: string;
  company: CompanyProfile | null;
  job: Job | null;
};

const statusLabels: Record<RequestStatus, string> = {
  pending: "Pendente",
  accepted: "Aceite",
  rejected: "Recusado",
};

const statusStyles: Record<RequestStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const emailStatusLabels: Record<string, string> = {
  pending: "Email em fila",
  sent: "Email enviado",
  failed: "Email falhou",
  disabled: "Email desativado",
};

const pushStatusLabels: Record<string, string> = {
  pending: "Push preparado",
  sent: "Push enviado",
  failed: "Push falhou",
  disabled: "Push desativado",
};

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRequestId, setIsUpdatingRequestId] = useState("");
  const [contactFeedback, setContactFeedback] = useState("");
  const [renewingId, setRenewingId] = useState("");
  const [renewalMessages, setRenewalMessages] = useState<Record<string, string>>({});

  async function confirmRenewal(notificationId: string) {
    if (renewingId) return;
    setRenewingId(notificationId);
    try {
      const { data, error } = await supabase.rpc("confirm_job_renewal_notification", { notification_id: notificationId });
      if (error) throw error;
      setNotifications(current => current.map(item => item.id === notificationId ? { ...item, action_label: "Vaga confirmada", is_read: true } : item));
      setRenewalMessages(current => ({ ...current, [notificationId]: `Vaga confirmada. Publicada até ${new Date(data).toLocaleDateString("pt-PT")}.` }));
    } catch {
      setRenewalMessages(current => ({ ...current, [notificationId]: "Não foi possível confirmar. Verifica a sessão e o estado da vaga na área da empresa e tenta novamente." }));
    } finally {
      setRenewingId("");
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    await Promise.all([loadNotifications(userId), loadContactRequests(userId)]);

    setIsLoading(false);
  }

  async function loadNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        id,
        title,
        message,
        is_read,
        created_at,
        related_type,
        related_id,
        related_url,
        action_label,
        email_status,
        push_status
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((data || []) as Notification[]);
  }

  async function loadContactRequests(userId: string) {
    const { data: student } = await supabase
      .from("student_profiles")
      .select("id, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!student) {
      setStudentProfile(null);
      setContactRequests([]);
      return;
    }

    const currentStudent = student as StudentProfile;
    setStudentProfile(currentStudent);

    const { data, error } = await supabase
      .from("candidate_contact_requests")
      .select(
        `
        id,
        company_id,
        student_id,
        job_id,
        status,
        message,
        created_at,
        company_profiles (
          id,
          user_id,
          company_name,
          description,
          location,
          logo_url,
          industry,
          company_type,
          company_size
        ),
        jobs (
          id,
          title,
          area,
          location,
          work_model,
          work_mode,
          opportunity_type,
          contract_type,
          seniority
        )
      `
      )
      .eq("student_id", currentStudent.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setContactRequests([]);
      return;
    }

    const normalizedRequests = ((data || []) as ContactRequestRow[]).map(
      (request) => {
        const company = Array.isArray(request.company_profiles)
          ? request.company_profiles[0] ?? null
          : request.company_profiles;

        const job = Array.isArray(request.jobs)
          ? request.jobs[0] ?? null
          : request.jobs;

        return {
          id: request.id,
          company_id: request.company_id,
          student_id: request.student_id,
          job_id: request.job_id,
          status: request.status,
          message: request.message,
          created_at: request.created_at,
          company,
          job,
        };
      }
    );

    setContactRequests(normalizedRequests);
  }

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((notification) => !notification.is_read)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .in("id", unreadIds);

    if (error) {
      alert(error.message);
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  }

  async function updateContactRequestStatus(request: ContactRequest, status: RequestStatus) {
    if (!studentProfile || isUpdatingRequestId) return;
    setIsUpdatingRequestId(request.id);
    setContactFeedback("");
    try {
      const { data, error } = await supabase.rpc("respond_candidate_contact_request", {
        request_id: request.id, decision: status,
      });
      if (error || !["accepted", "rejected"].includes(data)) throw error || new Error("Invalid response");
      const confirmedStatus = data as RequestStatus;
      setContactRequests(current => current.map(item => item.id === request.id ? { ...item, status: confirmedStatus } : item));
      setNotifications(current => current.map(item => item.related_id === request.id && ["candidate_contact_request", "contact_request"].includes(item.related_type || "") ? { ...item, is_read: true } : item));
      setContactFeedback(confirmedStatus === "accepted" ? "Pedido aceite. A empresa já pode consultar o teu perfil." : "Pedido recusado. Este pedido não autoriza o acesso ao teu perfil.");
      window.dispatchEvent(new Event("arynqo-notifications-changed"));
      // The database already created the company's notification. Email delivery must not block the response UI.
      void createNotification({ userId: "", title: "", message: "", relatedType: "candidate_contact_request", relatedId: request.id }).catch(() => undefined);
    } catch {
      setContactFeedback("Não foi possível guardar a resposta. Tenta novamente. Se a sessão terminou, inicia sessão antes de responder.");
    } finally {
      setIsUpdatingRequestId("");
    }
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  const resolvedRequestIds = new Set(contactRequests.filter(request => request.status !== "pending").map(request => request.id));
  const visibleNotifications = notifications.filter(notification =>
    !(["candidate_contact_request", "contact_request"].includes(notification.related_type || "") && resolvedRequestIds.has(notification.related_id || ""))
  );
  const unreadCount = visibleNotifications.filter(
    (notification) => !notification.is_read
  ).length;

  const pendingContactRequests = useMemo(() => {
    return contactRequests.filter((request) => request.status === "pending");
  }, [contactRequests]);

  const resolvedContactRequests = useMemo(() => {
    return contactRequests.filter((request) => request.status !== "pending");
  }, [contactRequests]);

  const pendingRequestIds = new Set(pendingContactRequests.map(request => request.id));
  const totalPendingItems = unreadCount + pendingContactRequests.length - visibleNotifications.filter(notification =>
    !notification.is_read && ["candidate_contact_request", "contact_request"].includes(notification.related_type || "") && pendingRequestIds.has(notification.related_id || "")
  ).length;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar notificações...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-5xl">
        <section className="mb-8 overflow-hidden rounded-[32px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-10 md:py-12">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-32 h-40 w-40 rounded-full bg-[#4BB3FD]/20 blur-3xl" />

            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                  Centro de notificações
                </p>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                  Notificações ARYNQO.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                  Acompanha candidaturas, decisões, empresas interessadas,
                  pedidos de contacto e atividade relevante na plataforma.
                </p>
              </div>

              <div className="grid gap-3">
  <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
    <p className="text-sm font-medium text-white/70">Pendentes</p>

    <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white">
      {totalPendingItems}
    </p>
  </div>

  <Link
    href="/definicoes/notificacoes"
    className="rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
  >
    Preferências
  </Link>
</div>
            </div>
          </div>
        </section>

        {contactFeedback && <p role="status" className="mb-6 rounded-2xl bg-white p-4 text-sm">{contactFeedback}</p>}

        {pendingContactRequests.length > 0 && (
          <section className="mb-8 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Pedidos de contacto
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Empresas querem ver o teu perfil
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                As empresas pedem autorização para consultar o teu perfil completo.
                Podes aceitar ou recusar cada pedido.
              </p>
            </div>

            <div className="space-y-4">
              {pendingContactRequests.map((request) => (
                <ContactRequestCard
                  key={request.id}
                  request={request}
                  isUpdating={!!isUpdatingRequestId}
                  formatDate={formatDate}
                  onAccept={() =>
                    updateContactRequestStatus(request, "accepted")
                  }
                  onReject={() =>
                    updateContactRequestStatus(request, "rejected")
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Atualizações
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Histórico de atividade
              </h2>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="space-y-4">
            {visibleNotifications.map((notification) => (
              <article
                key={notification.id}
                className={
                  notification.is_read
                    ? "rounded-[24px] border border-[#DDE3EA] bg-white p-5"
                    : "rounded-[24px] border border-[#1683FF]/30 bg-[#1683FF]/5 p-5"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      {!notification.is_read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#1683FF]" />
                      )}

                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#07111F]">
                        {notification.title}
                      </h3>
                    </div>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-slate-400">
                        {formatDate(notification.created_at)}
                      </p>

                      {notification.email_status && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {emailStatusLabels[notification.email_status] ||
                            notification.email_status}
                        </span>
                      )}

                      {notification.push_status && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                          {pushStatusLabels[notification.push_status] ||
                            notification.push_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {notification.related_type === "job_renewal" && ["Confirmar vaga", "Vaga confirmada"].includes(notification.action_label || "") ? (
                      <button type="button" disabled={!!renewingId || notification.action_label === "Vaga confirmada"}
                        onClick={() => confirmRenewal(notification.id)}
                        className="rounded-full bg-[#07111F] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                        {renewingId === notification.id ? "A confirmar…" : notification.action_label}
                      </button>
                    ) : notification.related_url && (
                      <Link
                        href={notification.related_url}
                        className="rounded-full bg-[#07111F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1683FF]"
                      >
                        {notification.action_label || "Abrir"}
                      </Link>
                    )}

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className="rounded-full border border-[#DDE3EA] px-4 py-2 text-xs font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
                {renewalMessages[notification.id] && <p role="status" className="mt-4 text-sm">{renewalMessages[notification.id]}</p>}
              </article>
            ))}

            {resolvedContactRequests.length > 0 && (
              <div className="pt-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pedidos de contacto tratados
                </p>

                <div className="space-y-4">
                  {resolvedContactRequests.map((request) => (
                    <ResolvedContactRequestCard
                      key={request.id}
                      request={request}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {notifications.length === 0 && contactRequests.length === 0 && (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-[#F7F9FC] p-12 text-center">
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  Ainda não tens notificações.
                </h2>

                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Quando houver atividade relevante, vais encontrá-la aqui.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ContactRequestCard({
  request,
  isUpdating,
  formatDate,
  onAccept,
  onReject,
}: {
  request: ContactRequest;
  isUpdating: boolean;
  formatDate: (date: string) => string;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-[28px] border border-[#1683FF]/20 bg-[#1683FF]/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-[#07111F] to-[#1683FF] text-lg font-semibold text-white">
            {request.company?.logo_url ? (
              <img
                src={request.company.logo_url}
                alt={request.company.company_name || "Empresa"}
                className="h-full w-full object-cover"
              />
            ) : (
              request.company?.company_name?.charAt(0).toUpperCase() || "E"
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-[-0.03em]">
                {request.company?.company_name || "Empresa"}
              </h3>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusStyles[request.status]
                }`}
              >
                {statusLabels[request.status]}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {request.message ||
                "A empresa pretende ver o teu perfil completo para uma vaga compatível."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {request.job?.title && <Badge>{request.job.title}</Badge>}
              {request.job?.area && <Badge>{request.job.area}</Badge>}
              {request.job?.location && <Badge>{request.job.location}</Badge>}
              {(request.job?.work_model || request.job?.work_mode) && (
                <Badge>{request.job.work_model || request.job.work_mode}</Badge>
              )}
              {(request.job?.opportunity_type ||
                request.job?.contract_type) && (
                <Badge>
                  {request.job.opportunity_type || request.job.contract_type}
                </Badge>
              )}
              {request.job?.seniority && <Badge>{request.job.seniority}</Badge>}
            </div>

            <p className="mt-4 text-xs font-medium text-slate-400">
              {formatDate(request.created_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={onReject}
            disabled={isUpdating}
            className="rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold text-[#07111F] transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Recusar
          </button>

          <button
            type="button"
            onClick={onAccept}
            disabled={isUpdating}
            className="rounded-full bg-[#1683FF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "A guardar..." : "Aceitar contacto"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ResolvedContactRequestCard({
  request,
  formatDate,
}: {
  request: ContactRequest;
  formatDate: (date: string) => string;
}) {
  return (
    <article className="rounded-[24px] border border-[#DDE3EA] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#07111F]">
              {request.company?.company_name || "Empresa"}
            </h3>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                statusStyles[request.status]
              }`}
            >
              {statusLabels[request.status]}
            </span>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Pedido de contacto para a vaga{" "}
            <strong>{request.job?.title || "vaga"}</strong>.
          </p>

          <p className="mt-4 text-xs font-medium text-slate-400">
            {formatDate(request.created_at)}
          </p>
        </div>
      </div>
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}
