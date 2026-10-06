import { externalCompatibility } from './compatibility';
import { optionKey } from '../profile-options';

export type ExternalCandidate = {
 role_title?: string | null; main_role?: string | null;
 preferred_regions?: string | null; regions?: string[] | null;
 preferred_opportunity_type?: string | null;
 languages?: string | null; spoken_languages?: string | null; written_languages?: string | null;
 work_model?: string | null; expected_salary?: string | null;
 seniority?: string | null; academic_education?: string | null; professional_experience?: string | null;
};
export type ExternalOffer = {title:string;description:string;location?:string|null;contract_type?:string|null};
type Criterion = {key:string;state:'aligned'|'review'|'unknown'|'missing_profile';candidate:string;offer:string};
const clean=(value:string|null|undefined)=>(value||'').trim().slice(0,500);
const split=(value:string|null|undefined)=>clean(value).split(/[,;\n|]/).map(optionKey).filter(Boolean);
const contracts:Record<string,string>={permanente:'permanent',permanent:'permanent',efetivo:'permanent','sem termo':'permanent',unbefristet:'permanent',indeterminato:'permanent',cdi:'permanent',indefinido:'permanent',contrato:'contract',contract:'contract'};

/** Comparisons are inspectable evidence, not an inferred list of job requirements. */
export function assessExternalJob(skills:string[],profile:ExternalCandidate,job:ExternalOffer,aliases:ReadonlyMap<string,string>=new Map()){
 const evidence=externalCompatibility(skills,job.title,job.description,aliases);
 const role=clean(profile.role_title||profile.main_role);
 const roleEvidence=role.length>=4?externalCompatibility([role],job.title,''):null;
 const preferred=[...(profile.regions||[]),...clean(profile.preferred_regions).split(/[,;\n|]/)].map(v=>v.trim()).filter(Boolean);
 const offeredRegions=split(job.location);
 // Residence, nationality and provider country are not willingness to relocate.
 const locationAligned=preferred.some(region=>offeredRegions.includes(optionKey(region)));
 const contract=clean(profile.preferred_opportunity_type),offeredContract=clean(job.contract_type);
 const contractAligned=!!contracts[optionKey(contract)]&&contracts[optionKey(contract)]===contracts[optionKey(offeredContract)];
 const criteria:Criterion[]=[
  {key:'Função',candidate:role,offer:job.title,state:!role?'missing_profile':roleEvidence?.mentions.length?'aligned':'review'},
  {key:'Localização',candidate:preferred.join(', '),offer:clean(job.location),state:!job.location?'unknown':!preferred.length?'missing_profile':locationAligned?'aligned':'review'},
  {key:'Tipo de contrato',candidate:contract,offer:offeredContract,state:!offeredContract?'unknown':!contract?'missing_profile':contractAligned?'aligned':'review'},
  {key:'Modelo de trabalho',candidate:clean(profile.work_model),offer:'',state:'unknown'},
  {key:'Salário',candidate:clean(profile.expected_salary),offer:'',state:'unknown'},
  {key:'Idiomas',candidate:[profile.languages,profile.spoken_languages,profile.written_languages].map(clean).filter(Boolean).join('; '),offer:'',state:'unknown'},
  {key:'Senioridade',candidate:clean(profile.seniority),offer:'',state:'unknown'},
  {key:'Formação',candidate:clean(profile.academic_education),offer:'',state:'unknown'},
  {key:'Experiência',candidate:clean(profile.professional_experience),offer:'',state:'unknown'},
 ];
 return {...evidence,criteria};
}
