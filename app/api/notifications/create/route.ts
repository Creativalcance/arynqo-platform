import { requireActor, enforceApiLimit, apiErrorResponse } from "@/lib/api-auth";
import { resolveNotificationEvent } from "@/lib/notification-event";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type NotificationChannel = "in_app" | "email" | "push";

type CreateNotificationBody = {
  userId?: string;
  relatedJobId?: string;
  title?: string;
  message?: string;
  relatedType?: string | null;
  relatedId?: string | null;
  relatedUrl?: string | null;
  actionLabel?: string | null;
  channels?: NotificationChannel[];
};

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
};

type NotificationPreference = {
  email_enabled: boolean;
  push_enabled: boolean;
  contact_requests_enabled: boolean;
  application_updates_enabled: boolean;
  match_updates_enabled: boolean;
};

type NotificationPreferenceCategory =
  | "contact_requests"
  | "application_updates"
  | "match_updates"
  | "general";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

const notificationFromEmail =
  process.env.NOTIFICATION_FROM_EMAIL || "Arynqo <no-reply@arynqo.com>";

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Credenciais Supabase admin em falta.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeChannels(channels?: NotificationChannel[]) {
  const safeChannels = channels?.length ? channels : ["in_app", "email"];

  return Array.from(
    new Set(
      safeChannels.filter((channel) =>
        ["in_app", "email", "push"].includes(channel)
      )
    )
  ) as NotificationChannel[];
}

function getNotificationCategory(
  relatedType: string | null | undefined
): NotificationPreferenceCategory {
  if (!relatedType) {
    return "general";
  }

  if (
    relatedType === "candidate_contact_request" ||
    relatedType === "contact_request"
  ) {
    return "contact_requests";
  }

  if (
    relatedType === "application" ||
    relatedType === "candidate_action" ||
    relatedType === "application_status"
  ) {
    return "application_updates";
  }

  if (
    relatedType === "match" ||
    relatedType === "ai_match" ||
    relatedType === "match_update"
  ) {
    return "match_updates";
  }

  return "general";
}

function isCategoryEnabled(
  preferences: NotificationPreference,
  category: NotificationPreferenceCategory
) {
  if (category === "contact_requests") {
    return preferences.contact_requests_enabled;
  }

  if (category === "application_updates") {
    return preferences.application_updates_enabled;
  }

  if (category === "match_updates") {
    return preferences.match_updates_enabled;
  }

  return true;
}

