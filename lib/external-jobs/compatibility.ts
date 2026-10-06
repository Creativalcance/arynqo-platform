import { optionKey } from '@/lib/profile-options';
export const EXTERNAL_MATCH_VERSION='external-evidence-v1';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
// Reviewed aliases only. A mention is evidence of text overlap, never proof of a mandatory requirement.
export function externalCompatibility(skills:string[],title:string,excerpt:string,aliases:ReadonlyMap<string,string>=new Map()){
 const source=`${title}\n${excerpt}`.slice(0,5500),text=normalize(source);
 const groups=new Map<string,Set<string>>();
 for(const skill of skills){
  if(!skill.trim())continue;
  const canonical=aliases.get(optionKey(skill))||skill;
  const key=normalize(canonical);const variants=groups.get(key)||new Set<string>();
  variants.add(skill);variants.add(canonical);groups.set(key,variants);
 }
 for(const [alias,canonical] of aliases){const variants=groups.get(normalize(canonical));if(variants)variants.add(alias);}
 const mentions:{skill:string;term:string}[]=[];
 for(const variants of groups.values()){
  for(const term of variants){
   const value=normalize(term);if(value.length<2||value.length>150)continue;
   const escaped=value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   if(new RegExp(`(?<![\\p{L}\\p{N}+#])${escaped}(?![\\p{L}\\p{N}+#])`,'u').test(text)){
    const first=[...variants][0];mentions.push({skill:aliases.get(optionKey(first))||first,term});break;
   }
  }
 }
 return {version:EXTERNAL_MATCH_VERSION,status:'insufficient_information' as const,score:null,mentions:mentions.slice(0,50),hasProfileSkills:groups.size>0};
}
