'use client';
import {useEffect,useId,useState} from 'react';
import {authenticatedFetch} from '@/lib/authenticated-fetch';
import {optionKey} from '@/lib/profile-options';
import {LText,useI18n} from '@/lib/i18n/client';
type Option={id:string;label:string};
export function OccupationCombobox({value,onChange,disabled=false}:{value:string;onChange:(id:string)=>void;disabled?:boolean}){
 const {locale,t}=useI18n(),id=useId();
 const [creating,setCreating]=useState(false);
 const [query,setQuery]=useState(''),[items,setItems]=useState<Option[]>([]),[open,setOpen]=useState(false),[active,setActive]=useState(-1),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!value)return;const abort=new AbortController();
 void fetch(`/api/occupations?locale=${locale}&id=${encodeURIComponent(value)}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(!abort.signal.aborted)setQuery(d.items[0]?.label||'');}).catch(e=>{if(e.name!=='AbortError')setError('Não foi possível carregar as profissões.');});
 return()=>abort.abort();},[value,locale]);
 useEffect(()=>{if(!open)return;const abort=new AbortController();
 const timer=setTimeout(()=>{
 void fetch(`/api/occupations?locale=${locale}&q=${encodeURIComponent(query)}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{if(abort.signal.aborted)return;setItems(d.items);setActive(-1);setLoading(false);setError('');}).catch(e=>{if(e.name!=='AbortError'){setError('Não foi possível carregar as profissões.');setLoading(false);}});
 },200);return()=>{clearTimeout(timer);abort.abort();};},[query,locale,open]);
 useEffect(()=>{if(open&&active>=0)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:'nearest'});},[open,active,id]);
 const canCreate=!loading&&!error&&!value&&query.trim().length>=2&&query.trim().length<=150&&!items.some(o=>optionKey(o.label)===optionKey(query));
 const optionCount=items.length+(canCreate?1:0);
 async function create(){
 if(creating)return;setCreating(true);setError('');
 try{const response=await authenticatedFetch('/api/occupations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:query,locale})});const data=await response.json();if(!response.ok){if(data.items){setItems(data.items);setOpen(true);}throw new Error(data.error);}
 choose(data.item);
 }catch(e){setError(e instanceof Error?e.message:'Não foi possível adicionar a profissão. Tenta novamente.');}finally{setCreating(false);}
 }
 function choose(o:Option){setQuery(o.label);onChange(o.id);setOpen(false);setActive(-1);setError('');}
 return <div className="relative min-w-0">
 <label htmlFor={id} className="text-sm font-semibold"><LText text="Profissão" /></label>
 <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open&&active>=0?`${id}-${active}`:undefined} autoComplete="off" disabled={disabled||creating} maxLength={150} placeholder={t('Escreve para procurar e selecionar uma profissão')} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-900" value={query}
 onFocus={()=>{setOpen(true);setLoading(true);}}
 onBlur={()=>setOpen(false)}
 onChange={e=>{setQuery(e.target.value);setItems([]);setActive(-1);setLoading(true);setOpen(true);if(value)onChange('');}}
 onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);setActive(-1);}else if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setActive(a=>optionCount?Math.min(a+1,optionCount-1):-1);}else if(e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(a=>optionCount?Math.max(a-1,0):-1);}else if(e.key==='Enter'&&open){e.preventDefault();if(active>=0&&items[active])choose(items[active]);else if(canCreate&&active===items.length)void create();}}} />
 {open&&<div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-lg">
 <ul id={`${id}-list`} role="listbox" aria-label={t('Profissões sugeridas')}>
 {items.map((o,i)=><li key={o.id} id={`${id}-${i}`} role="option" aria-selected={i===active} className={`cursor-pointer break-words p-3 text-sm text-slate-900 ${i===active?'bg-blue-100':'hover:bg-slate-100'}`} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(o)}>{o.label}</li>)}
 {canCreate&&<li id={`${id}-${items.length}`} role="option" aria-selected={active===items.length} className={`cursor-pointer break-words p-3 text-sm font-semibold text-blue-700 ${active===items.length?'bg-blue-100':'hover:bg-slate-100'}`} onMouseDown={e=>e.preventDefault()} onClick={()=>void create()}>{t('Adicionar profissão')}: «{query.trim()}»</li>}
 </ul>{loading?<p role="status" className="p-3 text-sm text-slate-600"><LText text="A carregar..." /></p>:!items.length&&!error&&!canCreate?<p role="status" className="p-3 text-sm text-slate-600"><LText text="Não foram encontradas profissões. Experimenta outro termo." /></p>:null}
 </div>}
 {creating&&<p role="status" className="mt-2 text-sm text-slate-700"><LText text="A guardar profissão..." /></p>}
 {!value&&query&&!open&&<p className="mt-2 text-xs text-slate-600"><LText text="Seleciona uma profissão nas sugestões para confirmar a escolha." /></p>}
 {error&&<p role="alert" className="mt-2 text-sm text-red-700"><LText text={error} /></p>}
 <p className="mt-2 text-xs text-slate-500"><LText text="Catálogo ESCO e profissões adicionadas pelos utilizadores." /> ESCO · © European Union · CC BY 4.0</p>
 </div>;
}
