import { adminContext, privateHeaders } from '@/lib/admin-data';
import { ApiError, apiErrorResponse, requireUuid } from '@/lib/api-auth';

export async function DELETE(request: Request) {
  try {
    const { actor, db } = await adminContext(request, true);
    const input = await request.json().catch(() => { throw new ApiError(400, 'Pedido inválido.'); });
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Pedido inválido.');
    requireUuid(input.jobId, 'ID da vaga');
    if (typeof input.confirmation !== 'string' || !input.confirmation.trim() || input.confirmation.length > 1000) {
      throw new ApiError(400, 'Escreve o título da vaga para confirmar.');
    }
    const { error } = await db.rpc('admin_delete_job', {
      p_actor: actor.id, p_job: input.jobId, p_confirmation: input.confirmation.trim(),
    });
    if (error?.code === '42501') throw new ApiError(403, 'Não tens permissões para esta operação.');
    if (error?.code === 'P0002') throw new ApiError(404, 'Esta vaga já não está disponível.');
    if (error?.code === '22023') throw new ApiError(409, 'O título não corresponde à vaga. Atualiza a lista e confirma novamente.');
    if (error) throw new ApiError(503, 'Não foi possível eliminar a vaga. Tenta novamente.');
    return Response.json({ success: true }, { headers: privateHeaders });
  } catch (error) {
    const response = apiErrorResponse(error) || Response.json({ error: 'Não foi possível eliminar a vaga. Tenta novamente.' }, { status: 503 });
    Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }
}
