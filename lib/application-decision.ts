import type { SupabaseClient } from "@supabase/supabase-js";

export type ApplicationDecision = "accepted" | "rejected";

function isDecision(value: unknown): value is ApplicationDecision {
  return value === "accepted" || value === "rejected";
}

/** Only pending applications can be decided. Notifications belong to the DB transaction. */
export async function decideApplication(
  client: SupabaseClient,
  id: string,
  decision: ApplicationDecision,
): Promise<ApplicationDecision> {
  try {
    const { data, error } = await client.from("applications")
      .update({ status: decision }).eq("id", id).eq("status", "pending")
      .select("id,status").maybeSingle();
    if (!error && isDecision(data?.status)) return data.status;
  } catch {
    // A lost response is not proof that the transaction failed. Read the stored state.
  }

  const { data, error } = await client.from("applications")
    .select("id,status").eq("id", id).maybeSingle();
  if (!error && isDecision(data?.status)) return data.status;
  throw new Error("Não foi possível atualizar a candidatura. Atualiza a lista e tenta novamente.");
}
