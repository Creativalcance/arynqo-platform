import type { SupabaseClient } from "@supabase/supabase-js";
export async function loadReviewedSkillAliases(client: SupabaseClient) {
 const aliases = new Map<string,string>();
 for(let offset=0;offset<50000;offset+=1000) {
  const {data,error}=await client.from("profile_tag_aliases").select("normalized_alias,profile_tags!inner(label,status)").eq("profile_tags.status","approved").order("normalized_alias").range(offset,offset+999);
  if(error) throw new Error("Não foi possível consultar as equivalências revistas.");
  for(const row of data || []) {
   const target=Array.isArray(row.profile_tags) ? row.profile_tags[0] : row.profile_tags;
   if(target?.label) aliases.set(row.normalized_alias,target.label);
  }
  if(!data || data.length<1000) return aliases;
 }
 throw new Error("O catálogo de equivalências excede o limite de cálculo.");
}
