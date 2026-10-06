import { optionKey } from '@/lib/profile-options';
export const EXTERNAL_MATCH_VERSION='external-evidence-v3-context';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/\s+/g,' ').trim();
// Keep source offsets so every mention can be traced back to the original advert.
function indexedText(source:string){
 let text='',position=0;const offsets:number[]=[];
 for(const character of source){
  const value=character.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLocaleLowerCase();
  for(let i=0;i<value.length;i++){
   const unit=/\s/.test(value[i])?' ':value[i];
   if(unit===' '&&text.endsWith(' '))continue;
   text+=unit;offsets.push(position);
  }
  position+=character.length;
 }
 return {text,offsets};
}
// Recognize explicit "not required" formulations, not general negation or sentiment.
// Unknown wording remains a textual mention; it never produces a compatibility score.
function explicitlyOptional(text:string,start:number,end:number){
 const before=text.slice(Math.max(0,start-90),start),after=text.slice(end,end+90);
 return /(?:\bno (?:prior )?(?:experience (?:in|with)|knowledge of)|\bsem (?:experiencia|conhecimentos)(?: (?:em|de))?|\bsans (?:experience|connaissances)(?: (?:en|de))?|\bsin (?:experiencia|conocimientos)(?: (?:en|de))?|\bsenza (?:esperienza|conoscenza)(?: (?:in|di))?|\bkeine (?:erfahrung|kenntnisse)(?: (?:in|mit))?)\s*$/u.test(before)
  || /^(?:\s+|-kenntnisse\s+)(?:(?:is|are|ist|sind|e|sao|es|son|est|sont)\s+)?(?:not (?:required|necessary|essential)|nao (?:e |sao )?(?:necessari[oa]s?|obrigatori[oa]s?)|no (?:es |son )?(?:necesari[oa]s?|obligatori[oa]s?)|non (?:e |sono )?(?:richiest[oaie]|necessari[oaie])|(?:n'est |ne sont )?pas (?:requis[e]?s?|necessaires?)|nicht (?:erforderlich|notwendig))\b/u.test(after)
  || (/\bno\s*$/u.test(before)&&/^\s+(?:required|necessary|needed)\b/u.test(after));
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
 const mentions:{skill:string;term:string;excerpt:string}[]=[],notRequired:typeof mentions=[];
 for(const variants of groups.values()){
  let positive:typeof mentions[number]|undefined,optional:typeof mentions[number]|undefined;
  for(const term of variants){
   const value=normalize(term);if(value.length<2||value.length>150)continue;
   const escaped=value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const matches=text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}+#])${escaped}(?![\\p{L}\\p{N}+#])`,'gu'));
   for(const match of matches){
    const start=Math.max(0,indexed.offsets[match.index]-80),end=Math.min(source.length,indexed.offsets[match.index+match[0].length-1]+81);
    const excerpt=(start?'…':'')+source.slice(start,end).trim()+(end<source.length?'…':'');
    const first=[...variants][0],evidence={skill:first,term,excerpt};
    if(explicitlyOptional(text,match.index,match.index+match[0].length)){optional=evidence;continue;}
    positive=evidence;
   }
  }
  // Explicit non-requirement overrides an incidental mention elsewhere (including the title).
  if(optional)notRequired.push(optional);else if(positive)mentions.push(positive);
 }
 return {version:EXTERNAL_MATCH_VERSION,status:'insufficient_information' as const,score:null,
  evidenceStatus:groups.size===0?'profile_incomplete':mentions.length?'evidence_found':'no_explicit_matches',
  mentions:mentions.slice(0,50),notRequired:notRequired.slice(0,50),hasProfileSkills:groups.size>0};
}
