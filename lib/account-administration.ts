import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, requireUuid, type ApiActor } from './api-auth';
export type AccountAction = 'suspend' | 'restore' | 'delete';
export function accountOperationInput(actor: Pick<ApiActor, 'id' | 'role'>, input: Record<string, unknown>) {
  if (actor.role !== 'admin') throw new ApiError(403, 'Esta área está reservada a administradores.');
  requireUuid(input.userId, 'Conta');
  if (actor.id === input.userId) throw new ApiError(403, 'Não podes alterar a tua própria conta.');
  if (!['suspend', 'restore', 'delete'].includes(String(input.action))) throw new ApiError(400, 'Operação inválida.');
  if (typeof input.reason !== 'string' || input.reason.trim().length < 5 || input.reason.trim().length > 500) throw new ApiError(400, 'Indica um motivo entre 5 e 500 caracteres.');
  if (typeof input.confirmation !== 'string' || input.confirmation.length > 254) throw new ApiError(400, 'Confirma o email da conta.');
  return { userId: input.userId, action: input.action as AccountAction, reason: input.reason.trim(), confirmation: input.confirmation.trim() };
}
export async function administerAccount(db: SupabaseClient, actor: ApiActor, input: Record<string, unknown>) {
  const { userId, action, reason, confirmation } = accountOperationInput(actor, input);
  const { data: operation, error: beginError } = await db.rpc('begin_account_operation', {
    p_actor: actor.id, p_target: userId, p_action: action, p_reason: reason, p_confirmation: confirmation,
  });
  if (beginError || !operation) {
    if (beginError?.code === '42501') throw new ApiError(403, 'Só podes gerir contas de candidatos e empresas.');
    if (beginError?.code === '22023') throw new ApiError(400, 'Confirma o email da conta e o motivo.');
    if (['55P03', '55000'].includes(beginError?.code || '')) throw new ApiError(409, 'Existe uma operação pendente nesta conta. Aguarda ou conclui a eliminação.');
    throw new ApiError(503, 'Não foi possível iniciar a operação.');
  }
  try {
    const { error: authError } = await db.auth.admin.updateUserById(userId, { ban_duration: action === 'restore' ? 'none' : '876000h' });
    if (authError) throw new Error('Auth update failed');
    if (action === 'delete') {
      // Remove objects through Storage, never by deleting storage.objects rows.
      // Fetch page zero repeatedly because each batch is removed. Stop within
      // the request deadline; persisted deleting state makes retries safe.
      for (let batch = 0; batch < 20; batch++) {
        const { data, error } = await db.rpc('admin_files', { p_user: userId, p_offset: 0, p_limit: 100 });
        if (error || !data || !Array.isArray(data.rows)) throw new Error('File inventory failed');
        if (!data.rows.length) {
          if (data.total !== 0) throw new Error('File inventory inconsistent');
          break;
        }
        const buckets = new Map<string, string[]>();
        for (const row of data.rows as { bucket_id: string; name: string }[]) {
          buckets.set(row.bucket_id, [...(buckets.get(row.bucket_id) || []), row.name]);
        }
        for (const [bucket, names] of buckets) {
          const { error: storageError } = await db.storage.from(bucket).remove(names);
          if (storageError) throw new Error('File deletion failed');
        }
        if (batch === 19) throw new Error('Continue deletion in a new request');
      }
      const { error: deleteError } = await db.auth.admin.deleteUser(userId);
      if (deleteError) throw new Error('Account deletion failed');
    }
    const { error: finishError } = await db.rpc('finish_account_operation', { p_operation: operation, p_success: true });
    if (finishError) throw new Error('Audit completion failed');
  } catch {
    await db.rpc('finish_account_operation', { p_operation: operation, p_success: false });
    throw new ApiError(503, 'A operação não foi concluída. O acesso continua bloqueado. Atualiza a lista e tenta novamente.');
  }
}
