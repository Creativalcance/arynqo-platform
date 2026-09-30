import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse } from '@/lib/api-auth';
import { adminCatalog, isAdminDataset } from '@/lib/admin-catalog';
import { adminContext, audit, filtersFor, readDataset, exportDataset, privateHeaders } from '@/lib/admin-data';
import { csv, zip } from '@/lib/admin-export';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
    try {
        const url = new URL(request.url), format = url.searchParams.get('format') || 'json', dataset = url.searchParams.get('dataset') || 'contas';
        if (!['json', 'csv', 'zip'].includes(format) || !isAdminDataset(dataset))
            throw new ApiError(400, 'Pedido inválido.');
        const { actor, db } = await adminContext(request, format !== 'json'), filters = filtersFor(url);
        if (format === 'zip') {
            const entries: {
                name: string;
                content: string;
            }[] = [];
            let count = 0, bytes = 0;
            // Capture the existing audit history before logging this download.
            for (const key of Object.keys(adminCatalog)) {
                if (!isAdminDataset(key))
                    continue;
                const rows = await exportDataset(db, key, { ...filters, search: '', role: '', confirmed: '', from: null, to: null });
                const content = csv(rows, adminCatalog[key].fields ? adminCatalog[key].fields.split(',') : undefined);
                bytes += Buffer.byteLength(content);
                if (bytes > 20 * 1024 * 1024)
                    throw new ApiError(422, 'A exportação completa excede 20 MB. Exporta cada conjunto separadamente.');
                entries.push({ name: `${key}.csv`, content });
                count += rows.length;
            }
            entries.push({ name: 'informacao.txt', content: `ARYNQO — exportação administrativa\nGerada em ${new Date().toISOString()}\n${filters.user ? 'Conta: ' + filters.user : 'Todas as contas e registos.'}\nOs CSV contêm dados e referências, não os ficheiros originais. Downloads na área administrativa. Não inclui credenciais, sessões, tokens push ou vetores internos de IA.\nConsulta sequencial: alterações concorrentes podem ocorrer entre conjuntos.\n` });
            await audit(db, actor, 'exportar', 'completa', filters.user, count);
            return new Response(new Uint8Array(zip(entries)), { headers: { ...privateHeaders, 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="arynqo-dados.zip"' } });
        }
        if (format === 'csv') {
            const rows = await exportDataset(db, dataset, filters);
            const requested = url.searchParams.get('columns')?.split(',');
            const allowed = adminCatalog[dataset].fields ? adminCatalog[dataset].fields.split(',') : Array.from(new Set(rows.flatMap(row => Object.keys(row))));
            if (requested && (!requested.length || requested.some(x => !allowed.includes(x))))
                throw new ApiError(400, 'Colunas inválidas.');
            await audit(db, actor, 'exportar', dataset, filters.user, rows.length);
            return new Response(csv(rows, requested || allowed), { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="arynqo-${dataset}.csv"` } });
        }
        const raw = url.searchParams.get('page') || '1';
        if (!/^\d{1,6}$/.test(raw) || Number(raw) < 1)
            throw new ApiError(400, 'Página inválida.');
        const page = Number(raw), result = await readDataset(db, dataset, filters, (page - 1) * 50, 50);
        await audit(db, actor, 'consultar', dataset, filters.user, result.rows.length);
        return NextResponse.json({ ...result, page, pageSize: 50 }, { headers: privateHeaders });
    }
    catch (error) {
        const response = apiErrorResponse(error) || NextResponse.json({ error: 'Não foi possível concluir a operação administrativa.' }, { status: 500 });
        for (const [key, value] of Object.entries(privateHeaders))
            response.headers.set(key, value);
        return response;
    }
}

// Keep search terms out of browser history and HTTP request URLs.
export async function POST(request: Request) {
    try {
        const body = await request.json();
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'Pedido inválido.');
        const allowed = ['dataset','page','format','q','role','confirmed','from','to','user','columns'];
        const url = new URL(request.url);
        url.search = '';
        for (const [key, value] of Object.entries(body)) {
            if (!allowed.includes(key) || typeof value !== 'string' || value.length > 2000) throw new ApiError(400, 'Pedido inválido.');
            url.searchParams.set(key, value);
        }
        return GET(new Request(url, {headers:request.headers}));
    } catch(error) {
        const response = apiErrorResponse(error) || NextResponse.json({error:'Pedido inválido.'}, {status:400});
        for (const [key,value] of Object.entries(privateHeaders)) response.headers.set(key,value);
        return response;
    }
}
