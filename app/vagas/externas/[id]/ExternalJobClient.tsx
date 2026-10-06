'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { supabase } from '@/lib/supabase';
import { LText, useI18n } from '@/lib/i18n/client';
import { localizedPath } from '@/lib/i18n/config';
import Link from '@/lib/i18n/link';
import ExternalCompatibility from './ExternalCompatibility';
type Advert={title:string;company_name:string;description:string;location:string;source_url:string;created_at:string};
export default function ExternalJobClient({id}:{id:string}){
 const {locale}=useI18n();const [job,setJob]=useState<Advert|null>(null),[login,setLogin]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const requestVersion=useRef({version:0});
 const next=encodeURIComponent(localizedPath(`/vagas/externas/${id}`,locale));
 const load=useCallback(async()=>{
  const version=++requestVersion.current.version;
  setLoading(true);setJob(null);setError('');setLogin(false);
  try{const response=await authenticatedFetch(`/api/external-jobs/${id}`,{cache:'no-store'});const value=await response.json();if(version!==requestVersion.current.version)return;if(response.status===401){setLogin(true);return;}if(!response.ok)throw new Error(value.error);setJob(value);}catch(e){if(version!==requestVersion.current.version)return;if(e instanceof Error&&e.message==='Inicia sessão para continuar.')setLogin(true);else setError(e instanceof Error?e.message:'Não foi possível consultar esta oferta.');}finally{if(version===requestVersion.current.version)setLoading(false);}
 },[id]);
 useEffect(()=>{let active=true;const counter=requestVersion.current;queueMicrotask(()=>{if(active)void load();});const {data}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){requestVersion.current.version++;setLoading(false);setJob(null);setLogin(true);}});return ()=>{active=false;counter.version++;data.subscription.unsubscribe();};},[load]);
 return <div className="min-h-screen bg-white text-slate-900 [color-scheme:light]"><main className="mx-auto max-w-3xl px-5 py-12"><Link href="/vagas" className="text-sm text-blue-700 underline"><LText text="Ver vagas" /></Link><p className="mt-6 text-sm font-semibold text-blue-700"><LText text="Vaga externa" /></p>
 {loading?<p className="mt-6"><LText text="A carregar..." /></p>:login?<section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10"><h1 className="text-3xl font-bold"><LText text="Cria a tua conta gratuita para consultar esta oferta" /></h1><p className="mt-4 leading-7 text-slate-600"><LText text="Regista-te como candidato ou inicia sessão. Depois regressas a esta vaga. Completa o teu perfil para encontrares oportunidades compatíveis na ARYNQO." /></p><div className="mt-7 flex flex-wrap gap-3"><Link href={`/registo?next=${next}`} className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white"><LText text="Criar conta gratuita" /></Link><Link href={`/login?next=${next}`} className="rounded-full border px-6 py-3 text-sm font-semibold"><LText text="Já tenho conta" /></Link></div></section>:error?<p role="alert" className="mt-6 rounded-xl border border-slate-200 bg-white p-5"><LText text={error} /></p>:job?<article className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10"><h1 className="break-words text-3xl font-bold">{job.title}</h1><p className="mt-3 text-lg">{job.company_name}</p><p className="mt-2 text-sm text-slate-600">{job.location}</p><p className="mt-6 whitespace-pre-wrap break-words leading-7 text-slate-700">{job.description}</p><ExternalCompatibility key={id} id={id} /><a href={job.source_url} target="_blank" rel="noopener noreferrer nofollow sponsored" className="mt-7 inline-block rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white"><LText text="Candidatar no site de origem" /> ↗</a><p className="mt-4 text-xs leading-5 text-slate-600"><LText text="A candidatura é feita fora da ARYNQO. O estado não é acompanhado nesta plataforma." /></p><Link href="/dashboard/perfil" className="mt-7 block text-sm text-blue-700 underline"><LText text="Completar o meu perfil" /></Link></article>:null}
 </main></div>;
}
