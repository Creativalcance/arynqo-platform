'use client';
import { useState } from 'react';
import { LText } from '@/lib/i18n/client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { linkedinSections, linkedinPreview, normalizeLinkedInDraft, selectLinkedInDraft, validateLinkedInText, type LinkedInDraft, type LinkedInSection } from '@/lib/linkedin-import';
export default function LinkedInImport({ occupied, onApply, disabled = false }: {
 occupied: Partial<Record<LinkedInSection, boolean>>; onApply: (draft: LinkedInDraft) => void; disabled?: boolean;
}) {
 const [mode,setMode]=useState<'pdf'|'text'>('pdf'),[file,setFile]=useState<File|null>(null),[text,setText]=useState('');
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [draft,setDraft]=useState<LinkedInDraft|null>(null),[selected,setSelected]=useState<LinkedInSection[]>([]);
 const entries=Object.entries(draft||{}) as [LinkedInSection,unknown][];
 function reset(){setDraft(null);setSelected([]);setMessage('');}
 async function analyze(){
  if(busy||!consent||disabled)return;
  reset();setBusy(true);
  try{
   if(mode==='pdf'&&(!file||file.size>4*1024*1024||!file.name.toLowerCase().endsWith('.pdf')))throw new Error('Seleciona um PDF até 4 MB.');
   if(mode==='text'&&!validateLinkedInText(text))throw new Error('Cola entre 80 e 40 000 caracteres do teu perfil.');
   const body=new FormData();body.append('source','linkedin');body.append('consent','true');
   if(mode==='pdf'&&file)body.append('file',file);else body.append('text',text);
   const response=await authenticatedFetch('/api/ai/parse-cv',{method:'POST',body,signal:AbortSignal.timeout(65000)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível importar. Tenta novamente.');
   const parsed=normalizeLinkedInDraft(data);
   if(!Object.keys(parsed).length)throw new Error('Não foi possível identificar informação profissional. Experimenta colar o texto do perfil.');
   setDraft(parsed);setSelected((Object.keys(parsed) as LinkedInSection[]).filter(key=>!occupied[key]));
  }catch(e){setMessage(e instanceof Error && e.name!=='TimeoutError'?e.message:'Não foi possível importar. Tenta novamente.');}
  finally{setBusy(false);}
 }
 return <details className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
  <summary className="cursor-pointer font-semibold text-blue-800"><LText text="Preencher com informação do LinkedIn" /></summary>
  <p className="mt-3 text-sm leading-6"><LText text="Importa o PDF do teu perfil ou cola o seu conteúdo. Não é necessário ligar a tua conta LinkedIn." /></p>
  <p className="mt-2 text-xs leading-5 text-slate-600"><LText text="No LinkedIn, abre o teu perfil no computador e procura Guardar como PDF no menu de recursos. Se essa opção não aparecer, copia as secções do perfil e usa Colar texto." /></p>
  <div className="mt-4 flex flex-wrap gap-2">{(['pdf','text'] as const).map(value=><button key={value} type="button" disabled={busy||disabled} aria-pressed={mode===value} onClick={()=>{setMode(value);reset();}} className={`rounded-full border px-3 py-2 text-sm ${mode===value?'bg-blue-700 text-white':'bg-white'}`}><LText text={value==='pdf'?'Carregar PDF':'Colar texto'} /></button>)}</div>
  {mode==='pdf'?<label className="mt-4 block text-sm"><LText text="PDF do perfil LinkedIn (até 4 MB)" /><input type="file" accept=".pdf,application/pdf" disabled={busy||disabled} onChange={e=>{setFile(e.target.files?.[0]||null);reset();}} className="mt-2 block w-full min-w-0 text-xs" /></label>:<label className="mt-4 block text-sm"><LText text="Conteúdo do teu perfil LinkedIn" /><textarea rows={8} maxLength={40000} disabled={busy||disabled} value={text} onChange={e=>{setText(e.target.value);reset();}} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" /></label>}
  <label className="mt-4 flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={consent} disabled={busy||disabled} onChange={e=>setConsent(e.target.checked)} className="mt-1 shrink-0" /><span><LText text="Confirmo que os dados são meus e autorizo o envio à OpenAI para extrair a informação profissional. O ficheiro é temporário e não substitui o meu currículo." /></span></label>
  <button type="button" disabled={busy||disabled||!consent||(mode==='pdf'?!file:!validateLinkedInText(text))} onClick={()=>void analyze()} className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><LText text={busy?'A analisar perfil…':'Analisar informação'} /></button>
  {message&&<p role="status" className="mt-3 text-sm text-blue-900"><LText text={message}/></p>}
  {draft&&<div className="mt-5 space-y-3"><h3 className="font-semibold"><LText text="Revê e escolhe as secções a preencher" /></h3><p className="text-xs leading-5"><LText text="As secções já preenchidas não estão selecionadas. Se as selecionares, o conteúdo será substituído. As competências são acrescentadas às existentes." /></p>
   {entries.map(([key,value])=><div key={key} className="rounded-xl border bg-white p-3"><label className="flex gap-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(key)} onChange={e=>setSelected(keys=>e.target.checked?[...keys,key]:keys.filter(k=>k!==key))}/><LText text={linkedinSections[key]} /></label><p className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-5">{linkedinPreview(value)}</p></div>)}
   <button type="button" disabled={!selected.length||disabled} onClick={()=>{onApply(selectLinkedInDraft(draft,selected));reset();setFile(null);setText('');setConsent(false);setMessage('Informação aplicada ao formulário. Revê os campos e clica em Guardar perfil.');}} className="w-full rounded-xl bg-[#07111F] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><LText text="Aplicar seleção ao formulário" /></button>
   <button type="button" onClick={reset} className="text-sm underline"><LText text="Descartar importação" /></button>
  </div>}
 </details>;
}
