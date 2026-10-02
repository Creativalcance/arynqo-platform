import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (Number(request.headers.get('content-length')) > 2048) return Response.json({ error: 'Invalid request' }, { status: 413, headers });
    const { email } = await request.json();
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Response.json({ error: 'Invalid email' }, { status: 400, headers });
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!key || !url) throw new Error('Unavailable');
    // Vercel overwrites this header; never accept a caller-supplied fingerprint.
    const address = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const fingerprint = createHmac('sha256', key).update(address).digest('hex');
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc('registration_status', { p_email: email.trim(), p_fingerprint: fingerprint });
    if (error || !data) throw new Error('Unavailable');
    if (data.limited) return Response.json({ error: 'limited' }, { status: 429, headers });
    return Response.json({ exists: data.exists === true }, { headers });
  } catch { return Response.json({ error: 'Unavailable' }, { status: 503, headers }); }
}
