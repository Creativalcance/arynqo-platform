import Link from '@/lib/i18n/link';
import {getLocale,getT} from '@/lib/i18n/server';
import {pageMetadata} from '@/lib/seo';
import {companyLaunchOfferActive} from '@/lib/company-plan';
import {companyLandingCopy} from '@/lib/company-landing-copy';
import CompanyPreview from './CompanyPreview';
export async function generateMetadata(){return pageMetadata('Recrutamento para empresas','Publica oportunidades, apresenta requisitos e gere candidaturas com apoio de IA na ARYNQO.','/empresas');}
export default async function Page(){
 const c=companyLandingCopy[await getLocale()],t=await getT();
 const action=t('Criar conta de empresa');
 return <main className="overflow-hidden bg-[#F7F9FC] text-[#07111F]">
  <section className="relative isolate overflow-hidden bg-[#07111F] text-white">
   <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-[650px] w-[650px] rounded-full bg-blue-600/20 blur-[100px]"/>
   <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12">
    <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#73CBFF]">{t('ARYNQO para empresas')}</p>
     <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.06] tracking-[-0.05em] sm:text-6xl">{c.title}<span className="block text-[#73CBFF]">{c.accent}</span></h1>
     <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">{c.intro}</p>
     <div className="mt-9 flex flex-wrap gap-3"><Link href="/registo?tipo=empresa" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#73CBFF] px-7 py-4 text-center text-sm font-bold text-[#07111F] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{action}<span aria-hidden="true" className="ml-3">↗</span></Link><a href="#como-funciona" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-7 py-4 text-sm font-semibold hover:bg-white/10">{c.how}</a></div>
     {companyLaunchOfferActive&&<p className="mt-6 flex items-start gap-2 text-sm text-slate-300"><span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400"/>{c.offer}</p>}
    </div><CompanyPreview copy={c}/>
   </div>
  </section>
  <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 sm:py-24 lg:px-12">
   <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{c.how}</p><h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{c.workflow}</h2></div><p className="max-w-sm leading-7 text-slate-600">{c.control}</p></div>
   <ol className="mt-10 grid gap-5 md:grid-cols-3">{c.steps.map((s,i)=><li key={s[0]} className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-blue-300 hover:shadow-lg motion-reduce:transition-none"><span className="text-5xl font-black text-blue-100">0{i+1}</span><h3 className="mt-6 text-xl font-bold">{s[0]}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{s[1]}</p></li>)}</ol>
  </section>
  <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 lg:grid-cols-2 lg:px-12">
   <div className="rounded-[32px] bg-[#E8F4FF] p-8 sm:p-10"><div aria-hidden="true" className="mb-10 flex flex-wrap gap-2">{c.skills.map(s=><span key={s} className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800">{s}</span>)}</div><h2 className="text-3xl font-bold tracking-tight">{c.matchTitle}</h2><p className="mt-5 leading-7 text-slate-700">{c.matchText}</p></div>
   <div className="rounded-[32px] bg-[#0D2239] p-8 text-white sm:p-10"><div aria-hidden="true" className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 text-2xl text-[#73CBFF]">◎</div><h2 className="text-3xl font-bold tracking-tight">{c.privacyTitle}</h2><p className="mt-5 leading-7 text-slate-300">{c.privacyText}</p></div>
  </section>
  <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 lg:grid-cols-[0.7fr_1fr] lg:px-12"><h2 className="text-3xl font-bold tracking-tight">{c.faqTitle}</h2><div className="divide-y divide-slate-200 border-y border-slate-200">{c.faq.map(([q,a])=><details key={q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold">{q}<span aria-hidden="true" className="text-2xl font-normal text-blue-700 group-open:rotate-45">+</span></summary><p className="mt-4 text-sm leading-7 text-slate-600">{a}</p></details>)}</div></section>
  <section className="bg-[#07111F] px-6 py-16 text-center text-white sm:py-20">{companyLaunchOfferActive&&<p className="text-sm font-semibold text-[#73CBFF]">{c.offer}</p>}<h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">{c.finalTitle}</h2><Link href="/registo?tipo=empresa" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-[#07111F] hover:bg-[#73CBFF]">{action}<span aria-hidden="true" className="ml-3">↗</span></Link><p className="mt-6 text-sm text-slate-300"><a href="mailto:info@creativalcance.com" className="underline underline-offset-4">{t('Contacta-nos')}</a></p></section>
 </main>;
}
