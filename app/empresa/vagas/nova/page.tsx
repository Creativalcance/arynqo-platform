"use client";
import { localizedAlert } from "@/lib/i18n/browser-feedback";
import { browserLocalizedPath, normalizeLocale, type Locale } from "@/lib/i18n/config";
import { LText, LElement, useI18n, LocaleSelect } from "@/lib/i18n/client";

import { JobLanguagePicker, TagPicker, CountryCodeSelect } from "@/app/components/ProfileFields";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import Link from "@/lib/i18n/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompanyProfile = {
  id: string;
  company_name: string;
};

type JobAIResponse = {
  improved_description?: string;
  ai_summary?: string;
  area?: string;
  specializations?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  work_model?: string;
  opportunity_type?: string;
  seniority?: string;
  languages?: string[];
  salary_range?: string;
  education_requirements?: string;
  experience_requirements?: string;
  screening_questions?: string[];
  evaluation_criteria?: string[];
  candidate_pitch?: string;
  error?: string;
};

const WORK_MODELS = [
  "Presencial",
  "Híbrido",
  "Remoto",
  "No terreno",
  "Por turnos",
  "Horário flexível",
  "Mobilidade internacional",
  "Trabalho temporário",
];

const OPPORTUNITY_TYPES = [
  "Estágio Curricular",
  "Estágio Profissional",
  "Trainee",
  "Part-time",
  "Full-time",
  "Freelancer",
  "Prestação de Serviços",
  "Contrato a Termo",
  "Contrato Sem Termo",
  "Projeto",
  "Bolsa de Investigação",
  "Programa Graduados",
  "Voluntariado",
];

const SENIORITY_LEVELS = [
  "Estágio",
  "Júnior",
  "Mid-level",
  "Sénior",
  "Especialista",
  "Coordenação",
  "Gestão",
  "Direção",
];

const PROFESSIONAL_AREAS = [
  "Administração e Gestão",
  "Agricultura, Floresta e Ambiente",
  "Arquitetura e Design de Interiores",
  "Artes, Cultura e Indústrias Criativas",
  "Atendimento ao Cliente",
  "Automóvel e Mobilidade",
  "Banca, Seguros e Serviços Financeiros",
  "Comercial e Vendas",
  "Compras e Procurement",
  "Comunicação, Marketing e Publicidade",
  "Construção Civil e Obras Públicas",
  "Consultoria",
  "Contabilidade, Auditoria e Fiscalidade",
  "Design, UX e Produto Digital",
  "Educação, Formação e Ensino",
  "Engenharia Civil",
  "Engenharia Eletrotécnica",
  "Engenharia Industrial",
  "Engenharia Informática",
  "Engenharia Mecânica",
  "Engenharia Química",
  "Farmacêutica e Biotecnologia",
  "Hotelaria, Turismo e Restauração",
  "Imobiliário",
  "Indústria e Produção",
  "Jurídico",
  "Logística, Transportes e Distribuição",
  "Manutenção e Assistência Técnica",
  "Operações",
  "Qualidade, Segurança e Ambiente",
  "Recursos Humanos",
  "Retalho e Grande Distribuição",
  "Saúde",
  "Tecnologia, Software e Dados",
  "Telecomunicações",
];



