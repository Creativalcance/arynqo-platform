import { createClient } from "@supabase/supabase-js";
import { scheduleWelcomeEmail } from "@/lib/welcome-email-after";

export const maxDuration = 60;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  const reply = (body: object, status: number) => Response.json(body, { status, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Pedido de confirmação inválido." }, 403);
  }
  let tokenHash: unknown;
  try { tokenHash = (await request.json()).token_hash; }
  catch { return reply({ error: "O link de confirmação é inválido." }, 400); }
  if (typeof tokenHash !== "string" || !/^[a-zA-Z0-9_-]{20,256}$/.test(tokenHash)) {
    return reply({ error: "O link de confirmação é inválido." }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return reply({ error: "A confirmação está temporariamente indisponível." }, 503);
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
    });
    // Confirmation only: do not expose or persist the session returned by Auth.
    const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (error) {
      if (error.status === 429) return reply({ error: "Demasiadas tentativas. Aguarda um pouco antes de tentar novamente." }, 429);
      if (!error.status || error.status >= 500) return reply({ error: "Não foi possível confirmar agora. Tenta novamente dentro de momentos." }, 503);
      return reply({ error: "Este link expirou, já foi utilizado ou é inválido. Se já confirmaste a conta, podes iniciar sessão. Caso contrário, pede um novo email." }, 400);
    }
    if (!data.user?.email_confirmed_at) return reply({ error: "Não foi possível confirmar o email. Tenta novamente." }, 400);
    scheduleWelcomeEmail(data.user.id);
    return reply({ confirmed: true }, 200);
  } catch {
    return reply({ error: "Não foi possível confirmar agora. Tenta novamente dentro de momentos." }, 503);
  }
}
