import { adminContext, privateHeaders } from '@/lib/admin-data';
import { administerAccount } from '@/lib/account-administration';
import { ApiError, apiErrorResponse } from '@/lib/api-auth';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { actor, db } = await adminContext(request, true);
    const input = await request.json().catch(() => { throw new ApiError(400, 'Pedido inválido.'); });
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Pedido inválido.');
    await administerAccount(db, actor, input);
    return Response.json({ success: true }, { headers: privateHeaders });
  } catch (error) {
    const response = apiErrorResponse(error) || Response.json({ error: 'Não foi possível gerir a conta.' }, { status: 503 });
    Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
