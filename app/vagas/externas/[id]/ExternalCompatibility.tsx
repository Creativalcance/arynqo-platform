"use client";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { LText } from "@/lib/i18n/client";
import Link from "@/lib/i18n/link";
import type { assessExternalJob } from "@/lib/external-jobs/assessment";

type Result = ReturnType<typeof assessExternalJob>;
type State = {id:string; status:"ready"; data:Result} | {id:string;status:"error"|"hidden"};
const labels = {aligned:"Coincidência explícita",review:"Por confirmar",unknown:"Sem informação suficiente no anúncio",missing_profile:"Não indicado no perfil"};

export default function ExternalCompatibility({id}:{id:string}) {
 const [state,setState]=useState<State|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true; const controller=new AbortController();
  void authenticatedFetch(`/api/external-jobs/${id}/compatibility`,{cache:"no-store",signal:controller.signal}).then(async response=>{
   if(response.status===403){if(active)setState({id,status:"hidden"});return;}
   if(!response.ok)throw new Error("Unavailable");
   const data=await response.json();if(active)setState({id,status:"ready",data});
  }).catch(()=>{if(active)setState({id,status:"error"});});
  return()=>{active=false;controller.abort();};
 },[id,attempt]);
 const current=state?.id===id?state:null;
 if(current?.status==="hidden")return null;
 const result=current?.status==="ready"?current.data:null;
 return <section className="mt-7 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-slate-900 [color-scheme:light]">
  <h2 className="font-semibold"><LText text="Compatibilidade" /></h2>
  {current?.status==="error"?<div role="status" className="mt-3 text-sm"><LText text="Não foi possível consultar a compatibilidade." /><button type="button" className="ml-3 min-h-11 text-blue-700 underline" onClick={()=>{setState(null);setAttempt(n=>n+1);}}><LText text="Tentar novamente" /></button></div>:!result?<p className="mt-3 text-sm"><LText text="A carregar..." /></p>:<>
   <p className="mt-3 text-sm font-medium"><LText text="Comparação parcial com o teu perfil" /></p>
   {result.mentions.length>0?<Evidence title="Competências do teu perfil mencionadas no anúncio" items={result.mentions} />:<p className="mt-4 text-sm"><LText text={result.hasProfileSkills?"Não foram identificadas coincidências explícitas. Isto não significa que o teu perfil seja incompatível.":"Adiciona competências ao teu perfil para comparar com esta oferta."} /></p>}
   {result.notRequired.length>0&&<Evidence title="Competências indicadas como não necessárias" items={result.notRequired} />}
   <dl className="mt-6 divide-y divide-slate-200">
    {result.criteria.map(item=><div key={item.key} className="py-4 text-sm">
     <dt className="flex flex-wrap items-start justify-between gap-2 font-semibold"><LText text={item.key} /><span className={`text-xs font-normal ${item.state==='aligned'?'text-blue-700':'text-slate-600'}`}><LText text={labels[item.state]} /></span></dt>
     <dd className="mt-2 grid min-w-0 gap-2 break-words text-slate-600 sm:grid-cols-2">
      <p><strong className="font-medium"><LText text="O teu perfil" />: </strong>{item.candidate||'—'}</p>
      <p><strong className="font-medium"><LText text="Vaga" />: </strong>{item.offer||'—'}</p>
     </dd>
    </div>)}
   </dl>
   <p className="mt-4 text-xs text-slate-600"><LText text="Informação insuficiente para calcular a compatibilidade." /></p>
   <Link href="/dashboard/perfil" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline"><LText text="Completar perfil" /></Link>
  </>}
 </section>;
}
function Evidence({title,items}:{title:string;items:Result['mentions']}) {
 return <div className="mt-5"><h3 className="text-sm font-semibold"><LText text={title} /></h3><ul className="mt-3 space-y-3">{items.map(item=><li key={item.skill} className="rounded-xl border border-slate-200 bg-white text-slate-900 px-4 py-3 text-sm"><details><summary className="cursor-pointer font-semibold">{item.skill}</summary><blockquote className="mt-3 whitespace-pre-wrap break-words border-l-2 border-blue-400 pl-3 text-slate-600">{item.excerpt}</blockquote></details></li>)}</ul></div>;
}
