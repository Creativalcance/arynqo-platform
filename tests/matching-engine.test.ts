import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateMatch, type StudentProfile, type Job } from "../lib/matching-engine";
const candidate = (changes: Partial<StudentProfile> = {}) => ({
 id:"candidate",user_id:"user",role_family:"tecnologia",role_title:"Programador frontend",headline:"Programador frontend",skills_normalized:["React","TypeScript"],tools_normalized:[],soft_skills_normalized:[],
 seniority:"senior",location:"Porto",regions:["Porto"],work_model:"remoto",salary_min:2000,languages:"Inglês",academic_education:"Licenciatura",professional_experience:"",preferred_opportunity_type:"full-time",talent_type:"professional", ...changes
} as StudentProfile);
const vacancy = (changes: Partial<Job> = {}) => ({
 id:"job",title:"Programador frontend",role_title:"Programador frontend",role_family:"tecnologia",description:"",required_skills:["React","TypeScript"],preferred_skills:[],specializations:[],seniority:"senior",location:"Porto",regions:["Porto"],work_model:"remoto",salary_max:2500,languages:["English"],education_requirements:"Licenciatura",experience_requirements:"",opportunity_type:"full-time", ...changes
} as Job);

test("evidenced suitable candidate can be recommended",()=>{
 const r=calculateMatch(candidate(),vacancy());assert.equal(r.matchCategory,"recommended");assert.equal(r.matchScore,100);assert.equal(r.missingSkills.length,0);assert.match(r.aiReason,/Não é uma probabilidade/);
});
test("missing profile data earns no default points or automatic recommendation",()=>{
 const r=calculateMatch({id:"empty",user_id:"user"} as StudentProfile,vacancy());assert.equal(r.matchScore,0);assert.notEqual(r.matchCategory,"recommended");assert.match(r.aiReason,/Cobertura de informação: 0/);
});
test("no mandatory requirements means human review rather than recommendation",()=>{
 const r=calculateMatch(candidate(),vacancy({required_skills:[]}));assert.notEqual(r.matchCategory,"recommended");assert.ok(r.matchScore<=64);
});
test("all mandatory skills missing cannot be a possible match",()=>{
 const r=calculateMatch(candidate({skills_normalized:["Java"]}),vacancy());assert.ok(r.matchScore<=49);assert.equal(r.missingSkills.length,2);
});
test("partial mandatory evidence cannot be automatically recommended",()=>{
 const r=calculateMatch(candidate({skills_normalized:["React"]}),vacancy());assert.equal(r.skillsScore,50);assert.ok(r.matchScore<=64);assert.deepEqual(r.missingSkills,["typescript"]);
});
test("skills use bounded phrases rather than misleading substrings",()=>{
 for(const [have,want] of [["CNC","C"],["JavaScript","Java"],["C++","C#"],["RH","HTML"]]){
  const r=calculateMatch(candidate({skills_normalized:[have]}),vacancy({required_skills:[want]}));assert.equal(r.skillsScore,0,`${have} != ${want}`);
 }
});
test("explicit equivalent skill names are recognized",()=>{
 const r=calculateMatch(candidate({skills_normalized:["JS","React.js"]}),vacancy({required_skills:["JavaScript","React"]}));assert.equal(r.skillsScore,100);
});
test("career intentions and AI keywords do not prove skills",()=>{
 const r=calculateMatch(candidate({skills_normalized:[],career_goals:"Aprender React e TypeScript",ai_match_keywords:["React","TypeScript"],professional_experience:"Gostaria de aprender React"}),vacancy());assert.equal(r.skillsScore,0);assert.notEqual(r.matchCategory,"recommended");
});
test("unknown professional family is reviewable rather than automatically excluded",()=>{
 const r=calculateMatch(candidate({role_family:"",role_title:"Especialista",headline:"Especialista",desired_area:""}),vacancy());assert.equal(r.isRelevant,true);assert.ok(r.matchScore>0);assert.notEqual(r.matchCategory,"recommended");
});
test("unrelated professional profile with no required skill is not relevant",()=>{
 const r=calculateMatch(candidate({role_family:"marketing",role_title:"Gestor de marketing",headline:"Marketing",skills_normalized:["SEO"]}),vacancy());assert.equal(r.isRelevant,false);assert.equal(r.matchScore,0);
});
test("missing required language needs confirmation",()=>{
 const r=calculateMatch(candidate({languages:"Português"}),vacancy());assert.notEqual(r.matchCategory,"recommended");assert.ok(r.gaps.some(g=>g.includes("idiomas exigidos")));
});
test("salary punctuation is handled and ambiguous periods are unmeasured",()=>{
 const monthly=calculateMatch(candidate({salary_min:null,expected_salary:"2.000 € / mês"}),vacancy({salary_max:null,salary_range:"1.800–2.500 €/mês"}));assert.equal(monthly.salaryScore,100);
 const annual=calculateMatch(candidate({salary_min:null,expected_salary:"30.000 € anual"}),vacancy());assert.equal(annual.salaryScore,0);assert.ok(annual.gaps.some(g=>g.includes("salário")));
});
test("sparse matching evidence cannot look like a fully supported recommendation",()=>{
 const r=calculateMatch({role_title:"Programador frontend",role_family:"tecnologia",skills_normalized:["React","TypeScript"]} as StudentProfile,vacancy());assert.ok(r.matchScore<=64);assert.match(r.aiReason,/Cobertura de informação: 60/);
});
test("all subsets of optional data produce bounded deterministic results",()=>{
 const fields=["seniority","location","regions","work_model","salary_min","languages","academic_education","preferred_opportunity_type","talent_type"] as const;
 for(let mask=0;mask<(1<<fields.length);mask++){
  const c=candidate();fields.forEach((f,i)=>{if(mask&(1<<i)) (c as unknown as Record<string,unknown>)[f]=null;});
  const r=calculateMatch(c,vacancy());assert.ok(r.matchScore>=0&&r.matchScore<=100);assert.deepEqual(r,calculateMatch(c,vacancy()));
 }
});

