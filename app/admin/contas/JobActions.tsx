'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LText } from '@/lib/i18n/client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { AdminRow } from '@/lib/admin-export';

export default function JobActions({ row, onDone }: { row: AdminRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const title = String(row.title || '');

  useEffect(() => {
    const element = dialog.current;
    if (open) element?.showModal();
    else element?.close();
    return () => element?.close();
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || confirmation.trim() !== title.trim() || !confirmation.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/admin/vagas', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: row.id, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível eliminar a vaga. Tenta novamente.');
      setOpen(false);
      onDone();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível eliminar a vaga. Tenta novamente.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (row.deleted_at) return <span className="text-slate-500"><LText text="Vaga eliminada" /></span>;
  return <>
    <button type="button" className="text-red-700 underline" onClick={() => { setConfirmation(''); setError(''); setOpen(true); }}><LText text="Eliminar vaga" /></button>
    <dialog ref={dialog} onCancel={event => { if (lock.current) event.preventDefault(); else setOpen(false); }}
      aria-labelledby={`delete-job-${row.id}`} aria-describedby={`delete-job-description-${row.id}`}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-left shadow-xl backdrop:bg-black/60">
      <h2 id={`delete-job-${row.id}`} className="text-xl font-bold"><LText text="Eliminar vaga" /></h2>
      <p className="mt-3 break-words font-semibold">{title}</p>
      <p id={`delete-job-description-${row.id}`} className="mt-3 text-sm leading-6 text-slate-600"><LText text="A vaga deixa de estar publicada e sai da gestão da empresa. As candidaturas e os registos associados ficam guardados. Esta ação não pode ser desfeita." /></p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm"><LText text="Escreve o título da vaga para confirmar." />
          <input autoFocus required autoComplete="off" maxLength={1000} value={confirmation} disabled={busy}
            onChange={event => setConfirmation(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-[#07111F]" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700"><LText text={error} /></p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy || !confirmation.trim() || confirmation.trim() !== title.trim()} className="rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><LText text={busy ? 'A processar…' : 'Confirmar eliminação'} /></button>
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-full border px-5 py-3 text-sm"><LText text="Cancelar" /></button>
        </div>
      </form>
    </dialog>
  </>;
}
