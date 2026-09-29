"use client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import Link from "next/link";
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

const COMMON_LANGUAGES = [
  "Português",
  "Inglês",
  "Espanhol",
  "Francês",
  "Alemão",
  "Italiano",
  "Mandarim",
];

const COMMON_SKILLS = [
  "Comunicação",
  "Trabalho em equipa",
  "Organização",
  "Proatividade",
  "Resolução de problemas",
  "Gestão de tempo",
  "Microsoft Office",
  "Excel",
  "Inglês",
  "Atendimento ao cliente",
  "Vendas",
  "Marketing Digital",
  "Redes Sociais",
  "Análise de dados",
  "Gestão de projetos",
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "TailwindCSS",
  "Supabase",
  "PostgreSQL",
  "OpenAI API",
  "Figma",
];

export default function NovaVagaPage() {
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
  const [requiredSkillInput, setRequiredSkillInput] = useState("");

  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [preferredSkillInput, setPreferredSkillInput] = useState("");

  const [location, setLocation] = useState("");
  const [workModel, setWorkModel] = useState("Híbrido");
  const [opportunityType, setOpportunityType] = useState("Full-time");
  const [seniority, setSeniority] = useState("Júnior");

  const [languages, setLanguages] = useState<string[]>([]);
  const [languageInput, setLanguageInput] = useState("");

  const [salaryRange, setSalaryRange] = useState("");
  const [educationRequirements, setEducationRequirements] = useState("");
  const [experienceRequirements, setExperienceRequirements] = useState("");

  const [screeningQuestionOne, setScreeningQuestionOne] = useState("");
  const [screeningQuestionTwo, setScreeningQuestionTwo] = useState("");
  const [screeningQuestionThree, setScreeningQuestionThree] = useState("");

  const [evaluationCriteria, setEvaluationCriteria] = useState<string[]>([]);
  const [evaluationCriteriaInput, setEvaluationCriteriaInput] = useState("");

  const [candidatePitch, setCandidatePitch] = useState("");
  const [aiSummary, setAiSummary] = useState("");

  useEffect(() => {
    loadCompany();
  }, []);

  const screeningQuestions = useMemo(() => {
    return [
      screeningQuestionOne,
      screeningQuestionTwo,
      screeningQuestionThree,
    ].filter((question) => question.trim().length > 0);
  }, [screeningQuestionOne, screeningQuestionTwo, screeningQuestionThree]);

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
      screeningQuestions.length ? "ok" : "",
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
    screeningQuestions,
    evaluationCriteria,
    candidatePitch,
    aiSummary,
  ]);

  async function loadCompany() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("company_profiles")
      .select("id, company_name")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      alert("Apenas empresas podem publicar vagas.");
      window.location.href = "/dashboard";
      return;
    }

    setCompany(data as CompanyProfile);
    setIsLoading(false);
  }

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

  function toggleLanguage(language: string) {
    if (languages.includes(language)) {
      setLanguages(
        languages.filter((currentLanguage) => currentLanguage !== language)
      );
      return;
    }

    setLanguages([...languages, language]);
  }

  function toggleSkill(skill: string, type: "required" | "preferred") {
    if (type === "required") {
      if (requiredSkills.includes(skill)) {
        setRequiredSkills(
          requiredSkills.filter((currentSkill) => currentSkill !== skill)
        );
        return;
      }

      setRequiredSkills([...requiredSkills, skill]);
      return;
    }

    if (preferredSkills.includes(skill)) {
      setPreferredSkills(
        preferredSkills.filter((currentSkill) => currentSkill !== skill)
      );
      return;
    }

    setPreferredSkills([...preferredSkills, skill]);
  }

  async function generateJobWithAI() {
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
        alert("A IA devolveu uma resposta inválida.");
        setIsGeneratingAI(false);
        return;
      }

      if (!response.ok) {
        alert(data.error || "Não foi possível melhorar a vaga com IA.");
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

      if (data.screening_questions) {
        setScreeningQuestionOne(data.screening_questions[0] || "");
        setScreeningQuestionTwo(data.screening_questions[1] || "");
        setScreeningQuestionThree(data.screening_questions[2] || "");
      }

      if (data.evaluation_criteria) {
        setEvaluationCriteria(data.evaluation_criteria);
      }

      if (data.candidate_pitch) {
        setCandidatePitch(data.candidate_pitch);
      }

      alert("Vaga estruturada com IA. Revê antes de publicar.");
    } catch {
      alert("Erro ao gerar análise IA da vaga.");
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
          screening_questions: screeningQuestions,
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
        work_model: workModel,
        opportunity_type: opportunityType,
        seniority,
        languages,
        salary_range: salaryRange,
        education_requirements: educationRequirements,
        experience_requirements: experienceRequirements,
        screening_questions: screeningQuestions,
        evaluation_criteria: evaluationCriteria,
        candidate_pitch: candidatePitch,
        ai_summary: aiSummary,
        is_active: true,
        is_featured: false,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      setIsSaving(false);
      return;
    }

    await structureJobWithAI(createdJob.id);
    await recalculateJobMatches(createdJob.id);

    setIsSaving(false);

    alert("Vaga publicada com sucesso.");
    window.location.href = "/empresa/vagas";
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const textareaClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm leading-6 text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const selectClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10";

  const chipClass =
    "inline-flex items-center gap-2 rounded-full border border-[#DDE3EA] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#1683FF] hover:text-[#1683FF]";

  const selectedChipClass =
    "inline-flex items-center gap-2 rounded-full border border-[#1683FF] bg-[#1683FF] px-4 py-2 text-xs font-semibold text-white transition";

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500">A carregar empresa...</p>
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
            ← Voltar às vagas
          </Link>
        </div>

        <section className="mb-8 overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative max-w-4xl">
              <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                Copiloto IA de Recrutamento
              </p>

              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                Publicar vaga.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                Crie uma oportunidade clara, estruturada e compatível com o
                matching inteligente entre vaga e candidato.
              </p>
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
                Informação principal
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Dados base da vaga
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Empresa: {company?.company_name}
              </p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">Título da vaga</label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex: Frontend Developer Júnior"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Descrição</label>
                  <textarea
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
                Matching profissional
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Área, especializações e skills
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Escreva e carregue em Enter para adicionar. Também pode escolher
                sugestões rápidas.
              </p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">Área profissional</label>
                  <select
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                    required
                    className={selectClass}
                  >
                    <option value="">Selecionar área profissional</option>
                    {PROFESSIONAL_AREAS.map((professionalArea) => (
                      <option key={professionalArea} value={professionalArea}>
                        {professionalArea}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Especializações</label>
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
                          {specialization}
                          <span>×</span>
                        </button>
                      ))}

                      <input
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
                      Skills obrigatórias
                    </label>

                    <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              removeItem(skill, requiredSkills, setRequiredSkills)
                            }
                            className={selectedChipClass}
                          >
                            {skill}
                            <span>×</span>
                          </button>
                        ))}

                        <input
                          value={requiredSkillInput}
                          onChange={(event) =>
                            setRequiredSkillInput(event.target.value)
                          }
                          onKeyDown={(event) =>
                            handleEnterToAdd(
                              event,
                              requiredSkillInput,
                              requiredSkills,
                              setRequiredSkills,
                              () => setRequiredSkillInput("")
                            )
                          }
                          placeholder="Adicionar skill + Enter"
                          className="min-w-[180px] flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold">
                      Skills preferenciais
                    </label>

                    <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                      <div className="flex flex-wrap gap-2">
                        {preferredSkills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              removeItem(skill, preferredSkills, setPreferredSkills)
                            }
                            className={selectedChipClass}
                          >
                            {skill}
                            <span>×</span>
                          </button>
                        ))}

                        <input
                          value={preferredSkillInput}
                          onChange={(event) =>
                            setPreferredSkillInput(event.target.value)
                          }
                          onKeyDown={(event) =>
                            handleEnterToAdd(
                              event,
                              preferredSkillInput,
                              preferredSkills,
                              setPreferredSkills,
                              () => setPreferredSkillInput("")
                            )
                          }
                          placeholder="Adicionar skill + Enter"
                          className="min-w-[180px] flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold">Sugestões rápidas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {COMMON_SKILLS.map((skill) => {
                      const selected =
                        requiredSkills.includes(skill) ||
                        preferredSkills.includes(skill);

                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill, "required")}
                          className={selected ? selectedChipClass : chipClass}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Condições da oportunidade
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Modelo, localização e enquadramento
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Localização</label>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Ex: Coimbra, Lisboa, Porto"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Modelo de trabalho</label>
                  <select
                    value={workModel}
                    onChange={(event) => setWorkModel(event.target.value)}
                    className={selectClass}
                  >
                    {WORK_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Tipo de oportunidade
                  </label>
                  <select
                    value={opportunityType}
                    onChange={(event) => setOpportunityType(event.target.value)}
                    className={selectClass}
                  >
                    {OPPORTUNITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Senioridade</label>
                  <select
                    value={seniority}
                    onChange={(event) => setSeniority(event.target.value)}
                    className={selectClass}
                  >
                    {SENIORITY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Faixa salarial</label>
                  <input
                    value={salaryRange}
                    onChange={(event) => setSalaryRange(event.target.value)}
                    placeholder="Ex: 1.200€ - 1.600€ brutos/mês"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Idiomas</label>

                  <div className="mt-2 rounded-2xl border border-[#DDE3EA] bg-white px-3 py-3 transition focus-within:border-[#1683FF] focus-within:ring-4 focus-within:ring-[#1683FF]/10">
                    <div className="flex flex-wrap gap-2">
                      {languages.map((language) => (
                        <button
                          key={language}
                          type="button"
                          onClick={() =>
                            removeItem(language, languages, setLanguages)
                          }
                          className={selectedChipClass}
                        >
                          {language}
                          <span>×</span>
                        </button>
                      ))}

                      <input
                        value={languageInput}
                        onChange={(event) => setLanguageInput(event.target.value)}
                        onKeyDown={(event) =>
                          handleEnterToAdd(
                            event,
                            languageInput,
                            languages,
                            setLanguages,
                            () => setLanguageInput("")
                          )
                        }
                        placeholder="Adicionar idioma + Enter"
                        className="min-w-[180px] flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {COMMON_LANGUAGES.map((language) => {
                      const selected = languages.includes(language);

                      return (
                        <button
                          key={language}
                          type="button"
                          onClick={() => toggleLanguage(language)}
                          className={selected ? selectedChipClass : chipClass}
                        >
                          {language}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Requisitos do candidato
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Formação e experiência
              </h2>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">
                    Formação exigida
                  </label>
                  <textarea
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
                    Experiência exigida
                  </label>
                  <textarea
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
                Avaliação e triagem
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                3 perguntas simples e critérios
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use perguntas rápidas, objetivas e fáceis de responder. O
                candidato não deve sentir que está a preencher um questionário
                pesado.
              </p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">Pergunta 1</label>
                  <input
                    value={screeningQuestionOne}
                    onChange={(event) =>
                      setScreeningQuestionOne(event.target.value)
                    }
                    placeholder="Ex: Tem disponibilidade para este modelo de trabalho?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Pergunta 2</label>
                  <input
                    value={screeningQuestionTwo}
                    onChange={(event) =>
                      setScreeningQuestionTwo(event.target.value)
                    }
                    placeholder="Ex: Tem experiência na área indicada?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Pergunta 3</label>
                  <input
                    value={screeningQuestionThree}
                    onChange={(event) =>
                      setScreeningQuestionThree(event.target.value)
                    }
                    placeholder="Ex: Qual a sua disponibilidade para iniciar funções?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Critérios de avaliação
                  </label>

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
                          {criteria}
                          <span>×</span>
                        </button>
                      ))}

                      <input
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
                    Enquadramento da Vaga
                  </label>
                  <textarea
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
                Inteligência artificial
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Resumo IA
              </h2>

              <div className="mt-6">
                <label className="text-sm font-semibold">Resumo IA</label>
                <textarea
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
                Qualidade para matching
              </h2>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Estrutura da vaga
                  </span>
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
                Quanto mais simples, completa e estruturada for a vaga, melhor
                será o matching com candidatos.
              </p>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                Copiloto IA
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Pode usar a IA para acelerar o preenchimento, mas todos os
                campos continuam editáveis.
              </p>

              <button
                type="button"
                onClick={generateJobWithAI}
                disabled={isGeneratingAI}
                className="mt-5 w-full rounded-2xl bg-[#07111F] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingAI ? "A estruturar..." : "Estruturar com IA"}
              </button>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <h2 className="text-lg font-semibold tracking-[-0.03em]">
                Publicação
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                Depois de publicada, a vaga será estruturada pela IA e os
                matches serão recalculados.
              </p>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-5 w-full rounded-2xl bg-[#1683FF] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "A publicar..." : "Publicar vaga"}
              </button>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}