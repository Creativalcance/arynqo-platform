import { SITE_URL } from "./seo";
type PublicJob = {id:string;title:string;description:string|null;created_at:string;location:string|null;work_model:string|null;work_mode:string|null;company_profiles:{company_name:string}|{company_name:string}[]|null};
// Only infer the country for unambiguous, explicitly recognised Portuguese locations.
const portugueseLocations = new Set(["coimbra","aveiro","porto","lisboa","mealhada","aljustrel","faro","portugal"]);
export function jobPostingSchema(job:PublicJob){
 const company=Array.isArray(job.company_profiles)?job.company_profiles[0]:job.company_profiles;
 const model=job.work_model||job.work_mode;
 const location=job.location?.trim();
 if(!company?.company_name || !job.description || !job.created_at || !location || model==="remote" || !portugueseLocations.has(location.toLowerCase()))return null;
 return {"@context":"https://schema.org","@type":"JobPosting",title:job.title,description:job.description,datePosted:job.created_at,hiringOrganization:{"@type":"Organization",name:company.company_name},jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressLocality:location,addressCountry:"PT"}},url:`${SITE_URL}/vagas/${job.id}`};
}
export function serializeStructuredData(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c");}
