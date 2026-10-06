'use client';
import { useEffect, useId, useState } from 'react';
import { LText } from '@/lib/i18n/client';
import { supabase } from '@/lib/supabase';
import { OccupationCombobox } from './OccupationCombobox';
import { TagPicker } from './ProfileFields';
import { completePreferences, emptyMatchingPreferences, PROFESSIONAL_AREAS, OPPORTUNITY_TYPES, SENIORITIES, WORK_MODELS, type MatchingPreferences } from '@/lib/matching-preferences';
export function useMatchingPreferences(kind:'candidate'|'job',id:string|null){
 const [value,setValue]=useState<MatchingPreferences>(emptyMatchingPreferences);
 const [loadedId,setLoadedId]=useState<string|null>(null),[error,setError]=useState('');
 useEffect(()=>{if(!id)return;let active=true;
 void supabase.from(kind==='candidate'?'student_profiles':'jobs').select('matching_preferences').eq('id',id).single().then(({data,error})=>{if(!active)return;if(error){setError('Não foi possível carregar as preferências profissionais.');return;}setValue(data.matching_preferences||emptyMatchingPreferences());setLoadedId(id);setError('');});
 return()=>{active=false;};},[kind,id]);
 return {value,setValue,ready:!id||loadedId===id,error};
}
export function MatchingFields({value,onChange,kind,disabled=false,opportunity,onOpportunityChange}:{value:MatchingPreferences;onChange:(v:MatchingPreferences)=>void;kind:'candidate'|'job';disabled?:boolean;opportunity:string;onOpportunityChange:(v:string)=>void}){
 const id=useId();
 const update=(patch:Partial<MatchingPreferences>)=>onChange({...value,...patch,confirmed:false});
 const toggle=(key:'levels'|'models',code:string)=>update({[key]:value[key].includes(code)?value[key].filter(x=>x!==code):[...value[key],code]});
 const field='mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-900';
 return <fieldset disabled={disabled} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 sm:p-7">
 <legend className="px-2 text-lg font-semibold"><LText text={kind==='candidate'?'Preferências profissionais':'Perfil procurado'} /></legend>
 <p className="text-sm text-slate-600"><LText text="Confirma os cinco campos para uma comparação consistente entre perfis e vagas. Podes guardar o perfil incompleto e terminar mais tarde." /></p>
 <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2">
 <OccupationCombobox value={value.profession} onChange={profession=>update({profession})} disabled={disabled} />
 <label className="min-w-0 text-sm font-semibold"><LText text="Área profissional" /><select className={field} value={value.area} onChange={e=>update({area:e.target.value})}><option value=""><LText text="Selecionar área profissional" /></option>{PROFESSIONAL_AREAS.map(a=><option key={a} value={a}><LText text={a} /></option>)}</select><span className="mt-2 block text-xs font-normal text-slate-500"><LText text="Seleciona a área da função, independentemente do setor da empresa." /></span></label>
 <fieldset><legend className="text-sm font-semibold"><LText text={kind==='candidate'?'Senioridade na profissão':'Senioridades aceites'} /></legend>{Object.entries(SENIORITIES).map(([code,label])=><label key={code} className="mt-2 flex items-center gap-2 text-sm"><input type={kind==='candidate'?'radio':'checkbox'} name={`${id}-seniority`} checked={value.levels.includes(code)} onChange={()=>kind==='candidate'?update({levels:[code]}):toggle('levels',code)} /><LText text={label} /></label>)}</fieldset>
 <fieldset><legend className="text-sm font-semibold"><LText text={kind==='candidate'?'Modelos de trabalho aceites':'Modelos de trabalho oferecidos'} /></legend>{Object.entries(WORK_MODELS).map(([code,label])=><label key={code} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={value.models.includes(code)} onChange={()=>toggle('models',code)} /><LText text={label} /></label>)}</fieldset>
 </div><label className="mt-5 block text-sm font-semibold"><LText text="Tipo de oportunidade" /><select id={`${id}-opportunity`} className={field} value={opportunity} onChange={e=>onOpportunityChange(e.target.value)}><option value=""><LText text="Selecionar tipo" /></option>{opportunity&&!OPPORTUNITY_TYPES.includes(opportunity)&&<option value={opportunity}><LText text={opportunity} /></option>}{OPPORTUNITY_TYPES.map(o=><option key={o} value={o}><LText text={o} /></option>)}</select><span className="mt-2 block text-xs font-normal text-slate-500"><LText text="Estágio, contrato ou duração do trabalho. Pode combinar-se com presencial, híbrido ou remoto." /></span></label><div className="mt-5"><h3 className="text-sm font-semibold"><LText text={kind==='candidate'?'Competências que possuo':'Competências essenciais'} /></h3><TagPicker value={value.skills} onChange={skills=>update({skills})} /><p className="mt-2 text-xs text-slate-500"><LText text="Seleciona entre 1 e 50 competências relevantes." /></p></div>
 <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" disabled={disabled||!completePreferences(value)||value.skills.length>50} checked={value.confirmed} onChange={e=>onChange({...value,confirmed:e.target.checked})} /><LText text="Confirmo que estes cinco campos representam o perfil profissional pretendido." /></label>
 </fieldset>;
}
