import { NextResponse } from 'next/server';
import { ApiError, apiErrorResponse, requireUuid } from '@/lib/api-auth';
import { adminContext, audit, privateHeaders } from '@/lib/admin-data';
export async function GET(request: Request) {
    try {
        const { actor, db } = await adminContext(request), id = new URL(request.url).searchParams.get('id');
        requireUuid(id, 'Ficheiro');
        const { data, error } = await db.rpc('admin_files', { p_id: id, p_limit: 1 });
        const file = data?.rows?.[0];
        if (error)
            throw new ApiError(503, 'Não foi possível consultar o ficheiro.');
        if (!file)
            throw new ApiError(404, 'Ficheiro não encontrado.');
        if (!['student-cvs', 'cvs', 'student-avatars', 'company-logos'].includes(file.bucket_id) || /\\|\x00/.test(file.name) || file.name.split('/').some((p: string) => p === '..' || p === '.' || !p))
            throw new ApiError(422, 'Referência de ficheiro inválida.');
        if (Number(file.size) > 20 * 1024 * 1024)
            throw new ApiError(422, 'Este ficheiro excede o limite de download de 20 MB.');
        const { data: blob, error: downloadError } = await db.storage.from(file.bucket_id).download(file.name);
        if (downloadError || !blob)
            throw new ApiError(404, 'O ficheiro está indisponível.');
        if (blob.size > 20 * 1024 * 1024)
            throw new ApiError(422, 'O ficheiro excede o limite de download.');
        await audit(db, actor, 'descarregar', 'documentos', id, 1);
        const name = (file.name.split('/').pop() || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
        return new Response(blob, { headers: { ...privateHeaders, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${name}"` } });
    }
    catch (error) {
        const response = apiErrorResponse(error) || NextResponse.json({ error: 'Não foi possível obter o ficheiro.' }, { status: 500 });
        for (const [k, v] of Object.entries(privateHeaders))
            response.headers.set(k, v);
        return response;
    }
}
