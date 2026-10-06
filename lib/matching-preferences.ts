// Stable codes are independent from display language. No free-text inference.
export const PROFESSIONAL_AREAS = [
  "Todas",
  "Administração e Gestão",
  "Agricultura, Floresta e Ambiente",
  "Arquitetura e Design de Interiores",
  "Artes, Cultura e Indústrias Criativas",
  "Atendimento ao Cliente",
  "Automóvel e Mobilidade",
  "Banca, Seguros e Serviços Financeiros",
  "Comercial e Vendas",
  "Compras e Procurement",
  "Comunicação, Marketing e Publicidade",
  "Construção Civil e Obras Públicas",
  "Consultoria",
  "Contabilidade, Auditoria e Fiscalidade",
  "Design, UX e Produto Digital",
  "Educação, Formação e Ensino",
  "Engenharia Civil",
  "Engenharia Eletrotécnica",
  "Engenharia Industrial",
  "Engenharia Informática",
  "Engenharia Mecânica",
  "Engenharia Química",
  "Farmacêutica e Biotecnologia",
  "Hotelaria, Turismo e Restauração",
  "Imobiliário",
  "Indústria e Produção",
  "Jurídico",
  "Logística, Transportes e Distribuição",
  "Manutenção e Assistência Técnica",
  "Operações",
  "Qualidade, Segurança e Ambiente",
  "Recursos Humanos",
  "Retalho e Grande Distribuição",
  "Saúde",
  "Tecnologia, Software e Dados",
  "Telecomunicações",
];
export const SENIORITIES = {entry:'Sem experiência',junior:'Júnior',mid:'Pleno',senior:'Sénior',specialist:'Especialista',lead:'Coordenação',manager:'Gestão',director:'Direção'} as const;
export const WORK_MODELS = {onsite:'Presencial',hybrid:'Híbrido',remote:'Remoto'} as const;
export type MatchingPreferences = {profession:string;area:string;levels:string[];models:string[];skills:string[];confirmed:boolean};
export const emptyMatchingPreferences = ():MatchingPreferences => ({profession:'',area:'',levels:[],models:[],skills:[],confirmed:false});
export function validPreferences(value:unknown,kind:'candidate'|'job',occupationExists:(id:string)=>boolean=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)):value is MatchingPreferences {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as MatchingPreferences;
 if(Object.keys(v).sort().join(',')!=='area,confirmed,levels,models,profession,skills')return false;
 if(typeof v.confirmed!=='boolean'||typeof v.profession!=='string'||(v.profession!==''&&!occupationExists(v.profession)))return false;
 if(typeof v.area!=='string'||(v.area!==''&&!PROFESSIONAL_AREAS.includes(v.area)))return false;
 const list=(a:unknown,max:number,predicate:(s:string)=>boolean):a is string[]=>Array.isArray(a)&&a.length<=max&&a.every(x=>typeof x==='string'&&predicate(x))&&new Set(a).size===a.length;
 if(!list(v.levels,kind==='candidate'?1:8,s=>Object.hasOwn(SENIORITIES,s))||!list(v.models,3,s=>Object.hasOwn(WORK_MODELS,s))||!list(v.skills,50,s=>s===s.trim()&&s.length>0&&s.length<=150))return false;
 return !v.confirmed||completePreferences(v);
}
export function completePreferences(v:MatchingPreferences){return !!(v.profession&&v.area&&v.levels.length&&v.models.length&&v.skills.length);}

// Opportunity type is independent of on-site/hybrid/remote work arrangements.
export const OPPORTUNITY_TYPES = ['Estágio Curricular','Estágio Profissional','Trainee','Part-time','Full-time','Trabalho temporário','Freelancer','Prestação de Serviços','Contrato a Termo','Contrato Sem Termo','Projeto','Bolsa de Investigação','Programa Graduados','Voluntariado'];
export function areasCompatible(candidate:string,job:string){return !!candidate&&!!job&&(candidate==='Todas'||job==='Todas'||candidate===job);}
