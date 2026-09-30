"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Job = {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  location: string | null;
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

export default function VagasPage({ initialJobs, initialSearch }: { initialJobs: Job[]; initialSearch:string }) {
  const [jobs] = useState<Job[]>(initialJobs);
  const [search, setSearch] = useState(initialSearch);
  const [area, setArea] = useState("");
  const [contractType, setContractType] = useState("");
  const [workModel, setWorkModel] = useState("");
  const [isLoading] = useState(false);




  const areas = useMemo(() => {
    return Array.from(
      new Set(jobs.map((job) => job.area).filter(Boolean) as string[])
    ).sort();
  }, [jobs]);

  const contractTypes = useMemo(() => {
    return Array.from(
      new Set(jobs.map((job) => job.contract_type).filter(Boolean) as string[])
    ).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const text = `${job.title} ${job.description || ""} ${job.area || ""} ${
        job.location || ""
      }`.toLowerCase();

      const model = job.work_model || job.work_mode || "";

      return (
        (!search || text.includes(search.toLowerCase())) &&
        (!area || job.area === area) &&
        (!contractType || job.contract_type === contractType) &&
        (!workModel || model === workModel)
      );
    });
  }, [jobs, search, area, contractType, workModel]);

  function clearFilters() {
    setSearch("");
    setArea("");
    setContractType("");
    setWorkModel("");
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] text-[#07111F]">
      <section className="border-b border-[#DDE3EA] bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="inline-flex rounded-full border border-[#1683FF]/20 bg-[#1683FF]/10 px-5 py-2 text-sm font-semibold text-[#1683FF]">
            Oportunidades profissionais
          </p>

          <h1 className="mt-8 max-w-3xl text-5xl font-black tracking-[-0.06em] md:text-6xl">
            Descobre a próxima oportunidade.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Explora vagas alinhadas com as tuas competências, experiência e
            objetivos profissionais.
          </p>

          <div className="mt-10 rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
              <input
                aria-label="Pesquisar vagas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar vaga, área ou localização..."
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              />

              <select
                aria-label="Área profissional"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value="">Todas as áreas</option>
                {areas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                aria-label="Tipo de contrato"
                value={contractType}
                onChange={(event) => setContractType(event.target.value)}
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value="">Todos os tipos</option>
                {contractTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                aria-label="Modelo de trabalho"
                value={workModel}
                onChange={(event) => setWorkModel(event.target.value)}
                className="rounded-2xl border border-[#DDE3EA] px-4 py-4 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value="">Todos os modelos</option>
                <option value="presential">Presencial</option>
                <option value="hybrid">Híbrido</option>
                <option value="remote">Remoto</option>
              </select>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        {isLoading ? (
          <p className="text-sm text-slate-500">A carregar vagas...</p>
        ) : (
          <>
            <p role="status" aria-live="polite" className="mb-6 text-sm text-slate-500">
              {filteredJobs.length} vagas encontradas
            </p>

            {filteredJobs.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-[#DDE3EA] bg-white p-12 text-center">
                <h2 className="text-2xl font-semibold">
                  Nenhuma vaga encontrada
                </h2>

                <p className="mt-3 text-sm text-slate-500">
                  Tenta alterar os filtros ou pesquisar outro termo.
                </p>
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
                        <div>
                          <p className="text-sm font-semibold text-[#1683FF]">
                            {job.area || "Área não definida"}
                          </p>

                          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                            {job.title}
                          </h2>

                          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                            {job.description ? (job.description.length > 220 ? `${job.description.slice(0, 220).trim()}…` : job.description) : "Consulta os detalhes desta oportunidade."}
                          </p>

                          <p className="mt-3 text-xs text-slate-600">Publicada em {new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon" }).format(new Date(job.created_at))}</p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            {job.location && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                {job.location}
                              </span>
                            )}

                            {model && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                {workModelLabels[model] || model}
                              </span>
                            )}

                            {job.contract_type && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                {job.contract_type}
                              </span>
                            )}

                            {job.seniority && (
                              <span className="rounded-full bg-[#F7F9FC] px-4 py-2 text-xs font-semibold text-slate-600">
                                {job.seniority}
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          aria-label={`Ver vaga: ${job.title}`}
                          href={`/vagas/${job.id}`}
                          className="rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
                        >
                          Ver vaga
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}