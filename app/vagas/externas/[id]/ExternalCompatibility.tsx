'use client';
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { LText } from '@/lib/i18n/client';
import type { externalCompatibility } from '@/lib/external-jobs/compatibility';
export default function ExternalCompatibility({id}:{id:string}){
 const [result,setResult]=useState<ReturnType<typeof externalCompatibility>|null>(null),[error,setError]=useState(false),[hidden,setHidden]=useState(false);
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  void authenticatedFetch(`/api/external-jobs/${id}/compatibility`,{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(response.status===403){if(active)setHidden(true);return;}
   if(!response.ok)throw new Error('Unavailable');const value=await response.json();if(active)setResult(value);
  }).catch(()=>{if(active)setError(true);});
  return()=>{active=false;controller.abort();};
 },[id]);
 if(hidden)return null;
 return <section className="mt-7 rounded-2xl border bg-slate-50 p-5"><h2 className="font-semibold"><LText text="Compatibilidade" /></h2>{error?<p className="mt-3 text-sm" role="status"><LText text="Não foi possível consultar a compatibilidade." /></p>:!result?<p className="mt-3 text-sm"><LText text="A carregar..." /></p>:<><p className="mt-3 text-sm"><LText text="Informação insuficiente para calcular a compatibilidade." /></p><p className="mt-2 text-xs leading-5 text-slate-600"><LText text="A fonte fornece apenas um excerto. As coincidências abaixo não confirmam requisitos obrigatórios nem substituem a leitura do anúncio completo." /></p>{result.mentions.length>0?<><h3 className="mt-4 text-sm font-semibold"><LText text="Competências do teu perfil mencionadas no anúncio" /></h3><ul className="mt-3 flex flex-wrap gap-2">{result.mentions.map(item=><li key={item.skill} className="rounded-full border bg-white px-3 py-1 text-sm">{item.skill}</li>)}</ul></>:<p className="mt-4 text-sm"><LText text={result.hasProfileSkills?'Não foram identificadas coincidências explícitas. Isto não significa que o teu perfil seja incompatível.':'Adiciona competências ao teu perfil para comparar com esta oferta.'} /></p>}</>}</section>;
}
