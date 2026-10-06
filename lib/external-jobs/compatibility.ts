import { optionKey } from '@/lib/profile-options';
export const EXTERNAL_MATCH_VERSION='external-evidence-v2-translated';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
// Keep source offsets so every mention can be traced back to the original advert.
function indexedText(source:string){
 let text='',position=0;const offsets:number[]=[];
 for(const character of source){
  const value=character.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  for(let i=0;i<value.length;i++){
   const unit=/\s/.test(value[i])?' ':value[i];
   if(unit===' '&&text.endsWith(' '))continue;
   text+=unit;offsets.push(position);
  }
  position+=character.length;
 }
 return {text,offsets};
}
// Reviewed aliases only. A mention is evidence of text overlap, never proof of a mandatory requirement.
export function externalCompatibility(skills:string[],title:string,excerpt:string,aliases:ReadonlyMap<string,string>=new Map()){
 const source=`${title}\n${excerpt}`.slice(0,5500),indexed=indexedText(source),text=indexed.text;
 const groups=new Map<string,Set<string>>();
 for(const skill of skills){
  if(!skill.trim())continue;
  const canonical=aliases.get(optionKey(skill))||skill;
  const key=normalize(canonical);const variants=groups.get(key)||new Set<string>();
  variants.add(skill);variants.add(canonical);groups.set(key,variants);
 }
 for(const [alias,canonical] of aliases){const variants=groups.get(normalize(canonical));if(variants)variants.add(alias);}
 const mentions:{skill:string;term:string;excerpt:string}[]=[];
 for(const variants of groups.values()){
  for(const term of variants){
   const value=normalize(term);if(value.length<2||value.length>150)continue;
   const escaped=value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const match=new RegExp(`(?<![\\p{L}\\p{N}+#])${escaped}(?![\\p{L}\\p{N}+#])`,'u').exec(text);
   if(match){
    const start=Math.max(0,indexed.offsets[match.index]-80),end=Math.min(source.length,indexed.offsets[match.index+match[0].length-1]+81);
    const excerpt=(start?'…':'')+source.slice(start,end).trim()+(end<source.length?'…':'');
    const first=[...variants][0];mentions.push({skill:first,term,excerpt});break;
   }
  }
 }
 return {version:EXTERNAL_MATCH_VERSION,status:'insufficient_information' as const,score:null,mentions:mentions.slice(0,50),hasProfileSkills:groups.size>0};
}
