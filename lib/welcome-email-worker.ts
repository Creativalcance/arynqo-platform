import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendWelcomeEmail, type WelcomeDelivery } from './welcome-email';

export async function processWelcomeEmails(options: { userId?: string; db?: SupabaseClient; transport?: typeof fetch; intervalMs?: number } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, apiKey = process.env.RESEND_API_KEY;
  if (!url || !key || !apiKey) return { configured: false, sent: 0, retry: 0, failed: 0 };
  const db = options.db || createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  });
  const config = { apiKey, from: process.env.NOTIFICATION_FROM_EMAIL || 'ARYNQO <no-reply@arynqo.com>', baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.arynqo.com' };
  const started = Date.now(), totals = { configured: true, sent: 0, retry: 0, failed: 0 };
  for (let count = 0; count < (options.userId ? 1 : 30) && Date.now() - started < 25000; count++) {
    if (count) await new Promise(resolve => setTimeout(resolve, options.intervalMs ?? 650));
    const { data, error } = await db.rpc('claim_welcome_email', { person: options.userId || null });
    if (error) throw new Error('welcome_email_claim_failed');
    if (!data) break;
    const row = data as WelcomeDelivery;
    const result = await sendWelcomeEmail(row, config, options.transport);
    const finished = await db.rpc('finish_welcome_email', { target: row.id, lease: row.lease_id, outcome: result.outcome, provider: result.provider || null, reason: result.reason || null });
    if (finished.error) throw new Error('welcome_email_result_not_saved');
    totals[result.outcome]++;
    if (result.reason === 'provider_http_429') break;
  }
  return totals;
}
