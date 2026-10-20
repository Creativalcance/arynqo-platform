import { buildMatchRecord } from '@/lib/matching-five';
import { ApiError, requireActor, enforceApiLimit, authorizeMatchScope, apiErrorResponse } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadReviewedSkillAliases } from '@/lib/reviewed-skill-aliases';
import type { MatchingPreferences } from '@/lib/matching-preferences';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Source = {id: string; matching_preferences: MatchingPreferences | null; matching_revision: number};
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const requestedScope = await request.json().catch(() => ({})) as {studentId?: string; jobId?: string};
    if (!requestedScope || typeof requestedScope !== "object" || Array.isArray(requestedScope)) throw new ApiError(400, "Indica uma vaga ou um candidato.");
    const scope = await authorizeMatchScope(actor, requestedScope);
    await enforceApiLimit(actor, 'matching', 30, 60);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new ApiError(503, 'Serviço temporariamente indisponível.');
    const db = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
    const fields = 'id,matching_preferences,matching_revision';
    const load = async (kind: 'student_profiles' | 'jobs', id?: string) => {
      const rows: Source[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = db.from(kind).select(fields).order('id').range(offset, offset + 499);
        if (id) query = query.eq('id', id);
        if (kind === 'jobs') query = query.eq('is_active', true).is('archived_at', null).is('deleted_at', null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
        const {data, error} = await query;
        if (error) throw new ApiError(503, 'Não foi possível carregar os critérios dos matches.');
        rows.push(...(data || []) as Source[]);
        if (!data || data.length < 500) return rows;
      }
    };
    const [students, jobs, aliases] = await Promise.all([load('student_profiles', scope.studentId), load('jobs', scope.jobId), loadReviewedSkillAliases(db)]);
    if (scope.jobId && !jobs.length) throw new ApiError(409, 'Esta vaga já não está ativa para calcular matches.');
    const records = students.flatMap(student => jobs.map(job => buildMatchRecord(student, job, aliases)));
    let saved = 0;
    for (let offset = 0; offset < records.length; offset += 100) {
      const batch = records.slice(offset, offset + 100);
      const {data, error} = await db.rpc('save_matching_results', {p_results: batch});
      if (error) throw new ApiError(503, 'Não foi possível guardar os matches. Tenta novamente.');
      if (data !== batch.length) throw new ApiError(409, 'O perfil ou a vaga mudou durante o cálculo. Recalcula os matches.');
      saved += data;
    }
    return NextResponse.json({success: true, matches_generated: saved, matches_pending: records.filter(row => row.match_score === null).length});
  } catch (error) {
    const denied = apiErrorResponse(error);
    if (denied) return denied;
    console.error('Erro ao gerar matches:', error);
    return NextResponse.json({error: 'Não foi possível calcular os matches. Tenta novamente.'}, {status: 500});
  }
}
