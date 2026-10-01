"use client";
import { browserLocale } from "@/lib/i18n/config";
import { LText, LElement } from "@/lib/i18n/client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { adminCatalog, labelFor, type AdminDataset } from '@/lib/admin-catalog';
import type { AdminRow } from '@/lib/admin-export';
import { supabase } from '@/lib/supabase';
const control = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50';
function valueText(value: unknown) { if (value === null || value === undefined || value === '')
    return '—'; if (typeof value === 'boolean')
    return value ? 'Sim' : 'Não'; return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value); }
const roles: Record<string, string> = { student: 'Candidato', company: 'Empresa', admin: 'Administrador', missing: 'Sem perfil' };
function displayValue(field: string, value: unknown) {
 if(field==='role')return roles[String(value)]||'Sem perfil';
 if((field.endsWith('_at')||field==='banned_until')&&typeof value==='string'&&!Number.isNaN(Date.parse(value)))return new Intl.DateTimeFormat(browserLocale(),{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Lisbon'}).format(new Date(value));
 return valueText(value);
}

export default function AdminAccounts() {
    const [allowed, setAllowed] = useState(false);
    const [accessError, setAccessError] = useState('');
    useEffect(() => {
        let active = true, generation = 0;
        async function validate() {
            const attempt = ++generation;
            setAllowed(false);
            setAccessError('');
            try {
                const response = await authenticatedFetch('/api/admin/acesso', { cache: 'no-store' });
                if (!active || attempt !== generation) return;
                if (response.status === 401) { window.location.replace('/admin/login'); return; }
                if (!response.ok) throw new Error(response.status === 403 ? 'Esta área está reservada a administradores.' : 'Não foi possível verificar as permissões.');
                setAllowed(true);
            } catch (error) {
                if (active && attempt === generation) setAccessError(error instanceof Error ? error.message : 'Não foi possível verificar as permissões.');
            }
        }
        void validate();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            // Defer Auth calls until the Auth callback has released its lock.
            setAllowed(false);
            queueMicrotask(() => { if (active) void validate(); });
        });
        return () => { active = false; generation++; subscription.unsubscribe(); };
    }, []);
    if (!allowed) return <main className="min-h-screen bg-[#F7F9FC] px-6 py-12 text-center"><p role="status"><LText text={accessError || 'A verificar acesso…'} /></p>{accessError && <Link href="/admin/login" className="mt-4 inline-block text-blue-700 underline"><LText text={"Iniciar sessão de administrador"} /></Link>}</main>;
    return <AdminAccountsContent />;
}

