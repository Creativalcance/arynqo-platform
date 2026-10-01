"use client";

import { useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { countryOptions, languageLevels, languageOptions, optionKey, parseLanguage } from "@/lib/profile-options";

const fieldClass = "mt-2 w-full min-w-0 rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm outline-none focus:border-[#1683FF]";
export function CountrySelect({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <select aria-label="País" className={fieldClass} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
    <option value="">Selecionar país</option>
    {value && !countryOptions.some(o => o.label === value) && <option value={value}>{value}</option>}
    {countryOptions.map(o => <option key={o.code} value={o.label}>{o.label}</option>)}
  </select>;
}

export function LanguagePicker({ value, onChange, label = "Idiomas" }: { value: string[]; onChange: (value: string[]) => void; label?: string }) {
  const [query, setQuery] = useState("");
  const [code, setCode] = useState("");
  const [level, setLevel] = useState("");
  const matches = languageOptions.filter(o => !query || [o.label, o.english, o.code].some(s => optionKey(s).includes(optionKey(query))));
  const options = matches.slice(0, 150);
  const chosen = languageOptions.find(o => o.code === code);
  function add() {
    if (!chosen) return;
    const formatted = `${chosen.label}${level ? ` (${level})` : ""}`;
    onChange([...value.filter(v => parseLanguage(v).code !== code), formatted]);
    setCode(""); setQuery("");
  }
  return <div className="min-w-0">
    <ul className="mt-3 space-y-2">{value.map((v, index) => <li key={`${v}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
      <span className="min-w-0 flex-1 break-words">{parseLanguage(v).name}</span>
      <select aria-label={`Nível de ${parseLanguage(v).name}`} className="rounded-lg border bg-white p-2" value={parseLanguage(v).level} onChange={e => onChange(value.map((item, i) => i === index ? `${parseLanguage(item).name}${e.target.value ? ` (${e.target.value})` : ""}` : item))}>
        <option value="">Sem nível indicado</option>{languageLevels.map(l => <option key={l}>{l}</option>)}
      </select><button type="button" aria-label={`Remover ${v}`} className="p-2" onClick={() => onChange(value.filter((_, i) => i !== index))}>×</button>
    </li>)}</ul>
    <input className={fieldClass} aria-label={`Pesquisar ${label}`} placeholder="Pesquisar idioma pelo nome ou código" value={query} onChange={e => { setQuery(e.target.value); setCode(""); }} />
    <select className={fieldClass} aria-label={`Selecionar ${label}`} value={code} onChange={e => setCode(e.target.value)}>
      <option value="">Selecionar idioma</option>{options.map(o => <option value={o.code} key={o.code}>{o.label} · {o.code}</option>)}
    </select>
    {matches.length > 150 && <p className="mt-1 text-xs text-slate-500">Pesquisa para encontrar qualquer um dos {languageOptions.length} idiomas.</p>}
    <div className="mt-2 flex flex-wrap gap-2"><select aria-label="Nível do novo idioma" className="min-w-0 flex-1 rounded-xl border bg-white p-3 text-sm" value={level} onChange={e => setLevel(e.target.value)}><option value="">Sem nível indicado</option>{languageLevels.map(l => <option key={l}>{l}</option>)}</select><button type="button" disabled={!code} onClick={add} className="rounded-xl bg-[#07111F] px-4 py-3 text-sm text-white disabled:opacity-50">Adicionar</button></div>
    <p className="mt-2 text-xs text-slate-500">A1–C2: níveis do QECR. Indica apenas o nível que consegues demonstrar.</p>
  </div>;
}

export function JobLanguagePicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return <div className="mt-3 grid min-w-0 gap-5">
    {["Falado", "Escrito"].map(channel => <div key={channel}><p className="text-sm font-semibold">{channel === "Falado" ? "Idiomas falados" : "Idiomas escritos"}</p><LanguagePicker label={channel === "Falado" ? "idiomas falados" : "idiomas escritos"} value={value.filter(v => v.startsWith(`${channel}: `)).map(v => v.slice(channel.length + 2))} onChange={values => onChange([...value.filter(v => !v.startsWith(`${channel}: `)), ...values.map(v => `${channel}: ${v}`)])} /></div>)}
    {value.some(v => !/^(Falado|Escrito): /.test(v)) && <div><p className="text-sm font-semibold">Idiomas gerais já registados</p><LanguagePicker value={value.filter(v => !/^(Falado|Escrito): /.test(v))} onChange={values => onChange([...value.filter(v => /^(Falado|Escrito): /.test(v)), ...values])} /></div>}
  </div>;
}

export function TagPicker({ value, onChange, label = "Competências" }: { value: string[]; onChange: (value: string[]) => void | Promise<void>; label?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const q = optionKey(query).replace(/[%,_*]/g, "");
      const { data, error: readError } = await supabase.from("profile_tags").select("label").ilike("normalized_label", `%${q}%`).order("label").limit(20);
      if (!cancelled) { setOptions(data?.map(o => o.label) || []); if (readError) setError("Não foi possível carregar as sugestões."); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);
  async function add(name = query) {
    if (busy || !name.trim()) return;
    setBusy(true); setError("");
    try {
      const { data, error: saveError } = await supabase.rpc("ensure_profile_tag", { p_label: name.trim() });
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
    <div className="mt-3 flex flex-wrap gap-2">{value.map((v, i) => <button disabled={busy} type="button" key={`${v}-${i}`} aria-label={`Remover ${v}`} onClick={() => { void remove(i); }} className="max-w-full break-words rounded-xl bg-blue-50 px-3 py-2 text-left text-sm text-blue-800">{v} ×</button>)}</div>
    <div className="flex min-w-0 gap-2"><input aria-label={label} list={id} value={query} maxLength={80} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void add(); } }} className={fieldClass} placeholder="Escrever para selecionar ou criar uma tag" /><button disabled={busy || !query.trim()} type="button" onClick={() => { void add(); }} className="mt-2 rounded-xl bg-[#07111F] px-4 text-white disabled:opacity-50">{busy ? "…" : "+"}</button></div>
    <datalist id={id}>{options.map(v => <option key={v} value={v} />)}</datalist>
    <p className="mt-2 text-xs text-slate-500">Seleciona uma sugestão e adiciona-a. Novas tags ficam disponíveis para candidatos e empresas. Não introduzas dados pessoais.</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
