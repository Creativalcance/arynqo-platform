import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
// Anonymous client: public reads remain subject to RLS. Never use service credentials here.
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuração pública indisponível.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export const getPublicJob = cache(async (id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  const { data, error } = await publicClient().from("jobs").select("id,title,description,country_code,content_locale,expires_at,area,specializations,required_skills,preferred_skills,location,work_model,work_mode,opportunity_type,contract_type,seniority,languages,salary_range,education_requirements,experience_requirements,screening_questions,evaluation_criteria,candidate_pitch,ai_summary,is_active,created_at,company_profiles(company_name,description,website_url,location,industry,company_type,company_size,logo_url)").eq("id", id).eq("is_active", true).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a vaga.");
  return data;
});
export const getPublicPost = cache(async (slug: string, locale: import("./i18n/config").Locale = "pt") => {
  const { readAcademyPost } = await import("./academy/public");
  return readAcademyPost(slug, locale);
});
