"use client";
import { LText, LElement, useI18n } from "@/lib/i18n/client";


import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { countryFlag, languageCodesForCountry, selectProfileLanguage } from "@/lib/language-selection";
import { countryOptions, languageLevels, languageOptions, optionKey, parseLanguage, profileOptions } from "@/lib/profile-options";

const fieldClass = "mt-2 w-full min-w-0 rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm outline-none focus:border-[#1683FF]";
export function CountrySelect({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { locale } = useI18n();
  const countries = profileOptions(locale).countries;
  return <LElement as="select" aria-label="País" className={fieldClass} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
    <option value=""><LText text={"Selecionar país"} /></option>
    {value && !countryOptions.some(o => o.label === value) && <option value={value}><LText text={value} /></option>}
    {countries.map(o => <option key={o.code} value={o.label}>{o.display}</option>)}
  </LElement>;
}

export function LanguagePicker({ value, onChange, label = "Idiomas" }: { value: string[]; onChange: (value: string[]) => void; label?: string }) {
  const { locale } = useI18n();
  const localizedLanguages = profileOptions(locale).languages;
  const countries = profileOptions(locale).countries;
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState("");
  const countryCodes = languageCodesForCountry(country);
  const countryLanguages = country === "*" || !countryCodes.length
    ? localizedLanguages
    : countryCodes.flatMap(code => localizedLanguages.filter(option => option.code === code));
  const matches = countryLanguages.filter(o => !query || [o.display, o.label, o.english, o.code].some(s => optionKey(s).includes(optionKey(query))));
  const options = matches.slice(0, 150);
  function add() {
    if (!country || !code) return;
    onChange(selectProfileLanguage(value, code, level));
    setCode(""); setQuery(""); setLevel("");
  }
  return <div className="min-w-0">
    <ul className="mt-3 space-y-2">{value.map((v, index) => <li key={`${v}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
      <span className="min-w-0 flex-1 break-words">{localizedLanguages.find(option => option.code === parseLanguage(v).code)?.display || parseLanguage(v).name}</span>
      <LElement as="select" aria-label={`Nível de ${parseLanguage(v).name}`} className="rounded-lg border bg-white p-2" value={parseLanguage(v).level} onChange={e => onChange(value.map((item, i) => i === index ? `${parseLanguage(item).name}${e.target.value ? ` (${e.target.value})` : ""}` : item))}>
        <option value=""><LText text={"Sem nível indicado"} /></option>{languageLevels.map(l => <option value={l} key={l}><LText text={l} /></option>)}
      </LElement><LElement as="button" type="button" aria-label={`Remover ${v}`} className="p-2" onClick={() => onChange(value.filter((_, i) => i !== index))}><LText text={"×"} /></LElement>
    </li>)}</ul>
    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium text-slate-700"><LText text="País de referência do idioma" />
        <LElement as="select" className={fieldClass} value={country} onChange={event => { setCountry(event.target.value); setCode(""); setQuery(""); }}>
          <option value=""><LText text="Selecionar país" /></option>
          {countries.map(item => <option key={item.code} value={item.code}>{countryFlag(item.code)} {item.display}</option>)}
          <option value="*">🌐 <LText text="Todos os idiomas" /></option>
        </LElement>
      </label>
      <label className="min-w-0 text-sm font-medium text-slate-700"><LText text="Idioma" />
        <LElement as="select" className={fieldClass} disabled={!country} value={code} onChange={event => setCode(event.target.value)}>
          <option value=""><LText text="Selecionar idioma" /></option>
          {options.map(item => <option value={item.code} key={item.code}>{item.display}</option>)}
        </LElement>
      </label>
    </div>
    {country && (country === "*" || !countryCodes.length || countryLanguages.length > 15) && <LElement as="input" className={fieldClass} aria-label={`Pesquisar ${label}`} placeholder="Pesquisar idioma pelo nome ou código" value={query} onChange={event => {setQuery(event.target.value);setCode("");}} />}
    {country && matches.length > 150 && <p className="mt-1 text-xs text-slate-500"><LText text={"Pesquisa para encontrar qualquer um dos "} />{languageOptions.length} <LText text={" idiomas."} /></p>}
    <div className="mt-2 flex flex-wrap gap-2"><LElement as="select" aria-label="Nível do novo idioma" className="min-w-0 flex-1 rounded-xl border bg-white p-3 text-sm" value={level} onChange={e => setLevel(e.target.value)}><option value=""><LText text={"Sem nível indicado"} /></option>{languageLevels.map(l => <option value={l} key={l}><LText text={l} /></option>)}</LElement><button type="button" disabled={!country || !code} onClick={add} className="rounded-xl bg-[#07111F] px-4 py-3 text-sm text-white disabled:opacity-50"><LText text={"Adicionar"} /></button></div>
    <p className="mt-2 text-xs text-slate-600"><LText text="O país ajuda a encontrar o idioma; não indica nacionalidade. Não encontras o idioma? Seleciona Todos os idiomas." /></p>
    <p className="mt-2 text-xs text-slate-500"><LText text={"A1–C2: níveis do QECR. Indica apenas o nível que consegues demonstrar."} /></p>
  </div>;
}

export function JobLanguagePicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return <div className="mt-3 grid min-w-0 gap-5">
    {["Falado", "Escrito"].map(channel => <div key={channel}><p className="text-sm font-semibold"><LText text={channel === "Falado" ? "Idiomas falados" : "Idiomas escritos"} /></p><LanguagePicker label={channel === "Falado" ? "idiomas falados" : "idiomas escritos"} value={value.filter(v => v.startsWith(`${channel}: `)).map(v => v.slice(channel.length + 2))} onChange={values => onChange([...value.filter(v => !v.startsWith(`${channel}: `)), ...values.map(v => `${channel}: ${v}`)])} /></div>)}
    {value.some(v => !/^(Falado|Escrito): /.test(v)) && <div><p className="text-sm font-semibold"><LText text={"Idiomas gerais já registados"} /></p><LanguagePicker value={value.filter(v => !/^(Falado|Escrito): /.test(v))} onChange={values => onChange([...value.filter(v => /^(Falado|Escrito): /.test(v)), ...values])} /></div>}
  </div>;
}

export function TagPicker({ value, onChange, label = "Competências" }: { value: string[]; onChange: (value: string[]) => void | Promise<void>; label?: string }) {
  const { locale } = useI18n();
  const id = useId();
  const [displayLabels, setDisplayLabels] = useState<Record<string,string>>({});
  useEffect(() => { let cancelled=false; void supabase.rpc("profile_tag_display_labels", {p_labels:value,p_locale:locale}).then(({data}) => {if (!cancelled) setDisplayLabels(Object.fromEntries((data || []).map((item: {label:string;display_label:string}) => [item.label,item.display_label])));}); return () => {cancelled=true;}; }, [value,locale]);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{label:string;display_label:string}[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error: readError } = await supabase.rpc("search_profile_tags_localized", {p_query: query, p_locale:locale, p_limit: 20});
      if (!cancelled) { setOptions(data || []); if (readError) setError("Não foi possível carregar as sugestões."); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query,locale]);
  async function add(name = query, canonicalChoice = false) {
    if (busy || !name.trim()) return;
    const exact=options.filter(item => optionKey(item.display_label)===optionKey(name));
    if (!canonicalChoice && exact.length>1) {setError("Seleciona uma sugestão para distinguir competências com o mesmo nome."); return;}
    const canonical=canonicalChoice ? name : exact[0]?.label || name;
    setBusy(true); setError("");
    try {
      const { data, error: saveError } = await supabase.rpc("ensure_profile_tag", { p_label: canonical.trim() });
      if (saveError || typeof data !== "string") throw new Error(saveError?.message || "Não foi possível guardar a competência.");
      if (!value.some(v => optionKey(v) === optionKey(data))) await onChange([...value, data]);
      setQuery("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível guardar."); }
    finally { setBusy(false); }
  }
  async function remove(index: number) {
    if (busy) return;
    setBusy(true); setError("");
    try { await onChange(value.filter((_, i) => i !== index)); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível remover."); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0">
    <div className="mt-3 flex flex-wrap gap-2">{value.map((v, i) => <LElement as="button" disabled={busy} type="button" key={`${v}-${i}`} aria-label={`Remover ${v}`} onClick={() => { void remove(i); }} className="max-w-full break-words rounded-xl bg-blue-50 px-3 py-2 text-left text-sm text-blue-800">{displayLabels[v] || v} <LText text={" ×"} /></LElement>)}</div>
    <div className="flex min-w-0 gap-2"><LElement as="input" aria-label={label} list={id} value={query} maxLength={80} onChange={e => {setQuery(e.target.value);setOptions([]);}} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} className={fieldClass} placeholder="Escrever para selecionar ou criar uma tag" /><button disabled={busy || !query.trim()} type="button" onClick={() => { void add(); }} className="mt-2 rounded-xl bg-[#07111F] px-4 text-white disabled:opacity-50"><LText text={busy ? "…" : "+"} /></button></div>
    <datalist id={id}>{options.map(v => <option key={v.label} value={v.display_label} />)}</datalist>
    {query.trim() && <LElement as="div" aria-label={`Sugestões de ${label}`} className="mt-2 flex flex-wrap gap-2">{options.filter(v => !value.some(selected => optionKey(selected) === optionKey(v.label))).slice(0, 8).map(v => <button key={v.label} type="button" disabled={busy} onClick={() => { void add(v.label,true); }} className="max-w-full break-words rounded-xl border border-blue-200 px-3 py-2 text-left text-sm text-blue-800 disabled:opacity-50">{v.display_label}</button>)}</LElement>}
    <p className="mt-2 text-xs text-slate-500"><LText text={"Seleciona uma sugestão e adiciona-a. Podes usar novas tags no teu perfil ou vaga. Após revisão, ficam disponíveis para todos. Não introduzas dados pessoais."} /></p>
    <p className="mt-2 text-xs text-slate-500"><LText text={"Inclui termos ESCO · © União Europeia · CC BY 4.0. "} /><LElement as="a" href="https://esco.ec.europa.eu/en/use-esco/download" target="_blank" rel="noopener noreferrer" className="underline"><LText text={"Fonte do catálogo"} /></LElement>.</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-700"><LText text={error} /></p>}
  </div>;
}

export function CountryCodeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { locale, t } = useI18n();
  return <select aria-label={t("País da vaga")} className={fieldClass} value={value} onChange={event => onChange(event.target.value)}><option value="">{t("Selecionar país")}</option>{profileOptions(locale).countries.map(country => <option key={country.code} value={country.code}>{country.display}</option>)}</select>;
}
