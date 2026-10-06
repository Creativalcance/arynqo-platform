"use client";
import { localizedAlert } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText, useI18n } from "@/lib/i18n/client";
import { academyCopy } from "@/lib/academy/admin-copy";


import Link from "@/lib/i18n/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type NotificationPreferences = {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  contact_requests_enabled: boolean;
  application_updates_enabled: boolean;
  match_updates_enabled: boolean;
  academy_updates_enabled: boolean;
};

const defaultPreferences: Omit<NotificationPreferences, "user_id"> = {
  email_enabled: true,
  push_enabled: true,
  contact_requests_enabled: true,
  application_updates_enabled: true,
  match_updates_enabled: true,
  academy_updates_enabled: true,
};

export default function DefinicoesNotificacoesPage() {
  const { locale } = useI18n();
  const [userId, setUserId] = useState("");
  const [preferences, setPreferences] = useState<
    Omit<NotificationPreferences, "user_id">
  >(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadPreferences() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = browserLocalizedPath("/login");
      return;
    }

    const currentUserId = sessionData.session.user.id;

    setUserId(currentUserId);

    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        `
        user_id,
        email_enabled,
        push_enabled,
        contact_requests_enabled,
        application_updates_enabled,
        match_updates_enabled,
        academy_updates_enabled
      `
      )
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (error) {
      localizedAlert(error.message);
      setIsLoading(false);
      return;
    }

    if (!data) {
      const { data: createdPreferences, error: createError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: currentUserId,
          ...defaultPreferences,
        })
        .select(
          `
          user_id,
          email_enabled,
          push_enabled,
          contact_requests_enabled,
          application_updates_enabled,
          match_updates_enabled,
          academy_updates_enabled
        `
        )
        .single();

      if (createError || !createdPreferences) {
        localizedAlert(createError?.message || "Não foi possível criar preferências.");
        setIsLoading(false);
        return;
      }

      setPreferences({
        email_enabled: createdPreferences.email_enabled,
        push_enabled: createdPreferences.push_enabled,
        contact_requests_enabled:
          createdPreferences.contact_requests_enabled,
        application_updates_enabled:
          createdPreferences.application_updates_enabled,
        match_updates_enabled: createdPreferences.match_updates_enabled,
        academy_updates_enabled: createdPreferences.academy_updates_enabled,
      });

      setIsLoading(false);
      return;
    }

    const currentPreferences = data as NotificationPreferences;

    setPreferences({
      email_enabled: currentPreferences.email_enabled,
      push_enabled: currentPreferences.push_enabled,
      contact_requests_enabled: currentPreferences.contact_requests_enabled,
      application_updates_enabled:
        currentPreferences.application_updates_enabled,
      match_updates_enabled: currentPreferences.match_updates_enabled,
      academy_updates_enabled: currentPreferences.academy_updates_enabled,
    });

    setIsLoading(false);
    }
    void loadPreferences();
  }, []);

  async function handleSave() {
    if (!userId) {
      return;
    }

    setIsSaving(true);
    setSuccessMessage("");

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    setIsSaving(false);

    if (error) {
      localizedAlert(error.message);
      return;
    }

    setSuccessMessage("Preferências de notificações guardadas com sucesso.");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  }

  function updatePreference(
    key: keyof Omit<NotificationPreferences, "user_id">,
    value: boolean
  ) {
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: value,
    }));
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">
          <LText text={"A carregar preferências de notificações..."} /></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/dashboard/notificacoes"
            className="inline-flex rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
          >
            <LText text={"← Voltar às notificações"} /></Link>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            <LText text={successMessage} />
          </div>
        )}

        <section className="mb-8 overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative">
              <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                <LText text={"Definições"} /></p>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                <LText text={"Preferências de notificações."} /></h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                <LText text={"Define como queres receber atualizações importantes sobre candidaturas, pedidos de contacto, matches e atividade da plataforma."} /></p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
              <LText text={"Canais"} /></p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              <LText text={"Como queres ser notificado"} /></h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              <LText text={"As notificações dentro da plataforma mantêm-se ativas. Aqui podes gerir os canais adicionais como email e push futuro na app."} /></p>
          </div>

          <div className="grid gap-4">
            <PreferenceToggle
              title="Receber notificações por email"
              description="Receber emails sobre pedidos de contacto, decisões de candidatura e eventos importantes."
              checked={preferences.email_enabled}
              onChange={(value) => updatePreference("email_enabled", value)}
            />

            <PreferenceToggle
              title="Receber notificações push na app"
              description="Preparado para a futura app ARYNQO. Quando a app estiver disponível, poderás receber alertas no telemóvel."
              checked={preferences.push_enabled}
              onChange={(value) => updatePreference("push_enabled", value)}
            />
          </div>
        </section>

        <section className="mt-8 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
              <LText text={"Tipos de alerta"} /></p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              <LText text={"Que eventos queres acompanhar"} /></h2>
          </div>

          <div className="grid gap-4">
            <PreferenceToggle
              title="Pedidos de contacto"
              description="Quando uma empresa pede autorização para ver o teu perfil completo ou quando um candidato responde a um pedido."
              checked={preferences.contact_requests_enabled}
              onChange={(value) =>
                updatePreference("contact_requests_enabled", value)
              }
            />

            <PreferenceToggle
              title={academyCopy(locale, "updatesTitle")}
              description={academyCopy(locale, "updatesDescription")}
              checked={preferences.academy_updates_enabled}
              onChange={(value) => updatePreference("academy_updates_enabled", value)}
            />

            <PreferenceToggle
              title="Atualizações de candidaturas"
              description="Quando uma candidatura é recebida, aceite, rejeitada ou atualizada."
              checked={preferences.application_updates_enabled}
              onChange={(value) =>
                updatePreference("application_updates_enabled", value)
              }
            />

            <PreferenceToggle
              title="Atualizações de matches"
              description="Quando existirem novos matches, recomendações relevantes ou alterações importantes no ranking."
              checked={preferences.match_updates_enabled}
              onChange={(value) =>
                updatePreference("match_updates_enabled", value)
              }
            />
          </div>
        </section>

        <div className="sticky bottom-6 z-10 mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full bg-[#1683FF] px-8 py-4 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(22,131,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LText text={isSaving ? "A guardar..." : "Guardar preferências"} />
          </button>
        </div>
      </div>
    </main>
  );
}

function PreferenceToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-wrap items-center justify-between gap-5 rounded-[28px] border p-5 transition ${
        checked
          ? "border-[#1683FF]/30 bg-[#1683FF]/5"
          : "border-[#DDE3EA] bg-white hover:border-[#1683FF]/40"
      }`}
    >
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-[#07111F]"><LText text={title} /></p>

        <p className="mt-1 text-sm leading-6 text-slate-500"><LText text={description} /></p>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onChange(!checked);
        }}
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? "bg-[#1683FF]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}
