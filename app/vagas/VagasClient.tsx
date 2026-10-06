"use client";
import { LText, LElement, useI18n } from "@/lib/i18n/client";


import { supabase } from "@/lib/supabase";
import { hideCompanyNames } from "@/lib/job-visibility";
import Link from "@/lib/i18n/link";
import { useEffect, useState } from "react";
import type { JobSearchResult } from "@/lib/public-job-search";

export type Job = {
  origin?: "external";
  external_id?: string;
  company_name?: string;
  last_seen_at?: string;
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  location: string | null;
  country_code: string | null;
  work_mode: string | null;
  work_model: string | null;
  contract_type: string | null;
  seniority: string | null;
  is_active: boolean | null;
  created_at: string;
};

const workModelLabels: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  presential: "Presencial",
};

export default function VagasPage({ initialResult, initialSearch, countries }: { countries:{code:string;display:string}[]; initialResult: JobSearchResult; initialSearch:string }) {
  const { locale: displayLocale } = useI18n();
  const [result,setResult] = useState(initialResult);
  const [page,setPage]=useState(1);
  const [error,setError]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [accessToken,setAccessToken]=useState("");
  useEffect(()=>{
    let active=true;
    void supabase.auth.getSession().then(({data})=>{if(active)setAccessToken(data.session?.access_token||"");});
    const {data}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!active)return;
      setAccessToken(session?.access_token||"");
      if(!session)setResult(current=>({...current,jobs:hideCompanyNames(current.jobs)}));
    });
    return()=>{active=false;data.subscription.unsubscribe();};
  },[]);
  const [search, setSearch] = useState(initialSearch);
  const [origin, setOrigin] = useState("");
  const [area, setArea] = useState("");
  const [contractType, setContractType] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const locations=result.locations.map(label=>({label,value:label}));
  const areas=result.areas,contractTypes=result.contracts,filteredJobs=result.jobs;
  const [isLoading,setIsLoading]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setIsLoading(true);setError(false);
      try{
        const params=new URLSearchParams({q:search,origin,country,location,area,contract:contractType,model:workModel,page:String(page)});
        const response=await fetch(`/api/vagas?${params}`,{signal:controller.signal,cache:'no-store',headers:accessToken?{Authorization:`Bearer ${accessToken}`}:{}});
        if(!response.ok)throw new Error('Unavailable');
        const value=await response.json();
        if(!controller.signal.aborted)setResult(value);
      }catch{if(!controller.signal.aborted)setError(true);}
      finally{if(!controller.signal.aborted)setIsLoading(false);}
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[search,origin,country,location,area,contractType,workModel,page,refresh,accessToken]);

  function clearFilters() {
    setPage(1);
    setOrigin("");
    setSearch("");
    setArea("");
    setContractType("");
    setWorkModel("");
    setCountry("");
    setLocation("");
  }

  function clearScopedFilters() {
    // These options depend on country/origin; never retain an invisible selection.
    setLocation("");
    setArea("");
    setContractType("");
    setPage(1);
  }

  const internalJobs=filteredJobs.filter(job=>job.origin!=='external');
  const externalJobs=filteredJobs.filter(job=>job.origin==='external');
  const activeFilters=[country,location,area,contractType,workModel].filter(Boolean).length;
  const selectClass="mt-2 w-full min-w-0 rounded-xl border border-[#DDE3EA] bg-white px-3 py-3 text-sm font-normal text-[#07111F] outline-none focus:border-[#1683FF] focus:ring-2 focus:ring-blue-100";
  return <main className="min-h-screen bg-[#F7F9FC] text-[#07111F]">
    <section className="border-b border-[#DDE3EA] bg-white px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1683FF]"><LText text="Oportunidades profissionais" /></p>
        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-[-0.045em] sm:text-5xl"><LText text="Descobre a próxima oportunidade." /></h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600"><LText text="Vagas de empresas na ARYNQO, seguidas de oportunidades de fontes externas." /></p>
        <div className="mt-7 rounded-2xl border border-[#DDE3EA] bg-[#F7F9FC] p-4 sm:p-5" onChange={()=>setPage(1)}>
          <div className="grid min-w-0 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(160px,240px)_auto]">
            <label className="min-w-0 text-sm font-semibold"><LText text="Pesquisar vagas" /><LElement as="input" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar vaga, área ou localização..." className={selectClass} /></label>
            <label className="min-w-0 text-sm font-semibold"><LText text="País" /><LElement as="select" aria-label="País" value={country} onChange={e=>{setCountry(e.target.value);clearScopedFilters();}} className={selectClass}><option value=""><LText text="Todos" /></option>{countries.map(item=><option key={item.code} value={item.code}>{item.display}</option>)}</LElement></label>
            <button type="button" aria-expanded={filtersOpen} aria-controls="vacancy-filters" onClick={()=>setFiltersOpen(!filtersOpen)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600"><LText text="Filtros" />{activeFilters>0&&<span className="rounded-full bg-blue-100 px-2 text-blue-800">{activeFilters}</span>}<span aria-hidden="true">{filtersOpen?'−':'+'}</span></button>
          </div>
          <div id="vacancy-filters" hidden={!filtersOpen} className="mt-5 border-t border-slate-200 pt-5">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="min-w-0 text-sm font-semibold"><LText text="Localização" /><LElement as="select" aria-label="Localização" value={location} onChange={e=>setLocation(e.target.value)} className={selectClass}><option value=""><LText text="Todas" /></option>{locations.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</LElement></label>
              <label className="min-w-0 text-sm font-semibold"><LText text="Área profissional" /><LElement as="select" aria-label="Área profissional" value={area} onChange={e=>setArea(e.target.value)} className={selectClass}><option value=""><LText text="Todas as áreas" /></option>{areas.map(item=><option key={item} value={item}><LText text={item} /></option>)}</LElement></label>
              <label className="min-w-0 text-sm font-semibold"><LText text="Tipo de contrato" /><LElement as="select" aria-label="Tipo de contrato" value={contractType} onChange={e=>setContractType(e.target.value)} className={selectClass}><option value=""><LText text="Todos os tipos" /></option>{contractTypes.map(item=><option key={item} value={item}><LText text={item} /></option>)}</LElement></label>
              <label className="min-w-0 text-sm font-semibold"><LText text="Modelo de trabalho" /><LElement as="select" aria-label="Modelo de trabalho" value={workModel} onChange={e=>setWorkModel(e.target.value)} className={selectClass}><option value=""><LText text="Todos os modelos" /></option>{Object.entries(workModelLabels).map(([value,label])=><option key={value} value={value}><LText text={label} /></option>)}</LElement></label>
            </div>
          </div>
          {(activeFilters>0||search||origin)&&<button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-blue-700 underline underline-offset-4"><LText text="Limpar filtros" /></button>}
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9" aria-busy={isLoading}>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <LElement as="div" role="group" aria-label="Origem da vaga" className="flex max-w-full flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
          {[['','Todas'],['internal','ARYNQO'],['external','Vagas externas']].map(([value,label])=><button key={value} type="button" aria-pressed={origin===value} onClick={()=>{setOrigin(value);clearScopedFilters();}} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-500 ${origin===value?'bg-[#07111F] text-white':'text-slate-600 hover:bg-slate-100'}`}><LText text={label} /></button>)}
        </LElement>
        <p role="status" aria-live="polite" className="text-sm text-slate-600">{isLoading?<LText text="A carregar vagas..." />:<><strong className="text-[#07111F]">{result.total}</strong><LText text=" vagas encontradas" /></>}</p>
      </div>
      {error?<div role="alert" className="rounded-2xl border bg-white p-6"><LText text="Não foi possível carregar as vagas." /><button type="button" className="ml-4 text-blue-700 underline" onClick={()=>setRefresh(n=>n+1)}><LText text="Tentar novamente" /></button></div>:isLoading?<div className="space-y-4" aria-hidden="true">{[0,1,2].map(n=><div key={n} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none" />)}</div>:result.total===0?<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><h2 className="text-xl font-bold"><LText text="Nenhuma vaga encontrada" /></h2><p className="mt-3 text-sm text-slate-600"><LText text="Tenta alterar os filtros ou pesquisar outro termo." /></p><button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white"><LText text="Limpar filtros" /></button></div>:<>
        {internalJobs.length>0&&<section aria-labelledby="arynqo-jobs-heading"><div className="mb-4 flex items-center gap-3"><span aria-hidden="true" className="h-6 w-1 rounded-full bg-[#1683FF]" /><h2 id="arynqo-jobs-heading" className="text-lg font-bold"><LText text="Empresas na ARYNQO" /></h2></div><div className="grid gap-4">{internalJobs.map(job=><VacancyCard key={job.id} job={job} locale={displayLocale} />)}</div></section>}
        {externalJobs.length>0&&<section aria-labelledby="external-jobs-heading" className={internalJobs.length?'mt-10':''}><h2 id="external-jobs-heading" className="text-lg font-bold"><LText text="Outras oportunidades" /></h2><p className="mb-5 mt-2 max-w-2xl text-sm leading-6 text-slate-600"><LText text="Registo gratuito de candidato necessário para consultar esta oferta." /> <LText text="A candidatura é feita fora da ARYNQO. O estado não é acompanhado nesta plataforma." /></p><div className="grid gap-4">{externalJobs.map(job=><VacancyCard key={job.id} job={job} locale={displayLocale} />)}</div></section>}
        {result.total>20&&<LElement as="nav" aria-label="Paginação" className="mt-8 flex flex-wrap items-center justify-center gap-4"><button type="button" disabled={result.page<=1} onClick={()=>setPage(result.page-1)} className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold disabled:opacity-40"><LText text="Anterior" /></button><span className="text-sm text-slate-600">{result.page} / {Math.ceil(result.total/20)}</span><button type="button" disabled={result.page*20>=result.total} onClick={()=>setPage(result.page+1)} className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold disabled:opacity-40"><LText text="Seguinte" /></button></LElement>}
      </>}
    </section>
  </main>;
}

function VacancyCard({job,locale}:{job:Job;locale:string}){
 const external=job.origin==='external',model=job.work_model||job.work_mode||'';
 return <article className={`min-w-0 rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md sm:p-6 ${external?'border-slate-200':'border-blue-200'}`}>
  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
   <p className="min-w-0 break-words text-sm font-semibold text-slate-600">{job.company_name||<LText text={job.area||'Área não definida'} />}</p>
   <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${external?'bg-slate-100 text-slate-600':'bg-blue-50 text-blue-700'}`}>{external?<LText text="Vaga externa" />:'ARYNQO'}</span>
  </div>
  <h3 className="mt-3 break-words text-xl font-bold leading-snug tracking-tight"><Link href={external?`/vagas/externas/${job.external_id}`:`/vagas/${job.id}`} className="hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">{job.title}</Link></h3>
  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">{job.location&&<span className="break-words">{job.location}</span>}{model&&<span><LText text={workModelLabels[model]||model} /></span>}{job.contract_type&&<span><LText text={job.contract_type} /></span>}{job.seniority&&<span><LText text={job.seniority} /></span>}</div>
  {!external&&job.description&&<p className="mt-4 line-clamp-2 break-words text-sm leading-6 text-slate-500">{job.description}</p>}
  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
   <div className="text-xs text-slate-500"><p><LText text="Publicada em " />{new Intl.DateTimeFormat(locale,{timeZone:'Europe/Lisbon'}).format(new Date(job.created_at))}</p>{external&&<p className="mt-1"><LText text="Vaga externa" /></p>}</div>
   <Link href={external?`/vagas/externas/${job.external_id}`:`/vagas/${job.id}`} className={`inline-flex min-h-11 items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold transition ${external?'border border-slate-300 text-[#07111F] hover:border-blue-500':'bg-[#07111F] text-white hover:bg-blue-700'}`}><LText text={external?'Ver oferta externa':'Ver vaga'} /><span aria-hidden="true">↗</span></Link>
  </div>
 </article>;
}
