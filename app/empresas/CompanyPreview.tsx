'use client';
import {useState} from 'react';
import type {CompanyLandingCopy} from '@/lib/company-landing-copy';
export default function CompanyPreview({copy:c}:{copy:CompanyLandingCopy}){
 const [active,setActive]=useState(0);
 return <div className="min-w-0 rounded-[28px] border border-white/20 bg-white/5 p-3 shadow-[0_30px_90px_rgba(0,0,0,0.35)] sm:p-5">
  <div className="flex items-center justify-between gap-3 px-2 pb-5 pt-2"><span className="text-sm font-bold tracking-widest">ARYNQO<span className="ml-2 font-normal text-slate-400">/ {c.workspace}</span></span><span aria-hidden="true" className="text-[#73CBFF]">↗</span></div>
  <div className="rounded-2xl bg-[#F7F9FC] p-4 text-[#07111F] sm:p-6"><p className="mb-5 text-xs font-medium text-slate-500">{c.demo}</p>
   <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1" aria-label={c.workspace}>{c.tabs.map((s,i)=><button key={s} type="button" aria-pressed={active===i} aria-controls="company-preview-content" onClick={()=>setActive(i)} className={`min-h-11 min-w-0 break-words rounded-lg px-2 py-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-blue-600 ${active===i?'bg-white text-blue-700 shadow-sm':'text-slate-600 hover:bg-white/60'}`}>{s}</button>)}</div>
   <div id="company-preview-content" aria-live="polite" className="mt-6 min-h-64"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700">0{active+1}</span><h2 className="text-lg font-bold">{c.steps[active][0]}</h2></div><div className="mt-5 space-y-3">{c.preview[active].map((s,i)=><div key={s} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm"><span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${i===0?'bg-blue-600 text-white':'bg-blue-50 text-blue-700'}`}>{active===1?'✓':i+1}</span>{s}</div>)}</div></div>
   <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">{c.control}</p>
  </div>
 </div>;
}
