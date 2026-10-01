"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
type Tag = { id: string; label: string; status: string; source: string; source_uri: string | null; source_version: string | null; equivalentLabel?: string; aliasTargetId?: string };
const labels: Record<string, string> = { pending: "Por rever", approved: "Aprovadas", rejected: "Retiradas" };
export default function SkillCatalogPage() {
 const [rows,setRows] = useState<Tag[]>([]), [status,setStatus] = useState("pending"), [query,setQuery] = useState("");
 const [page,setPage] = useState(1), [total,setTotal] = useState(0), [revision,setRevision] = useState(0);
 const [authorized,setAuthorized] = useState(false);
 const [loading,setLoading] = useState(true), [error,setError] = useState(""), [busy,setBusy] = useState(false);
 const [selected,setSelected] = useState<Tag | null>(null), [targetQuery,setTargetQuery] = useState("");
 const [targets,setTargets] = useState<{id:string;label:string}[]>([]), [targetId,setTargetId] = useState("");
 useEffect(() => {
  let cancelled=false;
  const timer=setTimeout(async () => {
   setLoading(true);setError("");
   try {
    const response=await authenticatedFetch(`/api/admin/competencias?status=${status}&page=${page}&q=${encodeURIComponent(query)}`);
    const data=await response.json();
    if (response.status===401 || response.status===403) {window.location.href=response.status===401 ? "/admin/login" : "/dashboard";return;}
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar.");
    if (!cancelled) { setAuthorized(true);setRows(data.rows || []);setTotal(data.total || 0); }
   } catch(e) { if (!cancelled) {setError(e instanceof Error ? e.message : "Erro ao carregar.");setRows([]);} }
   finally {if (!cancelled) setLoading(false);}
  },300);
  return () => {cancelled=true;clearTimeout(timer);};
 },[status,page,query,revision]);
 useEffect(() => {
  let cancelled=false;
  const timer=setTimeout(async () => {
   if (!selected || !targetQuery.trim()) {setTargets([]);return;}
   try {
   const response=await authenticatedFetch(`/api/admin/competencias?status=approved&q=${encodeURIComponent(targetQuery)}`);
   const data=await response.json();
   if (!cancelled) {if (!response.ok) {setError(data.error || "Não foi possível procurar o destino.");setTargets([]);}else setTargets((data.rows || []).filter((t:Tag)=>t.id!==selected.id));}
   } catch(e) {if(!cancelled) {setError(e instanceof Error ? e.message : "Não foi possível procurar o destino.");setTargets([]);}}

  },300);
  return () => {cancelled=true;clearTimeout(timer);};
 },[selected,targetQuery]);
 async function decide(tag:Tag, action:string, target?:string) {
  if (busy) return;
  const targetName=targets.find(t=>t.id===target)?.label;
  if (!window.confirm(action==="alias" ? `Confirmas que “${tag.label}” e “${targetName}” são a mesma competência? Esta equivalência será usada na compatibilidade.` : action==="unlink" ? `Desfazer a equivalência de “${tag.label}”? A associação deixará de ser usada nos próximos cálculos.` : `${action==="approve" ? "Aprovar" : "Retirar"} “${tag.label}” das sugestões partilhadas?`)) return;
  setBusy(true);setError("");
  try {
   const response=await authenticatedFetch("/api/admin/competencias",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:tag.id,action,expectedStatus:tag.status,targetId:target})});
   const data=await response.json();if (!response.ok) throw new Error(data.error || "Não foi possível guardar.");
   setSelected(null);setTargetQuery("");setTargetId("");setRevision(r=>r+1);
  } catch(e) {setError(e instanceof Error ? e.message : "Não foi possível guardar.");}
  finally {setBusy(false);}
 }
 if (!authorized) return <main className="min-h-screen bg-[#F7F9FC] px-6 py-16 text-center"><p>{loading ? "A validar acesso de administrador…" : error || "Acesso reservado a administradores."}</p>{!loading && <Link href="/admin/login" className="mt-4 inline-block text-blue-700 underline">Iniciar sessão de administrador</Link>}</main>;
 return <main className="min-h-screen bg-[#F7F9FC] px-4 py-10 text-[#07111F]"><section className="mx-auto max-w-5xl">
  <Link href="/admin" className="text-blue-700 underline">← Administração</Link>
  <h1 className="mt-6 text-3xl font-bold">Catálogo de competências</h1>
  <p className="mt-3 text-slate-600">Revê as tags antes de as disponibilizar a todos. Aprovar um termo não comprova as competências de um candidato. Retirar uma tag das sugestões preserva as escolhas já guardadas nos perfis e nas vagas.</p>
  <div className="my-6 grid gap-3 sm:grid-cols-2"><select aria-label="Estado das competências" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="rounded-xl border bg-white p-3">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><input aria-label="Pesquisar competências" placeholder="Pesquisar competências" value={query} maxLength={80} onChange={e=>{setQuery(e.target.value);setPage(1);}} className="min-w-0 rounded-xl border bg-white p-3" /></div>
  {error && <p role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
  {loading ? <p>A carregar competências…</p> : !error && <><p className="mb-4 text-sm text-slate-500">{total} competências</p><div className="space-y-3">{rows.map(tag=><article key={tag.id} className="rounded-2xl border bg-white p-5"><p className="break-words font-semibold">{tag.label}</p><p className="mt-1 text-xs text-slate-500">{tag.source==="esco" ? `ESCO · ${tag.source_version}` : tag.source==="community" ? "Adicionada por um utilizador" : "Catálogo existente"}</p>{tag.source_uri && <a href={tag.source_uri} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-blue-700 underline">Consultar conceito ESCO</a>}<div className="mt-4 flex flex-wrap gap-2">{tag.aliasTargetId && <><span className="w-full text-sm text-slate-600">Equivalência: {tag.equivalentLabel}</span><button disabled={busy} onClick={()=>void decide(tag,"unlink")} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">Desfazer associação</button></>}{tag.status!=="approved" && <button disabled={busy} onClick={()=>void decide(tag,"approve")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">Aprovar</button>}{tag.status!=="rejected" && <button disabled={busy} onClick={()=>void decide(tag,"reject")} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">Retirar</button>}{!tag.source_uri && tag.source!=="esco" && <button disabled={busy} onClick={()=>{setSelected(tag);setTargetQuery("");setTargetId("");}} className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50">Associar a uma competência existente</button>}</div></article>)}</div>{rows.length===0 && <p>Não existem competências neste estado.</p>}<div className="mt-6 flex items-center justify-between gap-3"><button disabled={busy || page===1} className="rounded-xl border p-3 disabled:opacity-40" onClick={()=>setPage(p=>p-1)}>Anterior</button><span className="text-sm">Página {page} de {Math.max(1,Math.ceil(total/30))}</span><button disabled={busy || page*30>=total} className="rounded-xl border p-3 disabled:opacity-40" onClick={()=>setPage(p=>p+1)}>Seguinte</button></div></>}
  {selected && <section role="dialog" aria-label="Rever equivalência" className="mt-6 rounded-2xl border border-blue-300 bg-white p-5"><h2 className="font-semibold">Associar “{selected.label}”</h2><p className="mt-2 text-sm text-slate-600">Escolhe apenas uma competência com o mesmo significado. Relações entre competências e profissões não são equivalências. As escolhas antigas mantêm o texto original; a associação será usada nos próximos cálculos.</p><input aria-label="Pesquisar competência de destino" className="mt-4 w-full min-w-0 rounded-xl border p-3" value={targetQuery} maxLength={80} onChange={e=>{setTargetQuery(e.target.value);setTargetId("");}} placeholder="Pesquisar a competência aprovada" /><select aria-label="Competência de destino" className="mt-3 w-full min-w-0 rounded-xl border p-3" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Selecionar competência</option>{targets.map(t=><option value={t.id} key={t.id}>{t.label}</option>)}</select><div className="mt-4 flex flex-wrap gap-3"><button disabled={!targetId || busy} className="rounded-xl bg-blue-600 px-4 py-3 text-sm text-white disabled:opacity-50" onClick={()=>void decide(selected,"alias",targetId)}>Confirmar equivalência</button><button disabled={busy} className="rounded-xl border px-4 py-3 text-sm" onClick={()=>setSelected(null)}>Cancelar</button></div></section>}
  <p className="mt-8 text-xs text-slate-500">Competências ESCO: © União Europeia, reutilizadas com atribuição ao abrigo de CC BY 4.0. <a href="https://esco.ec.europa.eu/en/use-esco/download" target="_blank" rel="noopener noreferrer" className="underline">Fonte e versões</a>.</p>
 </section></main>;
}
