import { supabase } from "@/lib/supabase";

export async function candidateSnapshots<T extends { id: string }>(ids: string[]): Promise<Map<string, T>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, T>();
  for (let offset = 0; offset < unique.length; offset += 200) {
    const { data, error } = await supabase.rpc("company_candidate_snapshots", { student_ids: unique.slice(offset, offset + 200) });
    if (error) throw new Error("Não foi possível carregar os candidatos.");
    for (const snapshot of (data || []) as T[]) result.set(snapshot.id, snapshot);
  }
  return result;
}
