// Only professional fields explicitly reviewed by the candidate can be applied.
// Account identity, visibility, salary preferences, scores and CV are excluded.
export const linkedinSections = {
  headline: 'Título profissional', bio: 'Sobre mim',
  professional_experience_items: 'Experiência profissional',
  academic_education_items: 'Formação académica',
  professional_training_items: 'Formação profissional',
  skills: 'Competências técnicas', languages: 'Idiomas', tools: 'Ferramentas', soft_skills: 'Competências comportamentais',
} as const;
export type LinkedInSection = keyof typeof linkedinSections;
type Experience = { id: string; role: string; company: string; start_date: string; end_date: string; description: string };
type Education = { id: string; degree: string; institution: string; start_date: string; end_date: string; description: string };
type Training = { id: string; title: string; entity: string; start_date: string; end_date: string; description: string };
export type LinkedInDraft = Partial<{
 headline: string; bio: string; professional_experience_items: Experience[];
 academic_education_items: Education[]; professional_training_items: Training[];
 skills: string[]; languages: string; tools: string; soft_skills: string;
}>;
const text = (v: unknown, max = 6000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
export function normalizeLinkedInDraft(raw: unknown): LinkedInDraft {
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
 const value = raw as Record<string,unknown>, out: Record<string,unknown> = {};
 for (const key of ['headline','bio','languages','tools','soft_skills']) {
  const content=text(value[key],key==='headline'?240:6000);if(content) out[key]=content;
 }
 if(Array.isArray(value.skills)){
  const unique = new Map<string, string>();
  for (const raw of value.skills) { const skill = text(raw, 100); if (skill && !unique.has(skill.toLowerCase())) unique.set(skill.toLowerCase(), skill); }
  const skills = Array.from(unique.values()).slice(0,50);
  if(skills.length)out.skills=skills;
 }
 for(const [key,fields] of Object.entries({professional_experience_items:['role','company'],academic_education_items:['degree','institution'],professional_training_items:['title','entity']})){
  if(!Array.isArray(value[key]))continue;
  const items=(value[key] as unknown[]).slice(0,40).filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v))
   .map((v,i)=>Object.fromEntries([['id',`linkedin-${key}-${i}`],...[...fields,'start_date','end_date','description'].map(f=>[f,text(v[f],f==='description'?6000:250)])]))
   .filter(v=>fields.some(f=>v[f]));
  if(items.length)out[key]=items;
 }
 return out as LinkedInDraft;
}
export function selectLinkedInDraft(raw: unknown, selected: string[]): LinkedInDraft {
 const draft=normalizeLinkedInDraft(raw);
 return Object.fromEntries(Object.entries(draft).filter(([key])=>selected.includes(key))) as LinkedInDraft;
}
export function linkedinPreview(value: unknown): string {
 if(typeof value==='string')return value;
 if(!Array.isArray(value))return '';
 return value.map(item=>typeof item==='string'?item:Object.entries(item).filter(([key,v])=>key!=='id'&&v).map(([,v])=>String(v)).join(' · ')).join('\n\n');
}
export function validateLinkedInText(value: unknown): value is string {
 return typeof value==='string' && value.trim().length>=80 && value.length<=40000;
}
