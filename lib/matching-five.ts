import { validPreferences, type MatchingPreferences } from './matching-preferences';
import { optionKey } from './profile-options';
export const FIVE_FIELD_VERSION='five-fields-v1-shadow';
export function calculateFiveFieldMatch(candidate:MatchingPreferences|null,job:MatchingPreferences|null,aliases:ReadonlyMap<string,string>=new Map()) {
 if(!validPreferences(candidate,'candidate')||!validPreferences(job,'job')||!candidate.confirmed||!job.confirmed)return {version:FIVE_FIELD_VERSION,status:'incomplete' as const,score:null,contributions:null};
 const canonical=(s:string)=>optionKey(aliases.get(optionKey(s))||s);
 const candidateSkills=new Set(candidate.skills.map(canonical)),required=[...new Set(job.skills.map(canonical))];
 const matched=required.filter(s=>candidateSkills.has(s));
 const contributions={profession:candidate.profession===job.profession?35:0,skills:35*matched.length/required.length,seniority:job.levels.includes(candidate.levels[0])?15:0,model:job.models.some(m=>candidate.models.includes(m))?10:0,area:candidate.area===job.area?5:0};
 // No recommendation is inferred: geography, licences and other mandatory conditions
 // remain separately reviewable. Shadow results cannot trigger messages or ranking.
 return {version:FIVE_FIELD_VERSION,status:'evaluated' as const,score:Math.round(Object.values(contributions).reduce((a,b)=>a+b,0)),contributions,matchingSkills:matched,missingSkills:required.filter(s=>!candidateSkills.has(s)),recommendation:'human_review' as const};
}

export function currentFiveFieldResult(result:{candidateRevision?:number;jobRevision?:number}|null,candidateRevision:number,jobRevision:number){return !!result&&result.candidateRevision===candidateRevision&&result.jobRevision===jobRevision;}
