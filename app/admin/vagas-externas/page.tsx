'use client';
import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { LText, useI18n } from '@/lib/i18n/client';
import Link from '@/lib/i18n/link';
import { ADZUNA_COUNTRIES } from '@/lib/external-jobs/adzuna';
type Settings={enabled:boolean;countries:string[];terms_confirmed:boolean};
type Status={countries:{country:string;status:string;error_code:string|null;last_success_at:string|null;next_run_at:string;imported:number}[];settings:Settings;ready:{appId:boolean;appKey:boolean;cron:boolean};available:number;state:{status:string;started_at:string|null;finished_at:string|null;imported:number;rejected:number;failed_countries:string[]}};
const statusLabels:Record<string,string>={never:'Ainda sem sincronizações',running:'Sincronização em curso',success:'Sincronização concluída',partial:'Sincronização parcial',failed:'Falha na sincronização.',cancelled:'Sincronização cancelada'};
export default function ExternalJobsAdmin(){
 const {locale}=useI18n();const [data,setData]=useState<Status|null>(null),[settings,setSettings]=useState<Settings>({enabled:false,countries:[],terms_confirmed:false}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  try{const response=await authenticatedFetch('/api/admin/external-jobs');const value=await response.json();if(!response.ok)throw new Error(value.error);setData(value);setSettings(value.settings);}catch(e){setMessage(e instanceof Error?e.message:'Serviço temporariamente indisponível.');}finally{setLoading(false);}
 },[]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void load();});return()=>{active=false;};},[load]);
 async function submit(action:'settings'|'sync'){
  setBusy(true);setMessage('');
  try{const response=await authenticatedFetch('/api/admin/external-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,settings})});const result=await response.json();if(!response.ok)throw new Error(result.error);
   setMessage(action==='settings'?'Configuração guardada.':result.skipped?({'up_to_date':'Todos os países estão atualizados.','busy':'Existe um lote em curso.','cooldown':'Aguarda um minuto antes de tentar novamente.','daily_budget':'Limite diário de pedidos atingido. A sincronização retoma amanhã.','credentials':'Configura as credenciais no servidor.','disabled':'A fonte está desativada.'}[result.skipped as string]||'Serviço temporariamente indisponível.'):result.failed_countries?.length?'Sincronização parcial. Consulta os países com falha.':'Lote concluído. Os restantes países serão processados automaticamente.');await load();
  }catch(e){setMessage(e instanceof Error?e.message:'Serviço temporariamente indisponível.');}finally{setBusy(false);}
 }
 const ready=!!data?.ready.appId&&!!data?.ready.appKey&&!!data?.ready.cron;
 const region=new Intl.DisplayNames([locale],{type:'region'});
 return <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 text-[#07111F]">
  <Link href="/admin" className="text-sm text-blue-700 underline"><LText text="Administração" /></Link>
  <h1 className="mt-5 text-3xl font-bold"><LText text="Vagas externas" /></h1>
  <p className="mt-3 text-sm leading-6 text-slate-600"><LText text="Importação autorizada de vagas externas, com candidatura no site de origem. Estas ofertas não criam empresas, candidaturas ou matches internos." /></p>
  {message&&<p role="status" className="my-5 rounded-xl border bg-slate-50 p-4 text-sm"><LText text={message} /></p>}
  {loading?<p className="mt-6"><LText text="A carregar..." /></p>:!data?<div className="mt-6 flex gap-5"><button onClick={()=>void load()} className="underline"><LText text="Tentar novamente" /></button><Link href="/admin/login" className="underline"><LText text="Iniciar sessão de administrador" /></Link></div>:<>
   <section className="mt-6 rounded-2xl border bg-slate-50 p-5"><h2 className="font-semibold"><LText text="Estado da integração" /></h2><ul className="mt-3 space-y-2 text-sm">{Object.entries({'Identificador da integração':data.ready.appId,'Chave da integração':data.ready.appKey,'Chave da sincronização automática':data.ready.cron}).map(([name,configured])=><li key={name}><LText text={name} />: <LText text={configured?'Configurado':'Por configurar'} /></li>)}</ul>
    <p className="mt-3 text-xs leading-5"><LText text="As credenciais são configuradas no servidor e nunca são apresentadas neste painel." /></p>
    <p className="mt-3 text-sm"><LText text={statusLabels[data.state.status]||'Ainda sem sincronizações'} /></p>
    {data.state.started_at&&<p className="mt-2 text-xs">{new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(data.state.started_at))}</p>}
    <p className="mt-2 text-sm"><LText text="Ofertas recentes armazenadas" />: {data.available} · <LText text="Importadas na última execução" />: {data.state.imported}</p>
    {!!data.state.failed_countries.length&&<p className="mt-2 text-sm text-red-700"><LText text="Países com falha" />: {data.state.failed_countries.map(c=>region.of(c.toUpperCase())).join(', ')}</p>}
    <ul className="mt-4 space-y-2 text-sm">{data.countries.filter(c=>data.settings.countries.includes(c.country)).map(c=><li key={c.country} className="rounded-lg border p-3">{region.of(c.country.toUpperCase())}: <LText text={c.status==='success'?'Atualizado':c.status==='failed'?'Falha na sincronização.':c.status==='running'?'Sincronização em curso':'Pendente'} /> · {c.imported}{c.error_code&&<span className="block text-red-700"><LText text={({credentials:'Credenciais recusadas pelo serviço de vagas externas.',rate_limit:'Limite de pedidos do serviço de vagas externas atingido.',timeout:'O serviço de vagas externas não respondeu a tempo.',provider:'Serviço de vagas externas indisponível.',invalid_response:'Resposta do serviço de vagas externas inválida.',old_adverts:'A fonte devolveu apenas anúncios fora do prazo de publicação.',future_adverts:'A fonte devolveu anúncios com datas futuras.',invalid_date:'Os anúncios recebidos têm datas inválidas.',invalid_advert:'Os anúncios recebidos não têm os campos necessários.',unsafe_url:'Os destinos recebidos não passaram na validação de segurança.'} as Record<string,string>)[c.error_code]} /></span>}</li>)}</ul>
   </section>
   <form onSubmit={event=>{event.preventDefault();void submit('settings');}} className="mt-6 space-y-5 rounded-2xl border p-5">
    <fieldset disabled={busy} className="space-y-4"><legend className="font-semibold"><LText text="Países a importar" /></legend><div className="flex gap-4 text-sm"><button type="button" className="underline" onClick={()=>setSettings(s=>({...s,countries:[...ADZUNA_COUNTRIES]}))}><LText text="Selecionar todos" /></button><button type="button" className="underline" onClick={()=>setSettings(s=>({...s,countries:[]}))}><LText text="Limpar seleção" /></button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{ADZUNA_COUNTRIES.map(country=><label key={country} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={settings.countries.includes(country)} onChange={e=>setSettings(s=>({...s,countries:e.target.checked?[...s.countries,country]:s.countries.filter(c=>c!==country)}))} />{region.of(country.toUpperCase())}</label>)}</div></fieldset>
    <p className="text-xs leading-5 text-slate-600"><LText text="Portugal não consta dos países suportados por esta API. A disponibilidade de anúncios depende da fonte." /></p>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy} checked={settings.terms_confirmed} onChange={e=>setSettings(s=>({...s,terms_confirmed:e.target.checked}))} /><LText text="Confirmo que a conta do serviço de vagas externas tem autorização para republicar anúncios na ARYNQO e que foram verificadas as condições de utilização." /></label>
    <a href="https://developer.adzuna.com/docs/terms_of_service" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-blue-700 underline"><LText text="Consultar condições do serviço" /></a>
    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" disabled={busy||(!ready&&!settings.enabled)} checked={settings.enabled} onChange={e=>setSettings(s=>({...s,enabled:e.target.checked}))} /><LText text="Ativar vagas externas" /></label>
    <p className="text-xs leading-5 text-slate-600"><LText text="Atualização diária por país, em lotes a cada cinco minutos, até 100 ofertas por país. Ofertas sem atualização durante 48 horas ou publicadas há 30 dias deixam de aparecer. Pausar a fonte oculta todas as suas ofertas." /></p>
    <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><LText text="Guardar configuração" /></button><button type="button" disabled={busy||!ready||!data.settings.enabled} onClick={()=>void submit('sync')} className="rounded-full border px-5 py-3 text-sm font-semibold disabled:opacity-50"><LText text="Sincronizar agora" /></button></div>
   </form>
  </>}
 </main>;
}