export default function NovaVagaPage() {
  const { locale } = useI18n();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [area, setArea] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [specializationInput, setSpecializationInput] = useState("");

  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);

  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);

  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [contentLocale, setContentLocale] = useState<Locale>(locale);
  const [workModel, setWorkModel] = useState("Híbrido");
  const [opportunityType, setOpportunityType] = useState("Full-time");
  const [seniority, setSeniority] = useState("Júnior");

  const [languages, setLanguages] = useState<string[]>([]);

  const [salaryRange, setSalaryRange] = useState("");
  const [educationRequirements, setEducationRequirements] = useState("");
  const [experienceRequirements, setExperienceRequirements] = useState("");


  const [evaluationCriteria, setEvaluationCriteria] = useState<string[]>([]);
  const [evaluationCriteriaInput, setEvaluationCriteriaInput] = useState("");

  const [candidatePitch, setCandidatePitch] = useState("");
  const [aiSummary, setAiSummary] = useState("");



  const matchingScore = useMemo(() => {
    const fields = [
      title,
      description,
      area,
      specializations.length ? "ok" : "",
      requiredSkills.length ? "ok" : "",
      preferredSkills.length ? "ok" : "",
      location,
      workModel,
      opportunityType,
      seniority,
      languages.length ? "ok" : "",
      salaryRange,
      educationRequirements,
      experienceRequirements,
      evaluationCriteria.length ? "ok" : "",
      candidatePitch,
      aiSummary,
    ];

    const completedFields = fields.filter((field) => field.trim().length > 0);

    return Math.round((completedFields.length / fields.length) * 100);
  }, [
    title,
    description,
    area,
    specializations,
    requiredSkills,
    preferredSkills,
    location,
    workModel,
    opportunityType,
    seniority,
    languages,
    salaryRange,
    educationRequirements,
    experienceRequirements,
    evaluationCriteria,
    candidatePitch,
    aiSummary,
  ]);

  async function loadCompany() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = browserLocalizedPath("/login");
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("company_profiles")
      .select("id, company_name")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      localizedAlert("Apenas empresas podem publicar vagas.");
      window.location.href = browserLocalizedPath("/dashboard");
      return;
    }

    setCompany(data as CompanyProfile);
    setIsLoading(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadCompany(); });
    return () => { active = false; };
  }, []);

  function normalizeValue(value: string) {
    return value.trim().replace(/\s+/g, " ");
  }

  function addItem(
    value: string,
    currentItems: string[],
    setItems: (items: string[]) => void,
    clearInput?: () => void
  ) {
    const normalizedValue = normalizeValue(value);

    if (!normalizedValue) {
      return;
    }

    const alreadyExists = currentItems.some(
      (item) => item.toLowerCase() === normalizedValue.toLowerCase()
    );

    if (alreadyExists) {
      clearInput?.();
      return;
    }

    setItems([...currentItems, normalizedValue]);
    clearInput?.();
  }

  function removeItem(
    value: string,
    currentItems: string[],
    setItems: (items: string[]) => void
  ) {
    setItems(currentItems.filter((item) => item !== value));
  }

  function handleEnterToAdd(
    event: KeyboardEvent<HTMLInputElement>,
    value: string,
    currentItems: string[],
    setItems: (items: string[]) => void,
    clearInput: () => void
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addItem(value, currentItems, setItems, clearInput);
  }



  async function generateJobWithAI() {
    if (isGeneratingAI || isSaving || !title.trim() || !description.trim()) return;
    setIsGeneratingAI(true);

    try {
      const response = await authenticatedFetch("/api/ai/job-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          area,
          specializations,
          required_skills: requiredSkills,
          preferred_skills: preferredSkills,
          location,
          work_model: workModel,
          opportunity_type: opportunityType,
          seniority,
          languages,
          salary_range: salaryRange,
          education_requirements: educationRequirements,
          experience_requirements: experienceRequirements,
        }),
      });

      const rawText = await response.text();

      let data: JobAIResponse = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        localizedAlert("Não foi possível obter sugestões válidas.");
        setIsGeneratingAI(false);
        return;
      }

      if (!response.ok) {
        localizedAlert(data.error || "Não foi possível obter sugestões para a vaga.");
        setIsGeneratingAI(false);
        return;
      }

      if (data.improved_description) {
        setDescription(data.improved_description);
      }

      if (data.ai_summary) {
        setAiSummary(data.ai_summary);
      }

      if (data.area) {
        setArea(data.area);
      }

      if (data.specializations) {
        setSpecializations(data.specializations);
      }

      if (data.required_skills) {
        setRequiredSkills(data.required_skills);
      }

      if (data.preferred_skills) {
        setPreferredSkills(data.preferred_skills);
      }

      if (data.work_model) {
        setWorkModel(data.work_model);
      }

      if (data.opportunity_type) {
        setOpportunityType(data.opportunity_type);
      }

      if (data.seniority) {
        setSeniority(data.seniority);
      }

      if (data.languages) {
        setLanguages(data.languages);
      }

      if (data.salary_range) {
        setSalaryRange(data.salary_range);
      }

      if (data.education_requirements) {
        setEducationRequirements(data.education_requirements);
      }

      if (data.experience_requirements) {
        setExperienceRequirements(data.experience_requirements);
      }


      if (data.evaluation_criteria) {
        setEvaluationCriteria(data.evaluation_criteria);
      }

      if (data.candidate_pitch) {
        setCandidatePitch(data.candidate_pitch);
      }

      localizedAlert("Sugestões aplicadas. Reveja os campos antes de publicar.");
    } catch {
      localizedAlert("Não foi possível obter sugestões para a vaga.");
    }

    setIsGeneratingAI(false);
  }

  async function structureJobWithAI(jobId: string) {
    try {
      await authenticatedFetch("/api/ai/structure-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          title,
          description,
          area,
          specializations,
          required_skills: requiredSkills,
          preferred_skills: preferredSkills,
          location,
          work_model: workModel,
          opportunity_type: opportunityType,
          seniority,
          languages,
          salary_range: salaryRange,
          education_requirements: educationRequirements,
          experience_requirements: experienceRequirements,
          evaluation_criteria: evaluationCriteria,
          candidate_pitch: candidatePitch,
          ai_summary: aiSummary,
        }),
      });
    } catch (error) {
      console.error("Erro ao estruturar vaga:", error);
    }
  }

  async function recalculateJobMatches(jobId: string) {
    try {
      await authenticatedFetch("/api/ai/recalculate-job-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
        }),
      });
    } catch (error) {
      console.error("Erro ao recalcular matches da vaga:", error);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || isGeneratingAI) return;

    if (!company) {
      return;
    }

    setIsSaving(true);

    const { data: createdJob, error } = await supabase
      .from("jobs")
      .insert({
        company_id: company.id,
        title,
        description,
        area,
        specializations,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        location,
        country_code: countryCode || null,
        content_locale: contentLocale,
        work_model: workModel,
        opportunity_type: opportunityType,
        seniority,
        languages,
        salary_range: salaryRange,
        education_requirements: educationRequirements,
        experience_requirements: experienceRequirements,
        evaluation_criteria: evaluationCriteria,
        candidate_pitch: candidatePitch,
        ai_summary: aiSummary,
        is_active: true,
        is_featured: false,
      })
      .select("id")
      .single();

    if (error) {
      localizedAlert(error.message);
      setIsSaving(false);
      return;
    }

    await structureJobWithAI(createdJob.id);
    await recalculateJobMatches(createdJob.id);

    window.location.href = browserLocalizedPath("/empresa/vagas");
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const textareaClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm leading-6 text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const selectClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";


  const selectedChipClass =
    "inline-flex items-center gap-2 rounded-full border border-[#1683FF] bg-[#1683FF] px-4 py-2 text-xs font-semibold text-white transition";

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A carregar empresa..."} /></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href="/empresa/vagas"
            className="inline-flex rounded-full border border-[#DDE3EA] bg-white px-5 py-3 text-sm font-semibold transition hover:border-[#1683FF] hover:text-[#1683FF]"
          >
            <LText text={"← Voltar às vagas"} /></Link>
        </div>

        <section className="mb-8 overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative max-w-4xl">
              <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                <LText text={"Recrutamento"} /></p>

              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                <LText text={"Publicar vaga."} /></h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                <LText text={"Descreva a função e os requisitos para encontrar candidatos compatíveis."} /></p>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8 lg:grid-cols-[1fr_420px]"
        >
          <div className="space-y-8">
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Informação principal"} /></p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                <LText text={"Dados base da vaga"} /></h2>

              <p className="mt-3 text-sm text-slate-500">
                <LText text={"Empresa: "} />{company?.company_name}
              </p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold"><LText text={"Título da vaga"} /></label>
                  <LElement as="input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex: Frontend Developer Júnior"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold"><LText text={"Descrição"} /></label>
                  <LElement as="textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={8}
                    placeholder="Explique de forma simples o que a pessoa vai fazer, em que contexto e que impacto terá."
                    required
                    className={textareaClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Matching profissional"} /></p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                <LText text={"Área, especializações e skills"} /></h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                <LText text={"Selecione competências técnicas, comportamentais e ferramentas no catálogo partilhado com os candidatos. Pode adicionar novas tags quando necessário."} /></p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold"><LText text={"Área profissional"} /></label>
                  <select
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value=""><LText text={"Selecionar área profissional"} /></option>
                    {PROFESSIONAL_AREAS.map((professionalArea) => (
                      <option key={professionalArea} value={professionalArea}>
                        <LText text={professionalArea} />
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold"><LText text={"Especializações"} /></label>
                  <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                    <div className="flex flex-wrap gap-2">
                      {specializations.map((specialization) => (
                        <button
                          key={specialization}
                          type="button"
                          onClick={() =>
                            removeItem(
                              specialization,
                              specializations,
                              setSpecializations
                            )
                          }
                          className={selectedChipClass}
                        >
                          <LText text={specialization} />
                          <span><LText text={"×"} /></span>
                        </button>
                      ))}

                      <LElement as="input"
                        value={specializationInput}
                        onChange={(event) =>
                          setSpecializationInput(event.target.value)
                        }
                        onKeyDown={(event) =>
                          handleEnterToAdd(
                            event,
                            specializationInput,
                            specializations,
                            setSpecializations,
                            () => setSpecializationInput("")
                          )
                        }
                        placeholder="Ex: React, Gestão Comercial, RH..."
                        className="min-w-[220px] flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">
                      <LText text={"Competências obrigatórias"} /></label>

                    <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                      <TagPicker value={requiredSkills} onChange={setRequiredSkills} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      <LText text={"Competências preferenciais"} /></label>

                    <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                      <TagPicker value={preferredSkills} onChange={setPreferredSkills} />
                    </div>
                  </div>
                </div>


              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Condições da oportunidade"} /></p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                <LText text={"Modelo, localização e enquadramento"} /></h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold"><LText text={"País da vaga"} /></label>
                  <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                  <LocaleSelect className="mt-4" label="Idioma da vaga" save={false} value={contentLocale} onChange={setContentLocale} />
                  <label className="text-sm font-semibold"><LText text={"Localização"} /></label>
                  <LElement as="input"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Ex.: Lisboa, Paris, Berlin"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold"><LText text={"Modelo de trabalho"} /></label>
                  <select
                    value={workModel}
                    onChange={(event) => setWorkModel(event.target.value)}
                    className={selectClass}
                  >
                    {WORK_MODELS.map((model) => (
                      <option key={model} value={model}>
                        <LText text={model} />
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    <LText text={"Tipo de oportunidade"} /></label>
                  <select
                    value={opportunityType}
                    onChange={(event) => setOpportunityType(event.target.value)}
                    className={selectClass}
                  >
                    {OPPORTUNITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        <LText text={type} />
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold"><LText text={"Senioridade"} /></label>
                  <select
                    value={seniority}
                    onChange={(event) => setSeniority(event.target.value)}
                    className={selectClass}
                  >
                    {SENIORITY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        <LText text={level} />
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold"><LText text={"Faixa salarial"} /></label>
                  <LElement as="input"
                    value={salaryRange}
                    onChange={(event) => setSalaryRange(event.target.value)}
                    placeholder="Ex: 1.200€ - 1.600€ brutos/mês"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold"><LText text={"Idiomas e níveis mínimos"} /></label>
                  <JobLanguagePicker value={languages} onChange={setLanguages} />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Requisitos do candidato"} /></p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                <LText text={"Formação e experiência"} /></h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">
                    <LText text={"Formação exigida"} /></label>
                  <LElement as="textarea"
                    value={educationRequirements}
                    onChange={(event) =>
                      setEducationRequirements(event.target.value)
                    }
                    rows={4}
                    placeholder="Ex: Licenciatura em Engenharia Informática, Marketing, Gestão ou área relevante."
                    className={textareaClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    <LText text={"Experiência exigida"} /></label>
                  <LElement as="textarea"
                    value={experienceRequirements}
                    onChange={(event) =>
                      setExperienceRequirements(event.target.value)
                    }
                    rows={4}
                    placeholder="Ex: 1 a 3 anos de experiência em funções semelhantes."
                    className={textareaClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Avaliação"} /></p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                <LText text={"Critérios de avaliação"} /></h2>


              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">
                    <LText text={"Critérios de avaliação"} /></label>

                  <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                    <div className="flex flex-wrap gap-2">
                      {evaluationCriteria.map((criteria) => (
                        <button
                          key={criteria}
                          type="button"
                          onClick={() =>
                            removeItem(
                              criteria,
                              evaluationCriteria,
                              setEvaluationCriteria
                            )
                          }
                          className={selectedChipClass}
                        >
                          <LText text={criteria} />
                          <span><LText text={"×"} /></span>
                        </button>
                      ))}

                      <LElement as="input"
                        value={evaluationCriteriaInput}
                        onChange={(event) =>
                          setEvaluationCriteriaInput(event.target.value)
                        }
                        onKeyDown={(event) =>
                          handleEnterToAdd(
                            event,
                            evaluationCriteriaInput,
                            evaluationCriteria,
                            setEvaluationCriteria,
                            () => setEvaluationCriteriaInput("")
                          )
                        }
                        placeholder="Ex: Experiência, motivação, disponibilidade..."
                        className="min-w-[220px] flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    <LText text={"Enquadramento da Vaga"} /></label>
                  <LElement as="textarea"
                    value={candidatePitch}
                    onChange={(event) => setCandidatePitch(event.target.value)}
                    rows={4}
                    placeholder="Explique de forma simples o contexto da vaga, a equipa, o impacto da função e porque pode ser uma boa oportunidade."
                    className={textareaClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                <LText text={"Síntese da vaga"} /></p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                <LText text={"Resumo"} /></h2>

              <div className="mt-6">
                <label className="text-sm font-semibold"><LText text={"Resumo"} /></label>
                <LElement as="textarea"
                  value={aiSummary}
                  onChange={(event) => setAiSummary(event.target.value)}
                  rows={5}
                  placeholder="Resumo estruturado da vaga para matching, recomendação e leitura rápida."
                  className={textareaClass}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                <LText text={"Qualidade para matching"} /></h2>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    <LText text={"Estrutura da vaga"} /></span>
                  <span className="font-bold text-[#1683FF]">
                    {matchingScore}%
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#1683FF] transition-all"
                    style={{ width: `${matchingScore}%` }}
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                <LText text={"Quanto mais simples, completa e estruturada for a vaga, melhor será o matching com candidatos."} /></p>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                <LText text={"Copiloto IA"} /></h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                <LText text={"Preencha o título e a descrição. O Copiloto IA organiza a descrição e propõe um resumo, competências e critérios de avaliação. Os campos serão atualizados no formulário. Reveja as sugestões antes de guardar."} /></p>

              <button
                type="button"
                onClick={generateJobWithAI}
                disabled={isGeneratingAI || isSaving || !title.trim() || !description.trim()}
                className="mt-5 w-full rounded-2xl bg-[#07111F] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LText text={isGeneratingAI ? "A estruturar..." : "Organizar e preencher a vaga"} />
              </button>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                <LText text={"Publicação"} /></h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                <LText text={"Ao publicar, a vaga fica disponível e a compatibilidade com candidatos é atualizada. Será encaminhado para a lista de vagas."} /></p>

              <button
                type="submit"
                disabled={isSaving || isGeneratingAI}
                className="mt-5 w-full rounded-2xl bg-[#1683FF] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LText text={isSaving ? "A publicar..." : "Publicar vaga"} />
              </button>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}