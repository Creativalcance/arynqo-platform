import { SITE_URL } from "./seo";
import { localizedPath, type Locale } from "./i18n/config";
import countryCodes from "./data/countries.json";
type PublicJob = {id:string;title:string;description:string|null;created_at:string;location:string|null;country_code?:string|null;content_locale?:string|null;expires_at?:string|null;work_model:string|null;work_mode:string|null;company_profiles:{company_name:string}|{company_name:string}[]|null};
// Only infer the country for unambiguous, explicitly recognised Portuguese locations.
const portugueseLocations = new Set(["coimbra","aveiro","porto","lisboa","mealhada","aljustrel","faro","portugal"]);
export function jobPostingSchema(job:PublicJob, locale:Locale="pt"){
 const company=Array.isArray(job.company_profiles)?job.company_profiles[0]:job.company_profiles;
 const model=job.work_model||job.work_mode;
 const location=job.location?.trim();
 const country=job.country_code ? (countryCodes.includes(job.country_code) ? job.country_code : null) : location && portugueseLocations.has(location.toLowerCase()) ? "PT" : null;
 if(!company?.company_name || !job.description || !job.created_at || !location || /^(remote|remoto)$/i.test(model||"") || !country)return null;
 return {"@context":"https://schema.org","@type":"JobPosting",title:job.title,description:job.description,datePosted:job.created_at,...(job.expires_at?{validThrough:job.expires_at}:{}),...(job.content_locale?{inLanguage:job.content_locale}:{}),hiringOrganization:{"@type":"Organization",name:company.company_name},jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressLocality:location,addressCountry:country}},url:`${SITE_URL}${localizedPath(`/vagas/${job.id}`,locale)}`};
}
export function serializeStructuredData(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c");}