function AdminAccountsContent() {
    const [dataset, setDataset] = useState<AdminDataset>('contas'), [rows, setRows] = useState<AdminRow[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
    const [q, setQ] = useState(''), [role, setRole] = useState(''), [confirmed, setConfirmed] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('');
    const [user, setUser] = useState<{
        id: string;
        name: string;
    } | null>(null), [selected, setSelected] = useState<AdminRow | null>(null);
    const [busy, setBusy] = useState(false), [exporting, setExporting] = useState(false), [error, setError] = useState(''), [reload, setReload] = useState(0), [columns, setColumns] = useState<string[]>([]), [showColumns, setShowColumns] = useState(false);
    const [preview, setPreview] = useState<{
        url: string;
        mime: string;
        name: string;
    } | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    function query() { const params = new URLSearchParams({ dataset, page: String(page) }); if (dataset === 'contas') {
        if (q)
            params.set('q', q);
        if (role)
            params.set('role', role);
        if (confirmed)
            params.set('confirmed', confirmed);
    } if (from)
        params.set('from', from); if (to)
        params.set('to', to); if (user)
        params.set('user', user.id); return params; }
    useEffect(() => {
        let active = true;
        const params = new URLSearchParams({ dataset, page: String(page) });
        if (dataset === 'contas') {
            if (q)
                params.set('q', q);
            if (role)
                params.set('role', role);
            if (confirmed)
                params.set('confirmed', confirmed);
        }
        if (from)
            params.set('from', from);
        if (to)
            params.set('to', to);
        if (user)
            params.set('user', user.id);
        const timer = setTimeout(() => { setBusy(true); setError(''); setSelected(null); void authenticatedFetch('/api/admin/dados', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(params))}).then(async (response) => { const data = await response.json(); if (!response.ok)
            throw new Error(data.error || 'Não foi possível carregar.'); if (active) {
            setRows(data.rows);
            setTotal(data.total);
        } }).catch(e => { if (active) {
            setError(e instanceof Error ? e.message : 'Erro de ligação.');
            setRows([]);
            setTotal(0);
        } }).finally(() => { if (active)
            setBusy(false); }); }, 250);
        return () => { clearTimeout(timer); active = false; };
    }, [dataset, page, q, role, confirmed, from, to, user, reload]);
    useEffect(() => { if (!preview)
        return; const dialog = dialogRef.current; dialog?.showModal(); return () => { dialog?.close(); URL.revokeObjectURL(preview.url); }; }, [preview]);
    const fields = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    const visible = columns.length ? columns.filter(x => fields.includes(x)) : fields.slice(0, dataset === 'documentos' ? 7 : 6);
    function changeDataset(next: AdminDataset) { setDataset(next); setPage(1); setColumns([]); setFrom(''); setTo(''); setSelected(null); }
    async function download(format: 'csv' | 'zip') {
        setExporting(true);
        setError('');
        try {
            const params = query();
            params.set('format', format);
            if (format === 'csv' && columns.length)
                params.set('columns', columns.join(','));
            const response = await authenticatedFetch('/api/admin/dados', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(params))});
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error);
            }
            const blob = await response.blob(), url = URL.createObjectURL(blob), anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = format === 'zip' ? 'arynqo-dados.zip' : `arynqo-${dataset}.csv`;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível exportar.');
        }
        finally {
            setExporting(false);
        }
    }
    async function file(row: AdminRow, view = false) { setError(''); try {
        const response = await authenticatedFetch('/api/admin/ficheiros?id=' + encodeURIComponent(String(row.id)));
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error);
        }
        const blob = await response.blob();
        const name = String(row.name).split('/').pop() || 'documento';
        const mime = String(row.mime_type);
        const url = URL.createObjectURL(new Blob([blob], { type: mime }));
        if (view && ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mime)) {
            setPreview({ url, mime, name });
        }
        else {
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Ficheiro indisponível.');
    } }
    return <main className="min-h-screen bg-[#F7F9FC] px-4 py-10 text-[#07111F] md:px-8"><div className="mx-auto max-w-7xl">
 <Link href="/admin" className="text-sm text-blue-700 underline"><LText text={"← Administração"} /></Link>
 <div className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-[#1683FF]"><LText text={"ARYNQO · Administração"} /></p><h1 className="mt-2 text-3xl font-bold"><LText text={"Contas e dados"} /></h1><p className="mt-3 text-sm text-slate-600"><LText text={"Consulta de contas, atividade e documentos. Os acessos e as exportações ficam registados."} /></p></div><div className="flex flex-wrap gap-3"><button className={button} disabled={busy || exporting || !!error} onClick={() => void download('csv')}><LText text={exporting ? 'A preparar…' : 'Exportar CSV'} /></button><button className={button} disabled={busy || exporting || !!error} onClick={() => void download('zip')}><LText text={user ? 'Exportar ficha completa (ZIP)' : 'Exportar todos os dados (ZIP)'} /></button></div></div>
 {user && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"><p><LText text={"Ficha: "} /><strong>{user.name}</strong><span className="ml-3 break-all text-xs"><LText text={user.id} /></span></p><button className="text-sm underline" onClick={() => { setUser(null); changeDataset('contas'); }}><LText text={"Voltar a todas as contas"} /></button></div>}
 <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap gap-4"><label className="text-sm"><LText text={"Área"} /><select className={'mt-2 block ' + control} value={dataset} onChange={e => changeDataset(e.target.value as AdminDataset)}>{Object.entries(adminCatalog).map(([key, spec]) => <option key={key} value={key}><LText text={spec.label} /></option>)}</select></label>
 {dataset === 'contas' && <><label className="text-sm"><LText text={"Nome ou email"} /><LElement as="input" className={'mt-2 block ' + control} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Pesquisar contas"/></label><label className="text-sm"><LText text={"Perfil"} /><select className={'mt-2 block ' + control} value={role} onChange={e => { setRole(e.target.value); setPage(1); }}><option value=""><LText text={"Todos"} /></option>{Object.entries(roles).map(([k, v]) => <option key={k} value={k}><LText text={v} /></option>)}</select></label><label className="text-sm"><LText text={"Email"} /><select className={'mt-2 block ' + control} value={confirmed} onChange={e => { setConfirmed(e.target.value); setPage(1); }}><option value=""><LText text={"Todos"} /></option><option value="yes"><LText text={"Confirmado"} /></option><option value="no"><LText text={"Por confirmar"} /></option></select></label></>}
 {dataset !== 'documentos' && <><label className="text-sm"><LText text={"Registo desde"} /><input type="date" className={'mt-2 block ' + control} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}/></label><label className="text-sm"><LText text={"Até"} /><input type="date" className={'mt-2 block ' + control} value={to} onChange={e => { setTo(e.target.value); setPage(1); }}/></label></>}
 <button className="self-end text-sm underline" onClick={() => { setQ(''); setRole(''); setConfirmed(''); setFrom(''); setTo(''); setPage(1); }}><LText text={"Limpar filtros"} /></button></div></section>
 {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><LText text={error} /> <button className="ml-3 underline" onClick={() => setReload(n => n + 1)}><LText text={"Tentar novamente"} /></button> <Link className="ml-3 underline" href="/admin/login"><LText text={"Iniciar sessão de administrador"} /></Link></div>}
 <div className="my-5 flex flex-wrap justify-between gap-3"><p role="status" className="text-sm text-slate-600"><LText text={busy ? 'A carregar…' : `${total} registos · página ${page} de ${Math.max(1, Math.ceil(total / 50))}`} /></p><button className="text-sm underline" onClick={() => setShowColumns(!showColumns)}><LText text={"Escolher colunas"} /></button></div>
 {showColumns && <div className="mb-5 flex flex-wrap gap-4 rounded-xl bg-white p-4"><button className="text-sm underline" onClick={() => setColumns([])}><LText text={"Colunas predefinidas"} /></button>{fields.map(field => <label key={field} className="text-xs"><input type="checkbox" className="mr-2" checked={visible.includes(field)} onChange={() => setColumns(visible.includes(field) ? visible.filter(x => x !== field) : [...visible, field])}/><LText text={labelFor(field)} /></label>)}</div>}
 {!busy && !error && rows.length === 0 ? <p className="rounded-2xl border border-dashed bg-white p-8 text-slate-600"><LText text={"Não existem registos para esta seleção."} /></p> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr>{visible.map(field => <th scope="col" key={field} className="px-4 py-3"><LText text={labelFor(field)} /></th>)}<th scope="col" className="px-4 py-3"><LText text={"Ações"} /></th></tr></thead><tbody>{rows.map((row, i) => <tr className="border-t border-slate-100" key={String(row.id || row.user_id || row.student_id || i) + '-' + i}>{visible.map(field => <td key={field} className="max-w-xs px-4 py-4"><span className="line-clamp-3 break-words">{["role","status","is_read","email_confirmed","has_candidate_profile","has_company_profile"].includes(field) ? <LText text={displayValue(field,row[field])} /> : displayValue(field,row[field])}</span></td>)}<td className="px-4 py-4"><div className="flex flex-col items-start gap-2"><button className="text-blue-700 underline" onClick={() => setSelected(row)}><LText text={"Ver dados"} /></button>{dataset === 'contas' && <button className="text-blue-700 underline" onClick={() => { setUser({ id: String(row.id), name: String(row.name || row.email || row.id) }); changeDataset(row.has_company_profile ? 'empresas' : row.has_candidate_profile ? 'candidatos' : 'contas'); }}><LText text={"Abrir ficha"} /></button>}{dataset === 'documentos' && <><button className="text-blue-700 underline" onClick={() => void file(row)}><LText text={"Descarregar"} /></button>{['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(String(row.mime_type)) && <button className="text-blue-700 underline" onClick={() => void file(row, true)}><LText text={"Visualizar"} /></button>}</>}</div></td></tr>)}</tbody></table></div>}
 <div className="mt-5 flex gap-4"><button className={button} disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}><LText text={"Anterior"} /></button><button className={button} disabled={page * 50 >= total || busy} onClick={() => setPage(p => p + 1)}><LText text={"Seguinte"} /></button></div>
 <p className="mt-5 text-xs leading-6 text-slate-500"><LText text={"Os instantes são apresentados na hora de Portugal continental; os filtros por data usam UTC. O CSV exporta todos os registos da seleção, até 10 000 por conjunto. O ZIP reúne os conjuntos completos, ou os associados à ficha aberta; não aplica os filtros da listagem. Documentos originais são descarregados individualmente. Ligações externas e referências antigas constam dos perfis e projetos, mas podem já não estar disponíveis."} /></p>
 {selected && <section className="mt-8 rounded-2xl border bg-white p-6"><div className="flex justify-between gap-4"><h2 className="text-xl font-bold"><LText text={"Dados do registo"} /></h2><button onClick={() => setSelected(null)} className="underline"><LText text={"Fechar"} /></button></div><dl className="mt-5 grid gap-4 md:grid-cols-2">{Object.entries(selected).map(([key, value]) => <div className="min-w-0 rounded-xl bg-slate-50 p-4" key={key}><dt className="text-xs font-semibold text-slate-600"><LText text={labelFor(key)} /></dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm"><LText text={displayValue(key,value)} /></dd></div>)}</dl></section>}
 {preview && <LElement as="dialog" ref={dialogRef} onCancel={() => setPreview(null)} aria-label={preview.name} className="fixed inset-0 z-50 h-[90vh] w-[95vw] flex-col bg-white p-6 backdrop:bg-black/60"><div className="flex justify-between gap-4"><h2 className="break-all font-bold">{preview.name}</h2><button autoFocus onClick={() => setPreview(null)} className={button}><LText text={"Fechar"} /></button></div>{preview.mime === 'application/pdf' ? <LElement as="iframe" title={preview.name} src={preview.url} className="mt-5 h-[75vh] w-full"/> : <div className="mt-5 flex h-[75vh] justify-center"><picture><LElement as="img" src={preview.url} alt={preview.name} className="h-full max-w-full object-contain"/></picture></div>}</LElement>}
 </div></main>;
}
