import { supabase } from "@/lib/supabase";

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  // Never attach the session to a destination supplied by a user or another host.
  if (!path.startsWith("/api/") || path.startsWith("//")) {
    throw new Error("Destino de API inválido.");
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Inicia sessão para continuar.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(path, { ...init, headers });
}
