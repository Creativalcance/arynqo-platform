import { requireActor, apiErrorResponse } from '@/lib/api-auth';

export async function GET(request: Request) {
    const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
    try {
        await requireActor(request, ['admin']);
        return Response.json({ authorized: true }, { headers });
    } catch (error) {
        const response = apiErrorResponse(error) || Response.json({ error: 'Não foi possível verificar as permissões.' }, { status: 503 });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        return response;
    }
}
