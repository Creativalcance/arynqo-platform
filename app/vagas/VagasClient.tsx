"use client";
import { LText, LElement, useI18n } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { useEffect, useRef, useState } from "react";
import { ADZUNA_ATTRIBUTION_URL } from "@/lib/external-jobs/adzuna";
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
  const firstRequest=useRef(true);
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
    if(firstRequest.current){firstRequest.current=false;return;}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setIsLoading(true);setError(false);
      try{
        const params=new URLSearchParams({q:search,origin,country,location,area,contract:contractType,model:workModel,page:String(page)});
        const response=await fetch(`/api/vagas?${params}`,{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw new Error('Unavailable');
        const value=await response.json();
        if(!controller.signal.aborted)setResult(value);
      }catch{if(!controller.signal.aborted)setError(true);}
      finally{if(!controller.signal.aborted)setIsLoading(false);}
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[search,origin,country,location,area,contractType,workModel,page]);

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

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#07111F]">
      <section className="border-b border-[#DDE3EA] bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex rounded-full border border-[#1683FF]/20 bg-[#1683FF]/10 px-5 py-2 text-sm font-semibold text-[#1683FF]">
            <LText text={"Oportunidades profissionais"} /></p>

          <h1 className="mt-8 max-w-3xl text-5xl font-black tracking-[-0.06em] md:text-6xl">
            <LText text={"Descobre a próxima oportunidade."} /></h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            <LText text={"Explora vagas alinhadas com as tuas competências, experiência e objetivos profissionais."} /></p>

          <div className="mt-10 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-sm">
            <div onChange={() => setPage(1)} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:w-full">
              <label className="text-sm font-semibold text-slate-600"><LText text="Origem da vaga" /><select value={origin} onChange={event=>setOrigin(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-4 text-sm"><option value=""><LText text="Todas" /></option><option value="internal">ARYNQO</option><option value="external"><LText text="Vagas externas" /></option></select></label>
              <LElement as="input"
                aria-label="Pesquisar vagas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar vaga, área ou localização..."
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              />

              <label className="block min-w-0 text-sm font-semibold text-slate-600">
                <LText text="País" />
                <LElement as="select" aria-label="País" value={country}
                  onChange={event => { setCountry(event.target.value); setLocation(""); }}
                  className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-4 py-4 text-sm font-normal text-[#07111F] focus:border-[#1683FF] focus:outline-2 focus:outline-blue-600">
                  <option value=""><LText text="Todos" /></option>
                  {countries.map(item => <option key={item.code} value={item.code}>{item.display}</option>)}
                </LElement>
              </label>
              <label className="block min-w-0 text-sm font-semibold text-slate-600">
                <LText text="Localização" />
                <LElement as="select" aria-label="Localização" value={location}
                  onChange={event => setLocation(event.target.value)}
                  className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-4 py-4 text-sm font-normal text-[#07111F] focus:border-[#1683FF] focus:outline-2 focus:outline-blue-600">
                  <option value=""><LText text="Todas" /></option>
                  {locations.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                </LElement>
              </label>

              <LElement as="select"
                aria-label="Área profissional"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value=""><LText text={"Todas as áreas"} /></option>
                {areas.map((item) => (
                  <option key={item} value={item}>
                    <LText text={item} />
                  </option>
                ))}
              </LElement>

              <LElement as="select"
                aria-label="Tipo de contrato"
                value={contractType}
                onChange={(event) => setContractType(event.target.value)}
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value=""><LText text={"Todos os tipos"} /></option>
                {contractTypes.map((item) => (
                  <option key={item} value={item}>
                    <LText text={item} />
                  </option>
                ))}
              </LElement>

              <LElement as="select"
                aria-label="Modelo de trabalho"
                value={workModel}
                onChange={(event) => setWorkModel(event.target.value)}
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value=""><LText text={"Todos os modelos"} /></option>
                <option value="presential"><LText text={"Presencial"} /></option>
                <option value="hybrid"><LText text={"Híbrido"} /></option>
                <option value="remote"><LText text={"Remoto"} /></option>
              </LElement>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
              >
                <LText text={"Limpar filtros"} /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {error ? <p role="alert"><LText text="Não foi possível carregar as vagas." /><button className="ml-4 underline" onClick={()=>window.location.reload()}><LText text="Tentar novamente" /></button></p> : isLoading ? (
          <p className="text-sm text-slate-500"><LText text={"A carregar vagas..."} /></p>
        ) : (
          <>
            <p role="status" aria-live="polite" className="mb-6 text-sm text-slate-500">
              {result.total} <LText text={" vagas encontradas"} /></p>

            {filteredJobs.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center">
                <h2 className="text-2xl font-semibold">
                  <LText text={"Nenhuma vaga encontrada"} /></h2>

                <p className="mt-3 text-sm text-slate-500">
                  <LText text={"Tenta alterar os filtros ou pesquisar outro termo."} /></p>
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredJobs.map((job) => {
                  const model = job.work_model || job.work_mode || "";

                  return (
                    <article
                      key={job.id}
                      className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-6">
                        <div className="min-w-0 flex-1 break-words">
                          {job.origin === "external" && <p className="mb-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><LText text="Vaga externa" /></p>}
                          {job.company_name && <p className="mb-2 text-sm font-semibold">{job.company_name}</p>}
                          <p className="text-sm font-semibold text-[#1683FF]">
                            <LText text={job.area || "Área não definida"} />
                          </p>

                          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                            {job.title}
                          </h2>

                          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                            <LText text={job.description ? (job.description.length > 220 ? `${job.description.slice(0, 220).trim()}…` : job.description) : "Consulta os detalhes desta oportunidade."} />
                          </p>

                          <p className="mt-3 text-xs text-slate-600"><LText text={"Publicada em "} /><LText text={new Intl.DateTimeFormat(displayLocale, { timeZone: "Europe/Lisbon" }).format(new Date(job.created_at))} /></p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            {job.location && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                {job.location}
                              </span>
                            )}

                            {model && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                <LText text={workModelLabels[model] || model} />
                              </span>
                            )}

                            {job.contract_type && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                <LText text={job.contract_type} />
                              </span>
                            )}

                            {job.seniority && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                <LText text={job.seniority} />
                              </span>
                            )}
                          </div>
                        </div>

                        {job.origin === "external" && job.external_id ? <div className="w-full shrink-0 space-y-3 sm:w-auto sm:max-w-xs">
                          <Link href={`/vagas/externas/${job.external_id}`} className="block rounded-full bg-[#07111F] px-6 py-3 text-center text-sm font-semibold text-white hover:bg-[#1683FF]"><LText text="Ver oferta externa" /></Link>
                          <p className="text-xs leading-5 text-slate-500"><LText text="Registo gratuito de candidato necessário para consultar esta oferta." /></p>
                          <p className="text-xs text-slate-500"><LText text="Fonte" />: <a href={ADZUNA_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[23px] min-w-[116px] items-center text-base font-semibold text-blue-700 underline">Adzuna</a></p>
                        </div> : <Link
                          aria-label={`Ver vaga: ${job.title}`}
                          href={`/vagas/${job.id}`}
                          className="rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                        >
                          <LText text={"Ver vaga"} /></Link>}
                      </div>
                    </article>
                  );
                })}
                {result.total>20 && <LElement as="nav" aria-label="Paginação" className="flex items-center justify-center gap-5"><button type="button" disabled={result.page<=1} onClick={()=>setPage(result.page-1)} className="rounded-full border px-5 py-3 disabled:opacity-40"><LText text="Anterior" /></button><span>{result.page} / {Math.ceil(result.total/20)}</span><button type="button" disabled={result.page*20>=result.total} onClick={()=>setPage(result.page+1)} className="rounded-full border px-5 py-3 disabled:opacity-40"><LText text="Seguinte" /></button></LElement>}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