test("manually declared profile skills are available to matching",()=>{
 const r=calculateMatch(candidate({skills_normalized:[],student_skills:[{skills:{name:"React"}},{skills:[{name:"TypeScript"}]}]}),vacancy());
 assert.equal(r.skillsScore,100);assert.equal(r.matchCategory,"recommended");
});

test("exact spelling and marketing strategy variants match in both directions",()=>{
 for(const [have,want] of [["Marketing estratégico","Strategia de marketing"],["Estratégia de marketing","Marketing estratégico"],["Controlo de qualidade","Controle de qualidade"]]){
  const r=calculateMatch(candidate({skills_normalized:[have]}),vacancy({required_skills:[want]}));assert.equal(r.skillsScore,100,`${have} = ${want}`);
 }
});
test("related responsibilities and qualifications are not interchangeable",()=>{
 for(const [have,want] of [["Marketing estratégico","Planeamento estratégico"],["Gestão de campanhas","Desenvolvimento de campanhas"],["Análise de mercado","Análise de dados"],["Gestão de orçamento","Orçamentação"],["Carta de condução B","Carta de condução CE"]]){
  const r=calculateMatch(candidate({skills_normalized:[have]}),vacancy({required_skills:[want]}));assert.equal(r.skillsScore,0,`${have} != ${want}`);
 }
});

test("complete synthetic profiles distinguish suitable roles from missing evidence across occupations",()=>{
 const cases=[
  {family:"marketing",title:"Diretor de Marketing",skills:["Marketing estratégico","Marketing digital"],missing:"Orçamentação"},
  {family:"financeiro",title:"Diretor Financeiro",skills:["Análise financeira","Controlo orçamental"],missing:"Fiscalidade"},
  {family:"educacao",title:"Professor Ensino Básico",skills:["Planeamento pedagógico","Gestão de turma"],missing:"Licenciatura em Ensino Básico"},
  {family:"transportes",title:"Motorista de Pesados",skills:["Carta de condução CE","Segurança rodoviária"],missing:"Experiência em transporte internacional"},
 ];
 for(const item of cases){
  const c=candidate({role_family:item.family,role_title:item.title,headline:item.title,skills_normalized:item.skills});
  const j=vacancy({role_family:item.family,role_title:item.title,title:item.title,required_skills:item.skills});
  const aligned=calculateMatch(c,j);
  assert.equal(aligned.matchCategory,"recommended",item.title);
  assert.equal(aligned.skillsScore,100,item.title);
  const incomplete=calculateMatch(c,{...j,required_skills:[...item.skills,item.missing]});
  assert.notEqual(incomplete.matchCategory,"recommended",`${item.title}: missing evidence must require review`);
  assert.equal(incomplete.missingSkills.length,1,item.title);
 }
});

test("job language level and spoken channel affect recommendation", () => {
 const job = vacancy({languages:["Falado: English (C1)"]});
 assert.equal(calculateMatch(candidate({languages:"",spoken_languages:"Inglês (C2)"}),job).matchCategory,"recommended");
 assert.notEqual(calculateMatch(candidate({languages:"",spoken_languages:"Inglês (B2)"}),job).matchCategory,"recommended");
 assert.notEqual(calculateMatch(candidate({languages:"",written_languages:"Inglês (C2)"}),job).matchCategory,"recommended");
});

test("only explicitly reviewed skill equivalences change matching", () => {
 const student=candidate({skills_normalized:["Competência técnica A","TypeScript"]});
 const job=vacancy();
 assert.equal(calculateMatch(student,job,new Map([["competencia tecnica a","React"]])).skillsScore,100);
 assert.notEqual(calculateMatch(student,job).skillsScore,100);
 assert.notEqual(calculateMatch(candidate({skills_normalized:["Gestão de pessoas"]}),vacancy({required_skills:["Gestão de projetos"]})).skillsScore,100);
});
