'use client';
import { useEffect, useId, useState } from 'react';
import { LText, useI18n } from '@/lib/i18n/client';
import { supabase } from '@/lib/supabase';
import { TagPicker } from './ProfileFields';
import { completePreferences, emptyMatchingPreferences, PROFESSIONAL_AREAS, SENIORITIES, WORK_MODELS, type MatchingPreferences } from '@/lib/matching-preferences';
export function useMatchingPreferences(kind:'candidate'|'job',id:string|null){
 const [value,setValue]=useState<MatchingPreferences>(emptyMatchingPreferences);
 const [loadedId,setLoadedId]=useState<string|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!id)return;let active=true;
 void supabase.from(kind==='candidate'?'student_profiles':'jobs').select('matching_preferences').eq('id',id).single().then(({data,error})=>{if(!active)return;if(error){setError('Não foi possível carregar as preferências profissionais.');return;}setValue(data.matching_preferences||emptyMatchingPreferences());setLoadedId(id);setError('');});
 return()=>{active=false;};},[kind,id]);
 return {value,setValue,ready:!id||loadedId===id,error};
}
export function MatchingFields({value,onChange,kind,disabled=false}:{value:MatchingPreferences;onChange:(v:MatchingPreferences)=>void;kind:'candidate'|'job';disabled?:boolean}){
 const {locale}=useI18n(),id=useId();const [query,setQuery]=useState(''),[items,setItems]=useState<{id:string;label:string}[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const abort=new AbortController();const timer=setTimeout(()=>{void fetch(`/api/occupations?locale=${locale}&q=${encodeURIComponent(query)}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{setItems(d.items);setError('');}).catch(e=>{if(e.name!=='AbortError')setError('Não foi possível carregar as profissões.');});},200);return()=>{clearTimeout(timer);abort.abort();};},[query,locale]);
 useEffect(()=>{if(!value.profession)return;const abort=new AbortController();void fetch(`/api/occupations?locale=${locale}&id=${encodeURIComponent(value.profession)}`,{signal:abort.signal}).then(r=>r.json()).then(d=>setSelected(d.items[0]?.label||'')).catch(()=>{});return()=>abort.abort();},[value.profession,locale]);
 const update=(patch:Partial<MatchingPreferences>)=>onChange({...value,...patch,confirmed:false});
 const toggle=(key:'levels'|'models',code:string)=>update({[key]:value[key].includes(code)?value[key].filter(x=>x!==code):[...value[key],code]});
 const field='mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-900';
 return <fieldset disabled={disabled} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-7">
 <legend className="px-2 text-lg font-semibold"><LText text={kind==='candidate'?'Preferências profissionais':'Perfil procurado'} /></legend>
 <p className="text-sm text-slate-600"><LText text="Confirma os cinco campos para uma comparação consistente entre perfis e vagas. Podes guardar o perfil incompleto e terminar mais tarde." /></p>
 <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
 <div className="min-w-0"><label htmlFor={`${id}-query`} className="text-sm font-semibold"><LText text="Pesquisar profissão" /></label><input id={`${id}-query`} className={field} value={query} onChange={e=>setQuery(e.target.value)} />
 <label htmlFor={`${id}-profession`} className="mt-3 block text-sm font-semibold"><LText text="Profissão" /></label><select id={`${id}-profession`} className={field} value={value.profession} onChange={e=>{setSelected(items.find(i=>i.id===e.target.value)?.label||'');update({profession:e.target.value});}}><option value=""><LText text="Selecionar profissão" /></option>{value.profession&&!items.some(i=>i.id===value.profession)&&<option value={value.profession}>{selected||value.profession}</option>}{items.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select><p className="mt-2 text-xs text-slate-500">ESCO · © European Union · CC BY 4.0</p></div>
 <label className="min-w-0 text-sm font-semibold"><LText text="Área profissional" /><select className={field} value={value.area} onChange={e=>update({area:e.target.value})}><option value=""><LText text="Selecionar área profissional" /></option>{PROFESSIONAL_AREAS.map(a=><option key={a} value={a}><LText text={a} /></option>)}</select><span className="mt-2 block text-xs font-normal text-slate-500"><LText text="Seleciona a área da função, independentemente do setor da empresa." /></span></label>
 <fieldset><legend className="text-sm font-semibold"><LText text={kind==='candidate'?'Senioridade na profissão':'Senioridades aceites'} /></legend>{Object.entries(SENIORITIES).map(([code,label])=><label key={code} className="mt-2 flex items-center gap-2 text-sm"><input type={kind==='candidate'?'radio':'checkbox'} name={`${id}-seniority`} checked={value.levels.includes(code)} onChange={()=>kind==='candidate'?update({levels:[code]}):toggle('levels',code)} /><LText text={label} /></label>)}</fieldset>
 <fieldset><legend className="text-sm font-semibold"><LText text={kind==='candidate'?'Modelos de trabalho aceites':'Modelos de trabalho oferecidos'} /></legend>{Object.entries(WORK_MODELS).map(([code,label])=><label key={code} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={value.models.includes(code)} onChange={()=>toggle('models',code)} /><LText text={label} /></label>)}</fieldset>
 </div><div className="mt-5"><h3 className="text-sm font-semibold"><LText text={kind==='candidate'?'Competências que possuo':'Competências essenciais'} /></h3><TagPicker value={value.skills} onChange={skills=>update({skills})} /><p className="mt-2 text-xs text-slate-500"><LText text="Seleciona entre 1 e 50 competências relevantes." /></p></div>
 <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" disabled={disabled||!completePreferences(value)||value.skills.length>50} checked={value.confirmed} onChange={e=>onChange({...value,confirmed:e.target.checked})} /><LText text="Confirmo que estes cinco campos representam o perfil profissional pretendido." /></label>
 {error&&<p role="alert" className="mt-3 text-sm text-red-700"><LText text={error} /></p>}
 </fieldset>;
}
