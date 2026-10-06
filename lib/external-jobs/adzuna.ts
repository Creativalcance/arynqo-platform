// Country enum verified against https://developer.adzuna.com/swagger/spec/test2.json.
export const ADZUNA_COUNTRIES = ['gb','us','at','au','be','br','ca','ch','de','es','fr','in','it','mx','nl','nz','pl','sg','za'] as const;
export const ADZUNA_ATTRIBUTION_URL = 'https://www.adzuna.co.uk';
const domains = ['adzuna.co.uk','adzuna.com','adzuna.at','adzuna.com.au','adzuna.be','adzuna.com.br','adzuna.ca','adzuna.ch','adzuna.de','adzuna.es','adzuna.fr','adzuna.in','adzuna.it','adzuna.com.mx','adzuna.nl','adzuna.co.nz','adzuna.pl','adzuna.sg','adzuna.co.za'];
export function safeAdzunaURL(value: unknown): string | null {
 if(typeof value!=='string')return null;
 try { const url=new URL(value); if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!domains.some(d=>url.hostname===d||url.hostname.endsWith('.'+d)))return null;url.protocol='https:';url.hash='';return url.toString(); } catch { return null; }
}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const plain=(v:unknown,max:number)=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim().slice(0,max):'';
export type ExternalAdvert = { provider_id:string; country_code:string; title:string; company_name:string; description:string; location:string; area:string; contract_type:string|null; source_url:string; created_at:string };
export function normalizeAdvert(raw:unknown,country:string,now=new Date()):ExternalAdvert|null {
 const v=object(raw),title=plain(v.title,300),id=typeof v.id==='number'?String(v.id):plain(v.id,100),source=safeAdzunaURL(v.redirect_url),created=new Date(typeof v.created==='string'?v.created:'');
 if(!ADZUNA_COUNTRIES.some(c=>c===country)||!title||!id||!source||!Number.isFinite(created.getTime())||created.getTime()>now.getTime()+300000||created.getTime()<=now.getTime()-30*86400000)return null;
 return {provider_id:id,country_code:country.toUpperCase(),title,company_name:plain(object(v.company).display_name,250),description:plain(v.description,5000),location:plain(object(v.location).display_name,300),area:plain(object(v.category).label,150),contract_type:v.contract_type==='permanent'?'Permanente':v.contract_type==='contract'?'Contrato':null,source_url:source,created_at:created.toISOString()};
}
export function validateSourceSettings(raw:unknown){
 const v=object(raw);
 if(typeof v.enabled!=='boolean'||typeof v.terms_confirmed!=='boolean'||!Array.isArray(v.countries)||v.countries.length>3||!v.countries.every(c=>typeof c==='string'&&ADZUNA_COUNTRIES.some(allowed=>allowed===c)))return null;
 const countries=[...new Set(v.countries as string[])];
 if(v.enabled&&(!v.terms_confirmed||!countries.length))return null;
 return {enabled:v.enabled,terms_confirmed:v.terms_confirmed,countries};
}
export async function fetchCountry(country:string,credentials:{id:string;key:string},fetcher:typeof fetch=fetch,now=new Date()){
 if(!ADZUNA_COUNTRIES.some(c=>c===country))throw new Error('Unsupported country');
 const adverts=new Map<string,ExternalAdvert>();let rejected=0;
 for(let page=1;page<=2;page++){
  const url=new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.search=new URLSearchParams({app_id:credentials.id,app_key:credentials.key,results_per_page:'50',sort_by:'date',max_days_old:'30','content-type':'application/json'}).toString();
  const response=await fetcher(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Provider unavailable');
  const raw=await response.json();
  if(!raw||!Array.isArray(raw.results)||raw.results.length>50)throw new Error('Invalid provider response');
  for(const result of raw.results){const advert=normalizeAdvert(result,country,now);if(advert)adverts.set(advert.provider_id,advert);else rejected++;}
  if(raw.results.length<50)break;
 }
 return {rows:[...adverts.values()],rejected};
}
