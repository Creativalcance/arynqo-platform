import { getSupabase } from "./supabase";
import {
  jobFields,
  pageSize,
  searchTerm,
  type Job,
  type JobFilters,
} from "./jobs";

export type Candidate = {
  id: string;
  headline: string | null;
  location: string | null;
  cv_url: string | null;
  cv_file_url: string | null;
};
export type Profile = {
  id: string;
  name: string | null;
  role: string;
  locale: string;
};
export type Account = { profile: Profile; candidate: Candidate | null };
export type Application = {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  jobs: Job | null;
};

export async function fetchAccount(userId: string): Promise<Account> {
  const client = getSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id,name,role,locale")
    .eq("id", userId)
    .single()
    .retry(false);
  if (error || !data) throw new Error("Não foi possível carregar a tua conta.");
  let candidate: Candidate | null = null;
  if (data.role === "student") {
    const result = await client
      .from("student_profiles")
      .select("id,headline,location,cv_url,cv_file_url")
      .eq("user_id", userId)
      .maybeSingle()
      .retry(false);
    if (result.error)
      throw new Error("Não foi possível carregar o perfil de candidato.");
    candidate = result.data;
  }
  return { profile: data, candidate };
}

export async function fetchJobs(
  filters: JobFilters,
  page = 0,
  signal?: AbortSignal,
): Promise<Job[]> {
  let query = getSupabase()
    .from("jobs")
    .select(jobFields)
    .eq("is_active", true)
    .or(
      `renewal_deadline.is.null,renewal_deadline.gt.${new Date().toISOString()}`,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  const search = searchTerm(filters.search);
  const location = searchTerm(filters.location);
  if (search)
    query = query.or(`title.ilike.%${search}%,area.ilike.%${search}%`);
  if (location) query = query.ilike("location", `%${location}%`);
  if (/^[A-Z]{2}$/.test(filters.country))
    query = query.eq("country_code", filters.country);
  const models: Record<string, string> = {
    Remoto: "work_model.ilike.%remot%,work_mode.ilike.%remot%",
    Híbrido:
      "work_model.ilike.%híbr%,work_model.ilike.%hybr%,work_model.ilike.%hibr%,work_mode.ilike.%hybr%",
    Presencial:
      "work_model.ilike.%presen%,work_mode.ilike.%presen%,work_model.ilike.%onsite%,work_mode.ilike.%onsite%",
  };
  if (models[filters.model]) query = query.or(models[filters.model]);
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.retry(false);
  if (error)
    throw new Error(
      "Não foi possível carregar as vagas. Verifica a ligação e tenta novamente.",
    );
  return data as unknown as Job[];
}

export async function fetchJob(
  id: string,
  signal?: AbortSignal,
): Promise<Job | null> {
  let query = getSupabase().from("jobs").select(jobFields).eq("id", id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle().retry(false);
  if (error) throw new Error("Não foi possível consultar esta vaga.");
  return data as unknown as Job | null;
}

export async function fetchApplications(
  candidateId: string,
  signal?: AbortSignal,
): Promise<Application[]> {
  let query = getSupabase()
    .from("applications")
    .select(`id,job_id,status,created_at,jobs(${jobFields})`)
    .eq("student_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.retry(false);
  if (error) throw new Error("Não foi possível carregar as candidaturas.");
  return data as unknown as Application[];
}

export async function fetchApplication(
  candidateId: string,
  jobId: string,
  signal?: AbortSignal,
) {
  let query = getSupabase()
    .from("applications")
    .select("id,status")
    .eq("student_id", candidateId)
    .eq("job_id", jobId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle().retry(false);
  if (error)
    throw new Error("Não foi possível verificar o estado da candidatura.");
  return data as { id: string; status: string } | null;
}
