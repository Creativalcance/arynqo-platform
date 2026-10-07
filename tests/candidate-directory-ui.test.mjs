import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
const source=readFileSync('app/empresa/talentos/page.tsx','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const candidate={id:'candidate-1',profession:'Engenheiro',headline:null,location:'Coimbra',seniority:'Júnior',work_model:'Híbrido',profiles:null,contact_visibility:'approval_required'};
function render({items=[candidate],jobId='',status=null}={}){
 let state=0;const exports={};
 const values=[{id:'company'},[{id:'job',title:'Vaga de engenharia'}],{query:'',location:'',skill:'',seniority:'',work_model:'',availability:'',jobId,page:1},undefined,items.map(item=>({...item,contact_request_status:status})),items.length,false,'','','',0,0];
 const mockRequire=name=>{
  if(name==='react')return {...React,useEffect:()=>{},useRef:()=>({current:false}),useState:initial=>{const value=values[state++];return [value===undefined?initial:value,()=>{}];}};
  if(name==='@/lib/i18n/client')return {LText:({text})=>text,LElement:({as,...props})=>React.createElement(as,props)};
  if(name==='@/lib/i18n/link')return {default:props=>React.createElement('a',props)};
  if(name==='@/app/components/arynqo/CompanyLaunchOffer')return {default:()=>null};
  if(name==='@/lib/matching-preferences')return {SENIORITIES:{junior:'Júnior'},WORK_MODELS:{remote:'Remoto'}};
  if(name.startsWith('@/'))return {};
  return require(name);
 };
 runInNewContext(compiled,{exports,require:mockRequire});
 return renderToStaticMarkup(React.createElement(exports.default));
}
test('directory displays visible profiles without selecting a job and separates search from contact',()=>{
 const html=render();
 for(const label of ['Profissão ou área','Localização','Competência','Senioridade','Modelo de trabalho','Disponibilidade','Engenheiro','Identidade protegida'])assert.ok(html.includes(label),label);
 assert.match(html,/<option value="" selected="">Escolher uma vaga/);
 assert.match(html,/<button type="button" disabled=""[^>]*>Pedir autorização<\/button>/);
 assert.ok(!html.includes('/empresa/candidatos/candidate-1'));
});
test('contact requires a job and an existing request cannot be sent again',()=>{
 const html=render({jobId:'job'});
 assert.match(html,/<button type="button" class="[^"]*">Pedir autorização<\/button>/);
 const pending=render({jobId:'job',status:'pending'});assert.ok(pending.includes('A aguardar resposta'));assert.ok(!pending.includes('>Pedir autorização</button>'));
 const rejected=render({jobId:'job',status:'rejected'});assert.ok(rejected.includes('recusou este pedido'));
});
test('authorized profiles can be opened without a selected vacancy',()=>{
 const html=render({items:[{...candidate,profiles:{name:'Nome autorizado'}}]});
 assert.ok(html.includes('Nome autorizado'));assert.ok(html.includes('href="/empresa/candidatos/candidate-1"'));
 assert.ok(html.includes('Identidade autorizada'));
});
