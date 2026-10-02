export type Company = { company_name: string | null; logo_url: string | null };
export type Job = {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  location: string | null;
  country_code: string | null;
  work_model: string | null;
  work_mode: string | null;
  contract_type: string | null;
  opportunity_type: string | null;
  salary_range: string | null;
  required_skills: string[] | null;
  is_active: boolean;
  renewal_deadline: string | null;
  created_at: string;
  company_profiles: Company | Company[] | null;
};
export type JobFilters = {
  search: string;
  location: string;
  country: string;
  model: string;
};
export const emptyFilters: JobFilters = {
  search: "",
  location: "",
  country: "",
  model: "",
};
export const jobFields =
  "id,title,description,area,location,country_code,work_model,work_mode,contract_type,opportunity_type,salary_range,required_skills,is_active,renewal_deadline,created_at,company_profiles(company_name,logo_url)";
export const pageSize = 20;
export function companyName(job: Pick<Job, "company_profiles">) {
  const company = Array.isArray(job.company_profiles)
    ? job.company_profiles[0]
    : job.company_profiles;
  return company?.company_name || "Empresa";
}
export function workModel(job: Pick<Job, "work_model" | "work_mode">) {
  const model = (job.work_model || job.work_mode || "").toLowerCase();
  if (/remote|remoto/.test(model)) return "Remoto";
  if (/hybrid|h[íi]brido/.test(model)) return "Híbrido";
  if (/presen|onsite|on.site/.test(model)) return "Presencial";
  return job.work_model || job.work_mode || "Regime por indicar";
}
// Filter values are used inside PostgREST's expression grammar. Restrict syntax,
// preserve international letters, and do not allow user-supplied wildcards.
export function searchTerm(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}
export function acceptsApplications(
  job: Pick<Job, "is_active" | "renewal_deadline">,
  now = Date.now(),
) {
  return (
    job.is_active &&
    (!job.renewal_deadline || Date.parse(job.renewal_deadline) > now)
  );
}
export function applicationError(code?: string) {
  if (code === "23505") return "Já enviaste uma candidatura para esta vaga.";
  if (code === "P0001") return "Esta vaga já não está a aceitar candidaturas.";
  if (code === "42501" || code === "PGRST301")
    return "Não foi possível confirmar as tuas permissões. Volta a entrar na conta.";
  return "Não foi possível confirmar o envio. Atualiza as candidaturas antes de tentares novamente.";
}
export const statusLabels: Record<string, string> = {
  pending: "Em análise",
  accepted: "Aceite",
  rejected: "Não selecionada",
};
