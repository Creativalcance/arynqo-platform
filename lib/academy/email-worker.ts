import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendAcademyEmail, type AcademyDelivery } from "./email";

// A bounded worker; rows remain durable when a function stops or a provider fails.
export async function processAcademyEmails(options: { db?: SupabaseClient; transport?: typeof fetch; budgetMs?: number; intervalMs?: number } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, apiKey = process.env.RESEND_API_KEY;
  if (!url || !key || !apiKey) return { configured: false, sent: 0, retry: 0, failed: 0 };
  const db = options.db || createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const config = { apiKey, from: process.env.NOTIFICATION_FROM_EMAIL || "ARYNQO <no-reply@arynqo.com>", baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://www.arynqo.com" };
  const started = Date.now(), budget = Math.min(options.budgetMs ?? 40000, 40000);
  const totals = { configured: true, sent: 0, retry: 0, failed: 0 };
  let lastStarted = 0;
  for (let count = 0; count < 50 && Date.now() - started < budget - 12000; count++) {
    const pause = (options.intervalMs ?? 650) - (Date.now() - lastStarted);
    if (pause > 0) await new Promise(resolve => setTimeout(resolve, pause));
    const { data, error } = await db.rpc("claim_academy_email");
    if (error) throw new Error("academy_email_claim_failed");
    if (!data) break;
    const row = data as AcademyDelivery;
    lastStarted = Date.now();
    const result = await sendAcademyEmail(row, config, options.transport);
    const finished = await db.rpc("finish_academy_email", { target: row.id, lease: row.lease_id, outcome: result.outcome, provider: result.provider || null, reason: result.reason || null });
    // Never issue a second provider request when persisting acceptance fails.
    if (finished.error) throw new Error("academy_email_result_not_saved");
    totals[result.outcome]++;
    if (result.reason === "provider_http_429") break;
  }
  return totals;
}
