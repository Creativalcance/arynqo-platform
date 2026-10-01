import { sendNotificationEmail } from "@/lib/notification-email";
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
  process.env.NOTIFICATION_FROM_EMAIL || "ARYNQO <no-reply@arynqo.com>";

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.arynqo.com";

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

    const { data: preferencesData, error: preferencesError } = await supabase
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

    if (preferencesError) return NextResponse.json({ error: "Não foi possível verificar as preferências de notificação." }, { status: 503 });

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

    const { data: insertedNotification, error: insertError } = await supabase
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

    let notificationData=insertedNotification;
    let notificationError=insertError;
    if (insertError?.code === "23505") {
      const existing=await supabase.from('notifications').select('id,email_status').eq('event_key',body.eventKey).single();
      if(existing.error)return NextResponse.json({error:'Não foi possível consultar a notificação.'},{status:503});
      if(existing.data.email_status==='sent'||existing.data.email_status==='disabled')return NextResponse.json({success:true,duplicate:true});
      notificationData=existing.data;notificationError=null;
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
      const emailResult = await sendNotificationEmail({
        to: profile.email,
        name: profile.name,
        title: body.title,
        message: body.message,
        actionLabel: body.actionLabel,
        relatedUrl: body.relatedUrl,
        eventKey: body.eventKey,
      }, { apiKey: resendApiKey, from: notificationFromEmail, baseUrl: appBaseUrl });

      if (emailResult.disabled) {
        emailStatus = "disabled";
        emailError = emailResult.error;
      } else if (emailResult.sent) {
        emailStatus = "sent";
      } else {
        emailStatus = "failed";
        emailError = emailResult.error;
      }

      const { error: deliveryStatusError } = await supabase
        .from("notifications")
        .update({
          email_status: emailStatus,
          email_sent_at:
            emailStatus === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", notificationData.id);
      if (deliveryStatusError) return NextResponse.json({ error: "A notificação foi criada, mas não foi possível guardar o estado de envio.", notification_id: notificationData.id }, { status: 503 });
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
    console.error("Falha na criação de notificação.");

    return NextResponse.json(
      {
        error: "Erro ao criar notificação.",

      },
      { status: 500 }
    );
  }
}