function buildAbsoluteUrl(path: string | null | undefined) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (!appBaseUrl) {
    return path;
  }

  const normalizedBaseUrl = appBaseUrl.startsWith("http")
    ? appBaseUrl
    : `https://${appBaseUrl}`;

  return `${normalizedBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml({
  name,
  title,
  message,
  actionLabel,
  relatedUrl,
}: {
  name: string | null;
  title: string;
  message: string;
  actionLabel?: string | null;
  relatedUrl?: string | null;
}) {
  const actionUrl = buildAbsoluteUrl(relatedUrl);
  const safeName = name ? escapeHtml(name) : "";
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeActionLabel = escapeHtml(actionLabel || "Abrir na ARYNQO");

  return `
    <div style="font-family: Arial, sans-serif; background:#F7F9FC; padding:32px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; padding:32px; border:1px solid #DDE3EA;">
        <p style="margin:0 0 16px; color:#1683FF; font-size:12px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase;">
          ARYNQO
        </p>

        <h1 style="margin:0; color:#07111F; font-size:28px; line-height:1.15;">
          ${safeTitle}
        </h1>

        <p style="margin:24px 0 0; color:#475569; font-size:15px; line-height:1.7;">
          Olá${safeName ? `, ${safeName}` : ""}.
        </p>

        <p style="margin:12px 0 0; color:#475569; font-size:15px; line-height:1.7;">
          ${safeMessage}
        </p>

        ${
          actionUrl
            ? `
              <div style="margin-top:28px;">
                <a href="${escapeHtml(
                  actionUrl
                )}" style="display:inline-block; background:#1683FF; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:14px 22px; border-radius:999px;">
                  ${safeActionLabel}
                </a>
              </div>
            `
            : ""
        }

        <p style="margin:32px 0 0; color:#94A3B8; font-size:12px; line-height:1.6;">
          Recebeste este email porque tens notificações ativas na plataforma ARYNQO.
        </p>
      </div>
    </div>
  `;
}

async function sendEmail({
  to,
  name,
  title,
  message,
  actionLabel,
  relatedUrl,
}: {
  to: string;
  name: string | null;
  title: string;
  message: string;
  actionLabel?: string | null;
  relatedUrl?: string | null;
}) {
  if (!resendApiKey) {
    return {
      sent: false,
      disabled: true,
      error: "RESEND_API_KEY não está configurada.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: notificationFromEmail,
      to,
      subject: title,
      html: buildEmailHtml({
        name,
        title,
        message,
        actionLabel,
        relatedUrl,
      }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return {
      sent: false,
      disabled: false,
      error: errorText || "Erro ao enviar email.",
    };
  }

  return {
    sent: true,
    disabled: false,
    error: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const input = (await request.json()) as CreateNotificationBody;
    const supabase = getAdminClient();
    const body = await resolveNotificationEvent(actor, supabase, input);
    await enforceApiLimit(actor, "notifications", 30, 60);
    const channels = normalizeChannels(body.channels);
    const category = getNotificationCategory(body.relatedType);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("id", body.userId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    const profile = profileData as UserProfile;

    const { data: preferencesData } = await supabase
      .from("notification_preferences")
      .select(
        `
        email_enabled,
        push_enabled,
        contact_requests_enabled,
        application_updates_enabled,
        match_updates_enabled
      `
      )
      .eq("user_id", body.userId)
      .maybeSingle();

    const preferences = (preferencesData || {
      email_enabled: true,
      push_enabled: true,
      contact_requests_enabled: true,
      application_updates_enabled: true,
      match_updates_enabled: true,
    }) as NotificationPreference;

    const categoryEnabled = isCategoryEnabled(preferences, category);

    const emailEnabled =
      channels.includes("email") &&
      preferences.email_enabled &&
      categoryEnabled;

    const pushEnabled =
      channels.includes("push") &&
      preferences.push_enabled &&
      categoryEnabled;

    const { data: notificationData, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: body.userId,
        event_key: body.eventKey,
        title: body.title,
        message: body.message,
        related_type: body.relatedType || null,
        related_id: body.relatedId || null,
        related_url: body.relatedUrl || null,
        action_label: body.actionLabel || null,
        channels,
        email_status: emailEnabled ? "pending" : "disabled",
        push_status: pushEnabled ? "pending" : "disabled",
      })
      .select("id")
      .single();

    if (notificationError?.code === "23505") {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (notificationError || !notificationData) {
      return NextResponse.json(
        { error: notificationError?.message || "Erro ao criar notificação." },
        { status: 500 }
      );
    }

    let emailStatus: "sent" | "failed" | "disabled" = "disabled";
    let emailError: string | null = null;

    if (emailEnabled) {
      const emailResult = await sendEmail({
        to: profile.email,
        name: profile.name,
        title: body.title,
        message: body.message,
        actionLabel: body.actionLabel,
        relatedUrl: body.relatedUrl,
      });

      if (emailResult.disabled) {
        emailStatus = "disabled";
        emailError = emailResult.error;
      } else if (emailResult.sent) {
        emailStatus = "sent";
      } else {
        emailStatus = "failed";
        emailError = emailResult.error;
      }

      await supabase
        .from("notifications")
        .update({
          email_status: emailStatus,
          email_sent_at:
            emailStatus === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", notificationData.id);
    }

    return NextResponse.json({
      success: true,
      notification_id: notificationData.id,
      notification_category: category,
      category_enabled: categoryEnabled,
      email_status: emailStatus,
      email_error: emailError,
      push_status: pushEnabled ? "pending" : "disabled",
    });
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error("Erro ao criar notificação:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar notificação.",

      },
      { status: 500 }
    );
  }
}