'use client';
import { useEffect, useRef, useState } from 'react';
import { LText } from '@/lib/i18n/client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { AdminRow } from '@/lib/admin-export';
import type { AccountAction } from '@/lib/account-administration';
const labels = { suspend: 'Suspender conta', restore: 'Reativar conta', delete: 'Eliminar conta' };
export default function AccountActions({ row, onDone }: { row: AdminRow; onDone: () => void }) {
  const [action, setAction] = useState<AccountAction | null>(null);
  const [reason, setReason] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (action) dialog.current?.showModal(); else dialog.current?.close(); }, [action]);
  if (!['student', 'company'].includes(String(row.role))) return null;
  function open(value: AccountAction) { setError(''); setReason(''); setConfirmation(''); setAction(value); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !action) return;
    setBusy(true); setError('');
    try {
      const response = await authenticatedFetch('/api/admin/contas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: row.id, action, reason, confirmation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível gerir a conta.');
      setAction(null); onDone();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerir a conta.'); }
    finally { setBusy(false); }
  }
  const deleting = row.account_status === 'deleting';
  return <>
    {!deleting && <button className="text-amber-800 underline" onClick={() => open(row.account_status === 'suspended' ? 'restore' : 'suspend')}><LText text={row.account_status === 'suspended' ? labels.restore : labels.suspend} /></button>}
    <button className="text-red-700 underline" onClick={() => open('delete')}><LText text={deleting ? 'Concluir eliminação' : labels.delete} /></button>
    <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else setAction(null); }} aria-labelledby={`account-action-${row.id}`} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-left shadow-xl backdrop:bg-black/60">
      <h2 id={`account-action-${row.id}`} className="text-xl font-bold"><LText text={action ? labels[action] : ''} /></h2>
      <p className="mt-3 break-all font-semibold">{String(row.name || '')} · {String(row.email || '')}</p>
      <p className="mt-3 text-sm text-slate-600"><LText text={action === 'delete' ? 'A eliminação é permanente: remove a conta, perfis, documentos, imagens e registos associados, incluindo vagas e candidaturas. O registo administrativo da operação é conservado.' : action === 'restore' ? 'A conta volta a poder iniciar sessão. As vagas permanecem inativas até serem revistas e republicadas.' : 'O acesso fica bloqueado, incluindo sessões abertas. As vagas da empresa ficam inativas. Os dados são conservados.'} /></p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm"><LText text="Motivo" /><textarea autoFocus required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} className="mt-2 block w-full rounded-xl border p-3" /></label>
        <label className="block text-sm"><LText text="Escreve o email da conta para confirmar" /><input required type="email" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} className="mt-2 block w-full rounded-xl border p-3" /></label>
        {error && <p role="alert" className="text-sm text-red-700"><LText text={error} /></p>}
        <div className="flex flex-wrap gap-3"><button disabled={busy || confirmation.trim().toLowerCase() !== String(row.email).toLowerCase() || reason.trim().length < 5} className="rounded-full bg-red-700 px-5 py-3 text-white disabled:opacity-50"><LText text={busy ? 'A processar…' : 'Confirmar operação'} /></button><button type="button" disabled={busy} className="rounded-full border px-5 py-3" onClick={() => setAction(null)}><LText text="Cancelar" /></button></div>
      </form>
    </dialog>
  </>;
}
