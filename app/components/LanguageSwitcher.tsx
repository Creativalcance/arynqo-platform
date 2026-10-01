"use client";

import {useEffect, useRef} from "react";
import {useI18n} from "@/lib/i18n/client";
import {locales, localeNames, type Locale} from "@/lib/i18n/config";

function Flag({locale}: {locale: Locale}) {
  return <svg aria-hidden="true" viewBox="0 0 30 20" className="h-4 w-6 shrink-0 overflow-hidden rounded-sm ring-1 ring-black/10">
    {locale === "pt" && <><path fill="#006600" d="M0 0h12v20H0z"/><path fill="#d90016" d="M12 0h18v20H12z"/><circle cx="12" cy="10" r="4" fill="#ffcc00"/><path fill="#fff" stroke="#d90016" strokeWidth="1.4" d="M10 7h4v5l-2 2-2-2z"/></>}
    {locale === "en" && <><path fill="#012169" d="M0 0h30v20H0z"/><path stroke="#fff" strokeWidth="4" d="m0 0 30 20M30 0 0 20"/><path stroke="#c8102e" strokeWidth="1.5" d="m0 0 30 20M30 0 0 20"/><path stroke="#fff" strokeWidth="7" d="M15 0v20M0 10h30"/><path stroke="#c8102e" strokeWidth="4" d="M15 0v20M0 10h30"/></>}
    {locale === "fr" && <><path fill="#002395" d="M0 0h10v20H0z"/><path fill="#fff" d="M10 0h10v20H10z"/><path fill="#ed2939" d="M20 0h10v20H20z"/></>}
    {locale === "es" && <><path fill="#aa151b" d="M0 0h30v20H0z"/><path fill="#f1bf00" d="M0 5h30v10H0z"/><path fill="#aa151b" d="M7 8h3v5H7z"/><path fill="#fff" d="M8 9h1v3H8z"/></>}
    {locale === "de" && <><path fill="#000" d="M0 0h30v7H0z"/><path fill="#d00" d="M0 7h30v6H0z"/><path fill="#ffce00" d="M0 13h30v7H0z"/></>}
    {locale === "it" && <><path fill="#009246" d="M0 0h10v20H0z"/><path fill="#fff" d="M10 0h10v20H10z"/><path fill="#ce2b37" d="M20 0h10v20H20z"/></>}
  </svg>;
}

export default function LanguageSwitcher() {
  const {locale, setLocale, busy, error, t} = useI18n();
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (details.current && event.target instanceof Node && !details.current.contains(event.target)) details.current.open = false;
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return <div className="relative mx-2 shrink-0">
    <details ref={details} onKeyDown={event => {
      if (event.key === "Escape") {event.preventDefault(); if(details.current) details.current.open = false; summary.current?.focus();}
    }}>
      <summary ref={summary} aria-label={`${t("Idioma da plataforma")}: ${localeNames[locale]}`} aria-disabled={busy} title={localeNames[locale]}
        onClick={event => {if(busy) event.preventDefault();}}
        className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-[#DDE3EA] bg-white px-3 text-xs font-semibold text-[#07111F] transition hover:border-[#1683FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1683FF] [&::-webkit-details-marker]:hidden">
        <Flag locale={locale}/><span>{locale.toUpperCase()}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 text-slate-500"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-[#DDE3EA] bg-white p-1.5 shadow-lg">
        {locales.map(code => <button key={code} type="button" lang={code} disabled={busy} aria-pressed={code===locale}
          onClick={() => {if(details.current) details.current.open=false; summary.current?.focus(); if(code!==locale) void setLocale(code);}}
          className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#1683FF] disabled:opacity-50 ${code===locale ? "bg-blue-50 font-semibold text-[#1683FF]" : "text-[#07111F]"}`}>
          <Flag locale={code}/><span>{localeNames[code]}</span>
        </button>)}
      </div>
    </details>
    {error && <p role="alert" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700 shadow-lg">{error}</p>}
  </div>;
}
