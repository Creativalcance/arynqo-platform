"use client";
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode, type HTMLAttributes, type ComponentPropsWithRef, type JSX } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import { localeCookie, localeNames, locales, localizedPath, normalizeLocale, stripLocale, type Locale } from "./config";
import { setBrowserTranslator } from "./browser-feedback";
import { translator, type Messages } from "./translate";

const Context = createContext({ locale: "pt" as Locale, t: (source: string) => source, setLocale: async (chosen: Locale) => { void chosen; }, busy: false, error: "" });
function saveCookie(locale: Locale) { document.cookie = `${localeCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; }
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const pathname = usePathname();
  const t = useMemo(() => translator(messages), [messages]);
  useEffect(() => { setBrowserTranslator(t); }, [t]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setLocale = useCallback(async (chosen: Locale) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (data.session) {
        const { data: profile, error: writeError } = await supabase.from("profiles").update({ locale: chosen }).eq("id", data.session.user.id).select("locale").single();
        if (writeError || profile?.locale !== chosen) throw writeError || new Error("Locale not saved");
        // Auth templates read this display preference; it never controls permissions.
        const {error: metadataError} = await supabase.auth.updateUser({ data: { locale: chosen } });
        if (metadataError) throw metadataError;
      }
      saveCookie(chosen);
      window.location.assign(localizedPath(pathname, chosen) + window.location.search + window.location.hash);
    } catch { setError(t("Não foi possível guardar o idioma. Tenta novamente.")); setBusy(false); }
  }, [busy, pathname, t]);
  useEffect(() => {
    let cancelled = false;
    async function synchronize() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: profile, error } = await supabase.from("profiles").select("locale").eq("id", data.session.user.id).single();
      if (cancelled || error || !profile) return;
      const preferred = normalizeLocale(profile.locale);
      saveCookie(preferred);
      if (preferred !== locale && /^\/(dashboard|empresa|admin|app|definicoes)(\/|$)/.test(stripLocale(pathname))) {
        window.location.replace(localizedPath(pathname, preferred) + window.location.search + window.location.hash);
      }
    }
    void synchronize();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (!cancelled) void synchronize(); }, 0); });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [locale, pathname]);
  return <Context.Provider value={{ locale, t, setLocale, busy, error }}>{children}</Context.Provider>;
}
export function useI18n() { return useContext(Context); }
export function LText({ text }: { text: ReactNode }) {
  const { t } = useI18n();
  return <>{typeof text === "string" ? t(text) : text}</>;
}
export function LElement<T extends keyof JSX.IntrinsicElements>({ as, children, ...props }: { as: T } & ComponentPropsWithRef<T>) {
  const { t, locale } = useI18n();
  const translated: Record<string, unknown> = { ...props };
  for (const key of ["alt", "title", "placeholder", "aria-label"]) if (typeof translated[key] === "string") translated[key] = t(translated[key] as string);
  for (const key of ["href", "action"]) if (typeof translated[key] === "string") translated[key] = localizedPath(translated[key] as string, locale);
  return createElement(as as string, translated as HTMLAttributes<HTMLElement>, children as ReactNode);
}
export function LocaleSelect({ className = "", save = true, value, onChange, label = "Idioma da plataforma" }: { className?: string; label?: string; save?: boolean; value?: Locale; onChange?: (locale: Locale) => void }) {
  const { locale, setLocale, busy, error, t } = useI18n();
  return <div className={className}>
    <label className="block text-xs font-semibold text-slate-600">
      {t(label)}
      <select aria-label={t(label)} disabled={busy} value={value || locale} onChange={event => { const chosen = normalizeLocale(event.target.value); onChange?.(chosen); if (save) void setLocale(chosen); }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#07111F] focus:outline-2 focus:outline-blue-600">
        {locales.map(code => <option key={code} value={code} lang={code}>{localeNames[code]}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
