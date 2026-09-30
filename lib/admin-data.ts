import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError, requireActor, requireUuid, enforceApiLimit, type ApiActor } from './api-auth';
import { adminCatalog, type AdminDataset } from './admin-catalog';
import type { AdminRow } from './admin-export';
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
export type AdminFilters = {
    search: string;
    role: string;
    confirmed: string;
    from: string | null;
    to: string | null;
    user: string | null;
};
export function filtersFor(url: URL): AdminFilters {
    const role = url.searchParams.get('role') || '', confirmed = url.searchParams.get('confirmed') || '';
    if (!['', 'student', 'company', 'admin', 'missing'].includes(role) || !['', 'yes', 'no'].includes(confirmed))
        throw new ApiError(400, 'Filtro inválido.');
    const date = (key: string) => { const v = url.searchParams.get(key); if (!v)
        return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
        throw new ApiError(400, 'Data inválida.'); return v; };
    const from = date('from'), last = date('to'), to = last ? new Date(Date.parse(last) + 86400000).toISOString() : null;
    if (from && to && Date.parse(from) >= Date.parse(to))
        throw new ApiError(400, 'O intervalo de datas é inválido.');
    const user = url.searchParams.get('user');
    if (user)
        requireUuid(user, 'Conta');
    return { search: (url.searchParams.get('q') || '').trim().slice(0, 100), role, confirmed, from, to, user };
}
export async function adminContext(request: Request, exporting = false) {
    const actor = await requireActor(request, ['admin']);
    await enforceApiLimit(actor, exporting ? 'admin-export' : 'admin-read', exporting ? 10 : 300, 900);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
        throw new ApiError(503, 'Administração indisponível.');
    return { actor, db: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } }) };
}
export async function audit(db: SupabaseClient, actor: ApiActor, action: 'consultar' | 'exportar' | 'descarregar', dataset: string, target: string | null, count: number | null) {
    const { error } = await db.from('admin_access_log').insert({ actor_id: actor.id, action, dataset, target_id: target, row_count: count });
    if (error)
        throw new ApiError(503, 'Não foi possível registar o acesso administrativo.');
}
async function relatedIds(db: SupabaseClient, table: string, field: string, user: string) {
    const { data, error, count } = await db.from(table).select('id', {count:'exact'}).eq(field, user).limit(1000);
    if (error)
        throw new ApiError(503, 'Não foi possível consultar os dados associados.');
    if ((count || 0) > 1000)
        throw new ApiError(422, 'Consulta os dados globais: esta conta excede o limite de relações da ficha.');
    return data.map(x => x.id as string);
}
export async function readDataset(db: SupabaseClient, dataset: AdminDataset, f: AdminFilters, offset: number, limit: number): Promise<{
    rows: AdminRow[];
    total: number;
}> {
    if (dataset === 'contas' || dataset === 'documentos') {
        const { data, error } = await db.rpc(dataset === 'contas' ? 'admin_accounts' : 'admin_files', dataset === 'contas' ? { p_search: f.search, p_role: f.role, p_confirmed: f.confirmed, p_from: f.from, p_to: f.to, p_offset: offset, p_limit: limit, p_id: f.user } : { p_offset: offset, p_limit: limit, p_user: f.user });
        if (error || !data)
            throw new ApiError(503, 'Não foi possível carregar os registos.');
        return data;
    }
    const spec = adminCatalog[dataset];
    let query = db.from(spec.table).select(spec.fields, { count: 'exact' }).order(spec.key, { ascending: true });
    if (dataset === 'competencias_candidatos' || dataset === 'competencias_vagas')
        query = query.order('skill_id', { ascending: true });
    if (f.user) {
        if (dataset === 'perfis')
            query = query.eq('id', f.user);
        else if (['candidatos', 'empresas', 'notificacoes', 'preferencias', 'dispositivos'].includes(dataset))
            query = query.eq('user_id', f.user);
        else if (dataset === 'historico')
            query = query.or(`actor_id.eq.${f.user},target_id.eq.${f.user}`);
        else {
            const [students,companies] = await Promise.all([relatedIds(db, 'student_profiles', 'user_id', f.user),relatedIds(db, 'company_profiles', 'user_id', f.user)]);
            let jobIds: string[] = [];
            if (companies.length) {
                const { data, error, count } = await db.from('jobs').select('id', {count:'exact'}).in('company_id', companies).limit(1000);
                if (error)
                    throw new ApiError(503, 'Não foi possível consultar as vagas.');
                if ((count || 0) > 1000)
                    throw new ApiError(422, 'Consulta global necessária para esta empresa.');
                jobIds = data.map(x => x.id);
            }
            if (dataset === 'vagas' || dataset === 'subscricoes')
                query = query.in('company_id', companies.length ? companies : ['00000000-0000-0000-0000-000000000000']);
            else if (dataset === 'competencias_vagas')
                query = query.in('job_id', jobIds.length ? jobIds : ['00000000-0000-0000-0000-000000000000']);
            else if (['candidaturas', 'matches', 'matches_anteriores', 'contactos', 'acoes_empresas'].includes(dataset)) {
                const predicates = [students.length ? `student_id.in.(${students.join(',')})` : '', jobIds.length ? `job_id.in.(${jobIds.join(',')})` : ''].filter(Boolean);
                if (!predicates.length)
                    return { rows: [], total: 0 };
                query = query.or(predicates.join(','));
            }
            else if (['favoritos', 'acoes_candidatos', 'projetos', 'competencias_candidatos'].includes(dataset))
                query = query.in('student_id', students.length ? students : ['00000000-0000-0000-0000-000000000000']);
            else
                return { rows: [], total: 0 };
        }
    }
    if (spec.fields.split(',').includes('created_at')) {
        if (f.from)
            query = query.gte('created_at', f.from);
        if (f.to)
            query = query.lt('created_at', f.to);
    }
    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (error)
        throw new ApiError(503, 'Não foi possível carregar os registos.');
    return { rows: (data || []) as unknown as AdminRow[], total: count || 0 };
}
export async function exportDataset(db: SupabaseClient, dataset: AdminDataset, f: AdminFilters) {
    const rows: AdminRow[] = [];
    let total = 0;
    for (let offset = 0;; offset += 500) {
        const page = await readDataset(db, dataset, f, offset, 500);
        total = page.total;
        if (total > 10000)
            throw new ApiError(422, 'A exportação excede 10 000 registos. Reduz o intervalo de datas ou seleciona uma conta.');
        rows.push(...page.rows);
        if (rows.length >= total)
            break;
        if (!page.rows.length)
            throw new ApiError(409, 'Os dados mudaram durante a exportação. Tenta novamente.');
    }
    return rows;
}
